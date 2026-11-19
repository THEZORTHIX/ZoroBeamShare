/**
 * usePermissions — requests all runtime permissions ZoroBeamShare needs on Android.
 * Returns `granted` boolean and a `request` function to retry if denied.
 *
 * Required permissions:
 *   - NEARBY_WIFI_DEVICES (Android 13+) or ACCESS_FINE_LOCATION (< 13)  → Wi-Fi Direct discovery
 *   - BLUETOOTH_SCAN / BLUETOOTH_CONNECT / BLUETOOTH_ADVERTISE (Android 12+) → BT discovery
 *   - READ_MEDIA_IMAGES / READ_MEDIA_VIDEO / READ_MEDIA_AUDIO (Android 13+)  → file picker
 *   - READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE (< Android 10)         → file access
 *   - CAMERA                                                                 → QR scanner
 */

import {useCallback, useEffect, useState} from 'react';
import {Platform, Alert, Linking} from 'react-native';
import {
  check, request, requestMultiple, PERMISSIONS, RESULTS, Permission,
} from 'react-native-permissions';

type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'checking';

export const usePermissions = () => {
  const [status, setStatus] = useState<PermissionStatus>('checking');

  const getRequiredPermissions = (): Permission[] => {
    if (Platform.OS !== 'android') {
      // iOS permissions are handled separately (Info.plist + NSUsageDescription)
      return [];
    }

    const apiLevel = Platform.Version as number;
    const perms: Permission[] = [];

    // ── Network / Discovery ──────────────────────────────────────────────────
    if (apiLevel >= 33) {
      perms.push(PERMISSIONS.ANDROID.NEARBY_WIFI_DEVICES);
    } else {
      perms.push(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    }

    // ── Bluetooth (Android 12+) ───────────────────────────────────────────────
    if (apiLevel >= 31) {
      perms.push(
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
      );
    }

    // ── Storage / File access ─────────────────────────────────────────────────
    if (apiLevel >= 33) {
      perms.push(
        PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
        PERMISSIONS.ANDROID.READ_MEDIA_AUDIO,
      );
    } else if (apiLevel >= 29) {
      perms.push(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    } else {
      perms.push(
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
      );
    }

    // ── Camera (QR scanner) ───────────────────────────────────────────────────
    perms.push(PERMISSIONS.ANDROID.CAMERA);

    // ── Notifications (Android 13+) ───────────────────────────────────────────
    if (apiLevel >= 33) {
      perms.push(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
    }

    return perms;
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setStatus('granted');
      return true;
    }

    setStatus('checking');
    const required = getRequiredPermissions();

    if (required.length === 0) {
      setStatus('granted');
      return true;
    }

    try {
      const results = await requestMultiple(required);

      // Check if any critical permission is permanently denied (blocked)
      const blocked = Object.entries(results).filter(
        ([, r]) => r === RESULTS.BLOCKED,
      );

      if (blocked.length > 0) {
        Alert.alert(
          'Permissions Required',
          'Some permissions are permanently denied. Please enable them in Settings to use ZoroBeamShare.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
        setStatus('blocked');
        return false;
      }

      // Check if any critical (non-notification) permission is denied
      const critical = required.filter(
        p => p !== PERMISSIONS.ANDROID.POST_NOTIFICATIONS &&
             p !== PERMISSIONS.ANDROID.CAMERA,
      );
      const denied = critical.some(p => results[p] === RESULTS.DENIED);

      if (denied) {
        setStatus('denied');
        return false;
      }

      setStatus('granted');
      return true;
    } catch (e) {
      console.error('[ZBS] Permission request error:', e);
      setStatus('denied');
      return false;
    }
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return {
    permissionStatus: status,
    isGranted: status === 'granted',
    requestPermissions,
  };
};
