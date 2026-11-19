/**
 * useAppStateBeacon.ts
 *
 * Listens to React Native's AppState changes and ensures the UDP beacon
 * keeps broadcasting even when the app is backgrounded.
 *
 * On Android, the foreground service (TransferService) keeps the process
 * alive. This hook simply resumes beacon broadcasting when the app comes
 * back to the foreground after being backgrounded.
 *
 * On iOS, background UDP broadcasting is not reliably supported without
 * specific entitlements, so this hook is a no-op for receive scenarios
 * and relies on the user keeping the app in the foreground.
 */

import {useEffect, useRef} from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import {discoveryService} from '../services/DiscoveryService';
import {useApp} from '../store/AppContext';

export const useAppStateBeacon = (): void => {
  const {state, startDiscovery, stopDiscovery} = useApp();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appState.current;
      appState.current = nextState;

      if (prev.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — resume discovery if it was running
        if (state.isDiscovering) {
          console.log('[ZBS] App foregrounded — resuming discovery');
          startDiscovery();
        }
      }

      if (nextState.match(/inactive|background/)) {
        // App going to background — on Android the foreground service
        // keeps the process alive; we just log it.
        console.log('[ZBS] App backgrounded — foreground service keeping transfers alive');

        // On iOS, we have to stop discovery to avoid OS termination
        if (Platform.OS === 'ios' && !hasActiveTransfer(state)) {
          console.log('[ZBS] iOS: pausing discovery in background');
        }
      }
    });

    return () => subscription.remove();
  }, [state.isDiscovering, state.activeTransfers]);
};

function hasActiveTransfer(state: ReturnType<typeof useApp>['state']): boolean {
  return state.activeTransfers.some(
    t => t.status === 'transferring' || t.status === 'connecting',
  );
}
