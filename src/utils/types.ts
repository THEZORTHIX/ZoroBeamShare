// ZoroBeamShare — Transfer & Discovery Types

export type DeviceType = 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'unknown';
export type TransferStatus = 'idle' | 'pending' | 'connecting' | 'transferring' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type ConnectionMethod = 'wifi_direct' | 'wifi_lan' | 'bluetooth' | 'hotspot';
export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'app' | 'folder' | 'other';

export interface NearbyDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  platform: string;
  rssi?: number;              // signal strength
  connectionMethod: ConnectionMethod;
  ipAddress?: string;
  port?: number;
  avatar?: string;            // initials-based avatar color
  isAvailable: boolean;
  discoveredAt: number;       // epoch ms
}

export interface TransferFile {
  id: string;
  name: string;
  path: string;
  size: number;               // bytes
  mimeType: string;
  category: FileCategory;
  isFolder: boolean;
  children?: TransferFile[];  // for folders
}

export interface Transfer {
  id: string;
  direction: 'send' | 'receive';
  status: TransferStatus;
  device: NearbyDevice;
  files: TransferFile[];
  totalBytes: number;
  transferredBytes: number;
  speed: number;              // bytes per second
  startedAt?: number;
  completedAt?: number;
  savePath?: string;
  errorMessage?: string;
}

export interface ClipboardShare {
  id: string;
  content: string;
  device: NearbyDevice;
  receivedAt: number;
}

export interface HistoryEntry {
  id: string;
  type: 'transfer' | 'clipboard';
  transfer?: Transfer;
  clipboard?: ClipboardShare;
  timestamp: number;
}
