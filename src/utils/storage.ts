import AsyncStorage from '@react-native-async-storage/async-storage';
import {HistoryEntry, Transfer, ClipboardShare} from './types';

const KEYS = {
  HISTORY: '@zbs_history',
  DEVICE_NAME: '@zbs_device_name',
  SAVE_PATH: '@zbs_save_path',
  RECEIVE_AUTO: '@zbs_receive_auto',
};

// ── History ──────────────────────────────────────────────────────────────────
export const saveHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY);
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    // Keep last 200 entries
    if (history.length > 200) history.splice(200);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('saveHistoryEntry error:', e);
  }
};

export const loadHistory = async (): Promise<HistoryEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearHistory = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEYS.HISTORY);
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const saveDeviceName = async (name: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.DEVICE_NAME, name);
};

export const loadDeviceName = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.DEVICE_NAME);
};

export const saveSavePath = async (path: string): Promise<void> => {
  await AsyncStorage.setItem(KEYS.SAVE_PATH, path);
};

export const loadSavePath = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.SAVE_PATH);
};

export const saveAutoReceive = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(KEYS.RECEIVE_AUTO, String(enabled));
};

export const loadAutoReceive = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(KEYS.RECEIVE_AUTO);
  return val === 'true';
};
