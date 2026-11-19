import React, {createContext, useContext, useReducer, useCallback, useEffect, useRef} from 'react';
import {NearbyDevice, Transfer, HistoryEntry, TransferFile} from '../utils/types';
import {generateId} from '../utils/helpers';
import {saveHistoryEntry, loadHistory, loadDeviceName, loadSavePath} from '../utils/storage';
import {discoveryService, DiscoveryEvent} from '../services/DiscoveryService';
import DeviceInfo from 'react-native-device-info';

// ── State ────────────────────────────────────────────────────────────────────

interface AppState {
  devices: NearbyDevice[];
  activeTransfers: Transfer[];
  history: HistoryEntry[];
  deviceName: string;
  savePath: string;
  isDiscovering: boolean;
  pendingRequest: Transfer | null;
  clipboardContent: string;
}

const initial: AppState = {
  devices: [],
  activeTransfers: [],
  history: [],
  deviceName: '',
  savePath: '',
  isDiscovering: false,
  pendingRequest: null,
  clipboardContent: '',
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | {type: 'SET_DEVICE_NAME'; name: string}
  | {type: 'SET_SAVE_PATH'; path: string}
  | {type: 'SET_DISCOVERING'; value: boolean}
  | {type: 'DEVICE_FOUND'; device: NearbyDevice}
  | {type: 'DEVICE_LOST'; deviceId: string}
  | {type: 'TRANSFER_STARTED'; transfer: Transfer}
  | {type: 'TRANSFER_PROGRESS'; transferId: string; transferred: number; speed: number}
  | {type: 'TRANSFER_COMPLETE'; transferId: string; savePath: string}
  | {type: 'TRANSFER_FAILED'; transferId: string; error: string}
  | {type: 'TRANSFER_CANCELLED'; transferId: string}
  | {type: 'SET_PENDING_REQUEST'; transfer: Transfer | null}
  | {type: 'LOAD_HISTORY'; entries: HistoryEntry[]}
  | {type: 'ADD_HISTORY'; entry: HistoryEntry}
  | {type: 'CLEAR_HISTORY'}
  | {type: 'SET_CLIPBOARD'; content: string};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DEVICE_NAME':
      return {...state, deviceName: action.name};
    case 'SET_SAVE_PATH':
      return {...state, savePath: action.path};
    case 'SET_DISCOVERING':
      return {...state, isDiscovering: action.value};
    case 'DEVICE_FOUND':
      return {
        ...state,
        devices: state.devices.some(d => d.id === action.device.id)
          ? state.devices.map(d => d.id === action.device.id ? action.device : d)
          : [...state.devices, action.device],
      };
    case 'DEVICE_LOST':
      return {...state, devices: state.devices.filter(d => d.id !== action.deviceId)};
    case 'TRANSFER_STARTED':
      return {...state, activeTransfers: [...state.activeTransfers, action.transfer]};
    case 'TRANSFER_PROGRESS':
      return {
        ...state,
        activeTransfers: state.activeTransfers.map(t =>
          t.id === action.transferId
            ? {...t, transferredBytes: action.transferred, speed: action.speed, status: 'transferring'}
            : t,
        ),
      };
    case 'TRANSFER_COMPLETE':
      return {
        ...state,
        activeTransfers: state.activeTransfers.map(t =>
          t.id === action.transferId
            ? {...t, status: 'completed', completedAt: Date.now(), savePath: action.savePath, speed: 0}
            : t,
        ),
      };
    case 'TRANSFER_FAILED':
      return {
        ...state,
        activeTransfers: state.activeTransfers.map(t =>
          t.id === action.transferId
            ? {...t, status: 'failed', errorMessage: action.error, speed: 0}
            : t,
        ),
      };
    case 'TRANSFER_CANCELLED':
      return {
        ...state,
        activeTransfers: state.activeTransfers.map(t =>
          t.id === action.transferId ? {...t, status: 'cancelled', speed: 0} : t,
        ),
      };
    case 'SET_PENDING_REQUEST':
      return {...state, pendingRequest: action.transfer};
    case 'LOAD_HISTORY':
      return {...state, history: action.entries};
    case 'ADD_HISTORY':
      return {...state, history: [action.entry, ...state.history].slice(0, 200)};
    case 'CLEAR_HISTORY':
      return {...state, history: []};
    case 'SET_CLIPBOARD':
      return {...state, clipboardContent: action.content};
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => void;
  sendFiles: (device: NearbyDevice, files: TransferFile[]) => Promise<void>;
  sendClipboard: (device: NearbyDevice, content: string) => Promise<void>;
  acceptTransfer: (transferId: string) => void;
  rejectTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;
  setDeviceName: (name: string) => void;
  setSavePath: (path: string) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, dispatch] = useReducer(reducer, initial);

  // Boot — load settings & history
  useEffect(() => {
    const boot = async () => {
      const [storedName, storedPath, history] = await Promise.all([
        loadDeviceName(),
        loadSavePath(),
        loadHistory(),
      ]);
      const fallbackName = await DeviceInfo.getDeviceName();
      dispatch({type: 'SET_DEVICE_NAME', name: storedName ?? fallbackName});
      dispatch({type: 'SET_SAVE_PATH', path: storedPath ?? '/storage/emulated/0/ZoroBeamShare'});
      dispatch({type: 'LOAD_HISTORY', entries: history});
    };
    boot();
  }, []);

  // Discovery event handler
  const handleEvent = useCallback((event: DiscoveryEvent) => {
    switch (event.type) {
      case 'device_found':
        dispatch({type: 'DEVICE_FOUND', device: event.device});
        break;
      case 'device_lost':
        dispatch({type: 'DEVICE_LOST', deviceId: event.deviceId});
        break;
      case 'transfer_request':
        dispatch({type: 'SET_PENDING_REQUEST', transfer: event.transfer});
        break;
      case 'transfer_progress':
        dispatch({type: 'TRANSFER_PROGRESS', transferId: event.transferId, transferred: event.transferred, speed: event.speed});
        break;
      case 'transfer_complete': {
        dispatch({type: 'TRANSFER_COMPLETE', transferId: event.transferId, savePath: event.savePath});
        // Add to history
        const transfer = state.activeTransfers.find(t => t.id === event.transferId);
        if (transfer) {
          const entry: HistoryEntry = {id: generateId(), type: 'transfer', transfer, timestamp: Date.now()};
          dispatch({type: 'ADD_HISTORY', entry});
          saveHistoryEntry(entry);
        }
        break;
      }
      case 'transfer_failed':
        dispatch({type: 'TRANSFER_FAILED', transferId: event.transferId, error: event.error});
        break;
      case 'clipboard_received':
        dispatch({type: 'SET_CLIPBOARD', content: event.content});
        break;
    }
  }, [state.activeTransfers]);

  const startDiscovery = useCallback(async () => {
    dispatch({type: 'SET_DISCOVERING', value: true});
    const unsub = discoveryService.subscribe(handleEvent);
    await discoveryService.start(state.deviceName, state.savePath);
    return () => {
      unsub();
      discoveryService.stop();
      dispatch({type: 'SET_DISCOVERING', value: false});
    };
  }, [state.deviceName, state.savePath, handleEvent]);

  const stopDiscovery = useCallback(() => {
    discoveryService.stop();
    dispatch({type: 'SET_DISCOVERING', value: false});
  }, []);

  const sendFiles = useCallback(async (device: NearbyDevice, files: TransferFile[]) => {
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    const transfer: Transfer = {
      id: generateId(),
      direction: 'send',
      status: 'connecting',
      device,
      files,
      totalBytes,
      transferredBytes: 0,
      speed: 0,
      startedAt: Date.now(),
    };
    dispatch({type: 'TRANSFER_STARTED', transfer});
    await discoveryService.sendFiles(device, files);
  }, []);

  const sendClipboard = useCallback(async (device: NearbyDevice, content: string) => {
    await discoveryService.sendClipboard(device, content);
    const entry: HistoryEntry = {
      id: generateId(),
      type: 'clipboard',
      clipboard: {id: generateId(), content, device, receivedAt: Date.now()},
      timestamp: Date.now(),
    };
    dispatch({type: 'ADD_HISTORY', entry});
    saveHistoryEntry(entry);
  }, []);

  const acceptTransfer = useCallback((transferId: string) => {
    dispatch({type: 'SET_PENDING_REQUEST', transfer: null});
    const t = state.pendingRequest;
    if (t) {
      dispatch({type: 'TRANSFER_STARTED', transfer: {...t, status: 'transferring'}});
    }
  }, [state.pendingRequest]);

  const rejectTransfer = useCallback((_transferId: string) => {
    dispatch({type: 'SET_PENDING_REQUEST', transfer: null});
  }, []);

  const cancelTransfer = useCallback((transferId: string) => {
    dispatch({type: 'TRANSFER_CANCELLED', transferId});
  }, []);

  const setDeviceName = useCallback((name: string) => {
    dispatch({type: 'SET_DEVICE_NAME', name});
  }, []);

  const setSavePath = useCallback((path: string) => {
    dispatch({type: 'SET_SAVE_PATH', path});
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({type: 'CLEAR_HISTORY'});
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        startDiscovery,
        stopDiscovery,
        sendFiles,
        sendClipboard,
        acceptTransfer,
        rejectTransfer,
        cancelTransfer,
        setDeviceName,
        setSavePath,
        clearHistory,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
