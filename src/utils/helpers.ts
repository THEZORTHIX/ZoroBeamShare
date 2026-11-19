import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {FileCategory, DeviceType} from './types';

// ── File size formatting ─────────────────────────────────────────────────────
export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

// ── Transfer speed formatting ────────────────────────────────────────────────
export const formatSpeed = (bytesPerSec: number): string => {
  return `${formatBytes(bytesPerSec)}/s`;
};

// ── ETA formatting ───────────────────────────────────────────────────────────
export const formatETA = (remainingBytes: number, speed: number): string => {
  if (speed === 0) return '—';
  const seconds = remainingBytes / speed;
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m left`;
  return `${(seconds / 3600).toFixed(1)}h left`;
};

// ── MIME → category ──────────────────────────────────────────────────────────
export const getFileCategory = (mimeType: string, name: string): FileCategory => {
  if (!mimeType || mimeType === 'application/octet-stream') {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const extMap: Record<string, FileCategory> = {
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', heic: 'image',
      mp4: 'video', mkv: 'video', mov: 'video', avi: 'video', webm: 'video',
      mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio',
      pdf: 'document', doc: 'document', docx: 'document', xls: 'document',
      xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
      zip: 'archive', rar: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive',
      apk: 'app', ipa: 'app', exe: 'app',
    };
    return extMap[ext] ?? 'other';
  }
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.startsWith('text/')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  if (mimeType.includes('apk') || mimeType.includes('executable')) return 'app';
  return 'other';
};

// ── Category icon names (react-native-vector-icons / MaterialIcons) ──────────
export const getCategoryIcon = (category: FileCategory): string => {
  const icons: Record<FileCategory, string> = {
    image: 'image',
    video: 'videocam',
    audio: 'music-note',
    document: 'description',
    archive: 'folder-zip',
    app: 'apps',
    folder: 'folder',
    other: 'insert-drive-file',
  };
  return icons[category];
};

// ── Category gradient colors ─────────────────────────────────────────────────
export const getCategoryGradient = (category: FileCategory): string[] => {
  const gradients: Record<FileCategory, string[]> = {
    image: ['#F472B6', '#EC4899'],
    video: ['#A78BFA', '#8B5CF6'],
    audio: ['#34D399', '#10B981'],
    document: ['#60A5FA', '#3B82F6'],
    archive: ['#FBBF24', '#F59E0B'],
    app: ['#F87171', '#EF4444'],
    folder: ['#06B6D4', '#0EA5E9'],
    other: ['#94A3B8', '#64748B'],
  };
  return gradients[category];
};

// ── Device type detection ────────────────────────────────────────────────────
export const getLocalDeviceType = (): DeviceType => {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'unknown';
};

// ── Avatar color from string hash ───────────────────────────────────────────
export const stringToColor = (str: string): string => {
  const palette = [
    '#6C63FF', '#06B6D4', '#F472B6', '#34D399',
    '#FBBF24', '#F87171', '#A78BFA', '#38BDF8',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

// ── Initials from device name ────────────────────────────────────────────────
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// ── Random transfer ID ────────────────────────────────────────────────────────
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

// ── Clamp ────────────────────────────────────────────────────────────────────
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// ── Progress percentage ───────────────────────────────────────────────────────
export const getProgress = (transferred: number, total: number): number =>
  total > 0 ? clamp(transferred / total, 0, 1) : 0;

// ── Relative time label ───────────────────────────────────────────────────────
export const relativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};
