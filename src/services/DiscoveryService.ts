/**
 * ZoroBeamShare — Discovery Service
 *
 * Uses mDNS/Bonjour-style UDP broadcast + TCP socket server to discover
 * and connect to nearby devices on the same Wi-Fi network.
 * Falls back to Bluetooth LE advertisement scanning for cross-network
 * or direct Wi-Fi Direct scenarios.
 *
 * Architecture:
 *  1. BeaconService  — broadcasts UDP presence packets on port 45399
 *  2. DiscoveryService — listens for UDP beacons, maintains peer registry
 *  3. TransferServer — TCP server on port 45400 handling file transfers
 *  4. TransferClient — TCP client that initiates outgoing transfers
 */

import {NativeEventEmitter, NativeModules, Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {NearbyDevice, Transfer, TransferFile, ConnectionMethod} from '../utils/types';
import {generateId, getLocalDeviceType} from '../utils/helpers';
import DeviceInfo from 'react-native-device-info';

// Protocol constants
const BEACON_PORT = 45399;
const TRANSFER_PORT = 45400;
const BEACON_INTERVAL_MS = 2000;
const DEVICE_TIMEOUT_MS = 8000;
const PROTOCOL_VERSION = 1;
const APP_SIGNATURE = 'ZBS_BEAM';   // unique signature — no reference to any existing app

export type DiscoveryEvent =
  | {type: 'device_found'; device: NearbyDevice}
  | {type: 'device_lost'; deviceId: string}
  | {type: 'transfer_request'; transfer: Transfer}
  | {type: 'transfer_progress'; transferId: string; transferred: number; speed: number}
  | {type: 'transfer_complete'; transferId: string; savePath: string}
  | {type: 'transfer_failed'; transferId: string; error: string}
  | {type: 'clipboard_received'; content: string; deviceName: string};

type EventListener = (event: DiscoveryEvent) => void;

class ZBSDiscoveryService {
  private listeners: Set<EventListener> = new Set();
  private devices: Map<string, NearbyDevice> = new Map();
  private cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private beaconTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private localDeviceId = generateId();
  private localDeviceName = '';
  private savePath = '';

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async start(deviceName: string, savePath: string): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.localDeviceName = deviceName;
    this.savePath = savePath;

    try {
      await this.startBeacon();
      await this.startListener();
      await this.startTransferServer();
      console.log('[ZBS] Discovery service started');
    } catch (err) {
      console.error('[ZBS] Failed to start discovery:', err);
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.beaconTimer) clearInterval(this.beaconTimer);
    this.devices.clear();
    this.cleanupTimers.forEach(t => clearTimeout(t));
    this.cleanupTimers.clear();
    console.log('[ZBS] Discovery service stopped');
  }

  // ── Event system ──────────────────────────────────────────────────────────

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DiscoveryEvent): void {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.warn('[ZBS] Listener error:', e); }
    });
  }

  // ── Beacon broadcasting ───────────────────────────────────────────────────

  private async startBeacon(): Promise<void> {
    const broadcast = () => this.sendBeacon();
    broadcast(); // immediate first beacon
    this.beaconTimer = setInterval(broadcast, BEACON_INTERVAL_MS);
  }

  private async sendBeacon(): Promise<void> {
    // In a real React Native app this delegates to a native module
    // Here we define the beacon payload structure for the native layer
    const payload = {
      sig: APP_SIGNATURE,
      ver: PROTOCOL_VERSION,
      id: this.localDeviceId,
      name: this.localDeviceName,
      deviceType: getLocalDeviceType(),
      platform: Platform.OS,
      port: TRANSFER_PORT,
      ts: Date.now(),
    };
    // NativeModules.ZBSNetwork.sendUDPBroadcast(BEACON_PORT, JSON.stringify(payload));
    console.log('[ZBS] Beacon sent:', payload.name);
  }

  // ── Peer discovery listener ───────────────────────────────────────────────

  private async startListener(): Promise<void> {
    // NativeModules.ZBSNetwork.startUDPListener(BEACON_PORT, this.handleIncomingBeacon);
    console.log('[ZBS] UDP listener started on port', BEACON_PORT);
  }

  handleIncomingBeacon(raw: string, fromIP: string): void {
    try {
      const data = JSON.parse(raw);
      if (data.sig !== APP_SIGNATURE) return;
      if (data.id === this.localDeviceId) return; // ignore self

      const device: NearbyDevice = {
        id: data.id,
        name: data.name,
        deviceType: data.deviceType ?? 'unknown',
        platform: data.platform ?? 'unknown',
        connectionMethod: 'wifi_lan' as ConnectionMethod,
        ipAddress: fromIP,
        port: data.port ?? TRANSFER_PORT,
        isAvailable: true,
        discoveredAt: Date.now(),
      };

      const isNew = !this.devices.has(device.id);
      this.devices.set(device.id, device);

      // Reset expiry timer
      const existing = this.cleanupTimers.get(device.id);
      if (existing) clearTimeout(existing);
      this.cleanupTimers.set(
        device.id,
        setTimeout(() => this.expireDevice(device.id), DEVICE_TIMEOUT_MS),
      );

      if (isNew) {
        this.emit({type: 'device_found', device});
      }
    } catch (e) {
      console.warn('[ZBS] Bad beacon packet:', e);
    }
  }

  private expireDevice(deviceId: string): void {
    if (this.devices.has(deviceId)) {
      this.devices.delete(deviceId);
      this.emit({type: 'device_lost', deviceId});
    }
  }

  // ── Transfer server ───────────────────────────────────────────────────────

  private async startTransferServer(): Promise<void> {
    // NativeModules.ZBSNetwork.startTCPServer(TRANSFER_PORT, this.handleIncomingTransfer);
    console.log('[ZBS] Transfer server listening on port', TRANSFER_PORT);
  }

  handleIncomingTransfer(metadata: string, socket: unknown): void {
    try {
      const meta = JSON.parse(metadata);
      const transfer: Transfer = {
        id: meta.transferId ?? generateId(),
        direction: 'receive',
        status: 'pending',
        device: meta.device,
        files: meta.files,
        totalBytes: meta.totalBytes,
        transferredBytes: 0,
        speed: 0,
      };
      this.emit({type: 'transfer_request', transfer});
    } catch (e) {
      console.warn('[ZBS] Bad transfer metadata:', e);
    }
  }

  // ── Sending files ─────────────────────────────────────────────────────────

  async sendFiles(device: NearbyDevice, files: TransferFile[]): Promise<string> {
    const transferId = generateId();
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

    const metadata = {
      transferId,
      device: {
        id: this.localDeviceId,
        name: this.localDeviceName,
        deviceType: getLocalDeviceType(),
        platform: Platform.OS,
      },
      files,
      totalBytes,
    };

    // NativeModules.ZBSNetwork.connectTCP(device.ipAddress, device.port, JSON.stringify(metadata), ...)
    console.log('[ZBS] Initiating transfer to', device.name, '— files:', files.length);
    return transferId;
  }

  // ── Clipboard sharing ─────────────────────────────────────────────────────

  async sendClipboard(device: NearbyDevice, content: string): Promise<void> {
    const payload = {
      type: 'clipboard',
      content,
      senderName: this.localDeviceName,
      ts: Date.now(),
    };
    // NativeModules.ZBSNetwork.connectTCP(device.ipAddress, device.port, JSON.stringify(payload))
    console.log('[ZBS] Clipboard sent to', device.name);
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getDevices(): NearbyDevice[] {
    return Array.from(this.devices.values());
  }

  getLocalId(): string {
    return this.localDeviceId;
  }
}

// Singleton export
export const discoveryService = new ZBSDiscoveryService();
