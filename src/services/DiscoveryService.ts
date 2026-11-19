/**
 * ZoroBeamShare — Real Network Layer
 *
 * Implements actual UDP broadcast discovery and TCP file transfers using:
 *   - react-native-udp   → UDP socket for beacon broadcasting & listening
 *   - react-native-tcp-socket → TCP server/client for file streaming
 *
 * Protocol (all messages are newline-delimited JSON over TCP):
 *
 *   HANDSHAKE  → { type:'handshake', transferId, device, files, totalBytes }
 *   ACK        ← { type:'ack', transferId, accepted:bool }
 *   CHUNK      → binary file data (raw bytes, streamed)
 *   PROGRESS   ← { type:'progress', transferId, received }
 *   DONE       ← { type:'done', transferId }
 *   ERROR      ← { type:'error', transferId, message }
 */

import {Platform, NativeEventEmitter} from 'react-native';
import UdpSocket from 'react-native-udp';
import TcpSocket from 'react-native-tcp-socket';
import RNFS from 'react-native-fs';
import {NearbyDevice, Transfer, TransferFile, ConnectionMethod} from '../utils/types';
import {generateId, getLocalDeviceType} from '../utils/helpers';

// ── Constants ─────────────────────────────────────────────────────────────────
const BEACON_PORT    = 45399;
const TRANSFER_PORT  = 45400;
const BEACON_INTERVAL_MS  = 2000;
const DEVICE_TIMEOUT_MS   = 8000;
const CHUNK_SIZE          = 64 * 1024;  // 64 KB chunks
const APP_SIGNATURE       = 'ZBS_BEAM';
const PROTOCOL_VERSION    = 1;

// ── Types ─────────────────────────────────────────────────────────────────────
export type DiscoveryEvent =
  | {type: 'device_found';     device: NearbyDevice}
  | {type: 'device_lost';      deviceId: string}
  | {type: 'transfer_request'; transfer: Transfer}
  | {type: 'transfer_progress';transferId: string; transferred: number; speed: number}
  | {type: 'transfer_complete';transferId: string; savePath: string}
  | {type: 'transfer_failed';  transferId: string; error: string}
  | {type: 'clipboard_received';content: string; deviceName: string};

type EventListener = (event: DiscoveryEvent) => void;

interface ActiveSend {
  socket: ReturnType<typeof TcpSocket.createConnection>;
  transferId: string;
  cancelled: boolean;
}

// ── Service class ─────────────────────────────────────────────────────────────
class ZBSNetworkService {
  private listeners  = new Set<EventListener>();
  private devices    = new Map<string, NearbyDevice>();
  private expiry     = new Map<string, ReturnType<typeof setTimeout>>();
  private beaconTimer: ReturnType<typeof setInterval> | null = null;
  private udpSocket: ReturnType<typeof UdpSocket.createSocket> | null = null;
  private tcpServer: ReturnType<typeof TcpSocket.createServer> | null = null;
  private activeSends = new Map<string, ActiveSend>();
  private pendingAccept = new Map<string, (accepted: boolean) => void>();

  private running       = false;
  private localId       = generateId();
  private localName     = 'ZoroBeam Device';
  private savePath      = RNFS.ExternalDirectoryPath + '/ZoroBeamShare';

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async start(deviceName: string, savePath: string): Promise<void> {
    if (this.running) return;
    this.running    = true;
    this.localName  = deviceName;
    this.savePath   = savePath;

    // Ensure save directory exists
    await RNFS.mkdir(this.savePath).catch(() => {});

    await this.startUDP();
    await this.startTCPServer();
    this.startBeacon();
    console.log('[ZBS] Network service started. ID:', this.localId);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.beaconTimer) { clearInterval(this.beaconTimer); this.beaconTimer = null; }
    this.udpSocket?.close(); this.udpSocket = null;
    this.tcpServer?.destroy(); this.tcpServer = null;

    // Cancel all in-progress sends
    this.activeSends.forEach(s => { s.cancelled = true; s.socket.destroy(); });
    this.activeSends.clear();

