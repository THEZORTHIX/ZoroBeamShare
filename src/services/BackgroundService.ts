/**
 * BackgroundService.ts
 *
 * TypeScript wrapper around the Android TransferServiceModule native bridge.
 * On iOS this is a no-op — iOS doesn't support background execution for
 * arbitrary TCP/UDP work without a VoIP or location entitlement.
 *
 * Usage:
 *   BackgroundService.start('Sending photo.jpg', 'Connecting to Pixel 8');
 *   BackgroundService.update('Sending photo.jpg', '3.1 MB/s · 8s left', 62);
 *   BackgroundService.complete('Transfer complete!', 'photo.jpg saved');
 *   BackgroundService.stop();
 */

import {NativeModules, Platform} from 'react-native';

const {TransferServiceModule} = NativeModules;

const isAndroid = Platform.OS === 'android';

const noop = () => Promise.resolve();

/**
 * Starts the foreground service and acquires a wake lock.
 * Call this as soon as a transfer begins.
 */
const start = async (title: string, text: string): Promise<void> => {
  if (!isAndroid || !TransferServiceModule) return;
  try {
    await TransferServiceModule.startService(title, text);
  } catch (e) {
    console.warn('[ZBS] BackgroundService.start error:', e);
  }
};

/**
 * Updates the persistent notification with fresh progress info.
 * @param progress  0–100 integer
 */
const update = async (title: string, text: string, progress: number): Promise<void> => {
  if (!isAndroid || !TransferServiceModule) return;
  try {
    await TransferServiceModule.updateService(title, text, Math.round(progress));
  } catch (e) {
    console.warn('[ZBS] BackgroundService.update error:', e);
  }
};

/**
 * Shows a "Transfer complete" notification then stops the service.
 * The notification auto-dismisses after 5 seconds.
 */
const complete = async (title: string, text: string): Promise<void> => {
  if (!isAndroid || !TransferServiceModule) return;
  try {
    // Push to 100% then stop — service handles the rest
    await TransferServiceModule.updateService(title, text, 100);
    setTimeout(async () => {
      try { await TransferServiceModule.stopService(); } catch {}
    }, 1500);
  } catch (e) {
    console.warn('[ZBS] BackgroundService.complete error:', e);
  }
};

/**
 * Immediately stops the foreground service and releases the wake lock.
 * Call this on cancel or error.
 */
const stop = async (): Promise<void> => {
  if (!isAndroid || !TransferServiceModule) return;
  try {
    await TransferServiceModule.stopService();
  } catch (e) {
    console.warn('[ZBS] BackgroundService.stop error:', e);
  }
};

export const BackgroundService = {start, update, complete, stop};