    this.expiry.forEach(t => clearTimeout(t));
    this.expiry.clear();
    this.devices.clear();
    console.log('[ZBS] Network service stopped');
  }

  // ── Pub/sub ─────────────────────────────────────────────────────────────────

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DiscoveryEvent): void {
    this.listeners.forEach(l => { try { l(event); } catch {} });
  }

  // ── UDP — beacon broadcasting ────────────────────────────────────────────────

  private async startUDP(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = UdpSocket.createSocket({type: 'udp4', reusePort: true});

      sock.on('error', (err: Error) => {
        console.error('[ZBS] UDP error:', err);
        reject(err);
      });

      sock.on('message', (msg: Buffer, rinfo: {address: string; port: number}) => {
        this.handleBeacon(msg.toString('utf8'), rinfo.address);
      });

      sock.bind(BEACON_PORT, () => {
        try {
          sock.setBroadcast(true);
          this.udpSocket = sock;
          console.log('[ZBS] UDP bound on', BEACON_PORT);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private startBeacon(): void {
    const broadcast = () => this.sendBeacon();
    broadcast();
    this.beaconTimer = setInterval(broadcast, BEACON_INTERVAL_MS);
  }

  private sendBeacon(): void {
    if (!this.udpSocket || !this.running) return;
    const payload = JSON.stringify({
      sig:        APP_SIGNATURE,
      ver:        PROTOCOL_VERSION,
      id:         this.localId,
      name:       this.localName,
      deviceType: getLocalDeviceType(),
      platform:   Platform.OS,
      port:       TRANSFER_PORT,
      ts:         Date.now(),
    });

    const buf = Buffer.from(payload, 'utf8');

    this.udpSocket.send(buf, 0, buf.length, BEACON_PORT, '255.255.255.255',
      (err: Error | null) => { if (err) console.warn('[ZBS] Beacon send error:', err); },
    );
  }

  private handleBeacon(raw: string, fromIP: string): void {
    try {
      const data = JSON.parse(raw);
      if (data.sig !== APP_SIGNATURE) return;
      if (data.id  === this.localId)  return; // ignore self

      const device: NearbyDevice = {
        id:               data.id,
        name:             data.name,
        deviceType:       data.deviceType ?? 'unknown',
        platform:         data.platform   ?? 'unknown',
        connectionMethod: 'wifi_lan' as ConnectionMethod,
        ipAddress:        fromIP,
        port:             data.port ?? TRANSFER_PORT,
        isAvailable:      true,
        discoveredAt:     Date.now(),
      };

      const isNew = !this.devices.has(device.id);
      this.devices.set(device.id, device);

      // Reset expiry
      const prev = this.expiry.get(device.id);
      if (prev) clearTimeout(prev);
      this.expiry.set(device.id, setTimeout(() => {
        this.devices.delete(device.id);
        this.expiry.delete(device.id);
        this.emit({type: 'device_lost', deviceId: device.id});
      }, DEVICE_TIMEOUT_MS));

      if (isNew) this.emit({type: 'device_found', device});

    } catch (e) {
      console.warn('[ZBS] Bad beacon:', e);
    }
  }

  // ── TCP server — receive files ───────────────────────────────────────────────

  private async startTCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = TcpSocket.createServer((socket) => {
        this.handleIncomingConnection(socket);
      });

      server.on('error', (err: Error) => {
        console.error('[ZBS] TCP server error:', err);
        reject(err);
      });

      server.listen({port: TRANSFER_PORT, host: '0.0.0.0'}, () => {
        this.tcpServer = server;
        console.log('[ZBS] TCP server listening on', TRANSFER_PORT);
        resolve();
      });
    });
  }

  private handleIncomingConnection(socket: ReturnType<typeof TcpSocket.createConnection>): void {
    let headerBuf   = '';
    let transfer: Transfer | null = null;
    let currentFile: TransferFile | null = null;
    let fileStream: RNFS.StatefulPromise<void> | null = null;
    let fileOffset  = 0;
    let totalRcvd   = 0;
    let speedTimer: ReturnType<typeof setInterval> | null = null;
    let lastRcvd    = 0;
    let headerDone  = false;

    socket.on('error', (err: Error) => {
      console.error('[ZBS] Incoming socket error:', err);
      if (transfer) this.emit({type: 'transfer_failed', transferId: transfer.id, error: err.message});
    });

    socket.on('close', () => {
      if (speedTimer) clearInterval(speedTimer);
    });

    socket.on('data', async (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');

      // ── Phase 1: read JSON header (terminated by '\n') ───────────────────
      if (!headerDone) {
        const str = data.toString('utf8');
        headerBuf += str;
        const nl = headerBuf.indexOf('\n');

        if (nl === -1) return; // keep buffering

        const headerStr  = headerBuf.slice(0, nl);
        const leftover   = Buffer.from(headerBuf.slice(nl + 1), 'utf8');
        headerDone       = true;
        headerBuf        = '';

        try {
          const meta = JSON.parse(headerStr);

          // ── Clipboard shortcut ───────────────────────────────────────────
          if (meta.type === 'clipboard') {
            this.emit({type: 'clipboard_received', content: meta.content, deviceName: meta.senderName});
            socket.destroy();
            return;
          }

          // ── File transfer handshake ──────────────────────────────────────
          transfer = {
            id:               meta.transferId ?? generateId(),
            direction:        'receive',
            status:           'pending',
            device:           meta.device,
            files:            meta.files,
            totalBytes:       meta.totalBytes,
            transferredBytes: 0,
            speed:            0,
          };

          this.emit({type: 'transfer_request', transfer});

          // Wait for user accept/reject
          const accepted = await new Promise<boolean>(resolve => {
            const timeout = setTimeout(() => resolve(false), 30_000);
            this.pendingAccept.set(transfer!.id, (val) => {
              clearTimeout(timeout);
              resolve(val);
            });
          });

          if (!accepted) {
            socket.write(JSON.stringify({type: 'ack', transferId: transfer.id, accepted: false}) + '\n');
            socket.destroy();
            return;
          }

          socket.write(JSON.stringify({type: 'ack', transferId: transfer.id, accepted: true}) + '\n');

          // Start speed reporting
          speedTimer = setInterval(() => {
            if (!transfer) return;
            const speed = totalRcvd - lastRcvd;
            lastRcvd    = totalRcvd;
            this.emit({type: 'transfer_progress', transferId: transfer.id, transferred: totalRcvd, speed});
          }, 1000);

          // Open first file for writing
          currentFile = meta.files[0] ?? null;
          if (currentFile) {
            await RNFS.mkdir(this.savePath).catch(() => {});
            const destPath = `${this.savePath}/${currentFile.name}`;
            fileOffset = 0;
            await RNFS.writeFile(destPath, '', 'utf8').catch(() => {}); // create/truncate
          }

          // Process any leftover bytes that arrived with the header packet
          if (leftover.length > 0) {
            await this.writeChunk(transfer, currentFile, leftover);
            totalRcvd += leftover.length;
          }

        } catch (e) {
          console.error('[ZBS] Handshake parse error:', e);
          socket.destroy();
        }

        return;
      }

      // ── Phase 2: stream binary file bytes ────────────────────────────────
      if (!transfer || !currentFile) return;

      await this.writeChunk(transfer, currentFile, data);
      totalRcvd            += data.length;
      transfer.transferredBytes = totalRcvd;

      // Check if current file is done and move to next
      if (totalRcvd >= currentFile.size) {
        const fileIdx = transfer.files.indexOf(currentFile);
        const nextFile = transfer.files[fileIdx + 1] ?? null;

        if (nextFile) {
          currentFile  = nextFile;
          fileOffset   = 0;
          await RNFS.mkdir(this.savePath).catch(() => {});
          await RNFS.writeFile(`${this.savePath}/${nextFile.name}`, '', 'utf8').catch(() => {});
        }
      }

      // All bytes received
      if (totalRcvd >= transfer.totalBytes) {
        if (speedTimer) { clearInterval(speedTimer); speedTimer = null; }
        socket.write(JSON.stringify({type: 'done', transferId: transfer.id}) + '\n');
        this.emit({type: 'transfer_complete', transferId: transfer.id, savePath: this.savePath});
        socket.destroy();
      }
    });
  }

  private async writeChunk(
    transfer: Transfer,
    file: TransferFile,
    data: Buffer,
  ): Promise<void> {
    const destPath = `${this.savePath}/${file.name}`;
    // Append base64-encoded chunk
    await RNFS.appendFile(destPath, data.toString('base64'), 'base64').catch(e =>
      console.error('[ZBS] Write error:', e),
    );
  }

  // ── Accept / Reject transfer ─────────────────────────────────────────────────

  acceptTransfer(transferId: string): void {
    const resolve = this.pendingAccept.get(transferId);
    if (resolve) { resolve(true); this.pendingAccept.delete(transferId); }
  }

  rejectTransfer(transferId: string): void {
    const resolve = this.pendingAccept.get(transferId);
    if (resolve) { resolve(false); this.pendingAccept.delete(transferId); }
  }

  // ── TCP client — send files ──────────────────────────────────────────────────

  async sendFiles(device: NearbyDevice, files: TransferFile[]): Promise<string> {
    const transferId = generateId();
    const totalBytes = files.reduce((s, f) => s + f.size, 0);

    const sendState: ActiveSend = {
      socket: null as any,
      transferId,
      cancelled: false,
    };
    this.activeSends.set(transferId, sendState);

    return new Promise<string>((resolve, reject) => {
      const socket = TcpSocket.createConnection(
        {host: device.ipAddress!, port: device.port ?? TRANSFER_PORT, tls: false},
        async () => {
          sendState.socket = socket;

          // ── Send handshake header ─────────────────────────────────────────
          const handshake = JSON.stringify({
            transferId,
            device: {
              id:         this.localId,
              name:       this.localName,
              deviceType: getLocalDeviceType(),
              platform:   Platform.OS,
            },
            files:      files.map(f => ({...f, children: undefined})),
            totalBytes,
          }) + '\n';

          socket.write(handshake);

          // Wait for ACK
          let ackBuf = '';
          socket.on('data', async (chunk: Buffer | string) => {
            const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
            ackBuf += str;
            const nl = ackBuf.indexOf('\n');
            if (nl === -1) return;

            const ackStr = ackBuf.slice(0, nl);
            ackBuf = ackBuf.slice(nl + 1);

            try {
              const ack = JSON.parse(ackStr);

              if (ack.type === 'ack' && !ack.accepted) {
                socket.destroy();
                this.activeSends.delete(transferId);
                reject(new Error('Transfer rejected by receiver'));
                return;
              }

              if (ack.type === 'ack' && ack.accepted) {
                // ── Stream all files ────────────────────────────────────────
                let sent = 0;
                let lastSent = 0;

                const speedTimer = setInterval(() => {
                  const speed = sent - lastSent;
                  lastSent = sent;
                  this.emit({type: 'transfer_progress', transferId, transferred: sent, speed});
                }, 1000);

                for (const file of files) {
                  if (sendState.cancelled) break;

                  if (file.isFolder) {
                    // Recursively read folder and send each file
                    await this.sendFolder(socket, file, sendState, (n) => { sent += n; });
                    continue;
                  }

                  // Read file in chunks and send
                  const stat = await RNFS.stat(file.path);
                  let offset = 0;
                  const fileSize = stat.size;

                  while (offset < fileSize && !sendState.cancelled) {
                    const length  = Math.min(CHUNK_SIZE, fileSize - offset);
                    const b64Chunk = await RNFS.read(file.path, length, offset, 'base64');
                    const buf      = Buffer.from(b64Chunk, 'base64');

                    await new Promise<void>((res, rej) => {
                      socket.write(buf, (err?: Error | null) => {
                        if (err) rej(err); else res();
                      });
                    });

                    offset += length;
                    sent   += length;
                  }
                }

                clearInterval(speedTimer);

                if (!sendState.cancelled) {
                  this.emit({type: 'transfer_complete', transferId, savePath: ''});
                }

                this.activeSends.delete(transferId);
                resolve(transferId);
              }

              if (ack.type === 'done') {
                socket.destroy();
              }

              if (ack.type === 'error') {
                socket.destroy();
                this.activeSends.delete(transferId);
                this.emit({type: 'transfer_failed', transferId, error: ack.message});
                reject(new Error(ack.message));
              }

            } catch (e) {
              console.error('[ZBS] ACK parse error:', e);
            }
          });
        },
      );

      sendState.socket = socket;

      socket.on('error', (err: Error) => {
        console.error('[ZBS] Send socket error:', err);
        this.activeSends.delete(transferId);
        this.emit({type: 'transfer_failed', transferId, error: err.message});
        reject(err);
      });

      socket.on('close', () => {
        this.activeSends.delete(transferId);
      });
    });
  }

  private async sendFolder(
    socket: ReturnType<typeof TcpSocket.createConnection>,
    folder: TransferFile,
    sendState: ActiveSend,
    onBytes: (n: number) => void,
  ): Promise<void> {
    if (!folder.children) return;
    for (const child of folder.children) {
      if (sendState.cancelled) break;
      if (child.isFolder) {
        await this.sendFolder(socket, child, sendState, onBytes);
        continue;
      }
      let offset = 0;
      while (offset < child.size && !sendState.cancelled) {
        const length    = Math.min(CHUNK_SIZE, child.size - offset);
        const b64Chunk  = await RNFS.read(child.path, length, offset, 'base64');
        const buf       = Buffer.from(b64Chunk, 'base64');
        await new Promise<void>((res, rej) => {
          socket.write(buf, (err?: Error | null) => { if (err) rej(err); else res(); });
        });
        offset  += length;
        onBytes(length);
      }
    }
  }

  // ── Clipboard send ───────────────────────────────────────────────────────────

  async sendClipboard(device: NearbyDevice, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = TcpSocket.createConnection(
        {host: device.ipAddress!, port: device.port ?? TRANSFER_PORT, tls: false},
        () => {
          const payload = JSON.stringify({
            type:       'clipboard',
            content,
            senderName: this.localName,
            ts:         Date.now(),
          }) + '\n';
          socket.write(payload, () => { socket.destroy(); resolve(); });
        },
      );
      socket.on('error', reject);
    });
  }

  // ── Cancel transfer ──────────────────────────────────────────────────────────

  cancelTransfer(transferId: string): void {
    const s = this.activeSends.get(transferId);
    if (s) {
      s.cancelled = true;
      s.socket?.destroy();
      this.activeSends.delete(transferId);
    }
    this.emit({type: 'transfer_failed', transferId, error: 'Cancelled by user'});
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  getDevices():  NearbyDevice[] { return Array.from(this.devices.values()); }
  getLocalId():  string         { return this.localId; }
  getLocalName():string         { return this.localName; }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const discoveryService = new ZBSNetworkService();
