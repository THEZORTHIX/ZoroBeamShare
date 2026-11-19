/**
 * useBackgroundTransfer.ts
 *
 * Watches active transfers in AppContext and automatically:
 *   • Starts the foreground service when a transfer begins
 *   • Updates the notification every second with speed + ETA
 *   • Shows a "complete" notification when done
 *   • Stops the service when all transfers finish / are cancelled
 *
 * This hook should be mounted once at the root of the app.
 */

import {useEffect, useRef} from 'react';
import {useApp} from '../store/AppContext';
import {BackgroundService} from '../services/BackgroundService';
import {Transfer} from '../utils/types';
import {formatBytes, formatSpeed, formatETA, getProgress} from '../utils/helpers';

export const useBackgroundTransfer = (): void => {
  const {state} = useApp();
  const prevActiveCount = useRef(0);
  const serviceRunning  = useRef(false);

  useEffect(() => {
    const active = state.activeTransfers.filter(
      t => t.status === 'transferring' || t.status === 'connecting',
    );
    const completed = state.activeTransfers.filter(t => t.status === 'completed');
    const failed    = state.activeTransfers.filter(
      t => t.status === 'failed' || t.status === 'cancelled',
    );

    const activeCount = active.length;

    // ── Service start ────────────────────────────────────────────────────────
    if (activeCount > 0 && !serviceRunning.current) {
      serviceRunning.current = true;
      const first = active[0];
      const label = getTransferLabel(first);
      BackgroundService.start(
        first.direction === 'send' ? 'Sending…' : 'Receiving…',
        label,
      );
    }

    // ── Progress update ───────────────────────────────────────────────────────
    if (activeCount > 0 && serviceRunning.current) {
      const primary = active[0]; // Show first active transfer in notification
      const progress = getProgress(primary.transferredBytes, primary.totalBytes) * 100;
      const title = primary.direction === 'send'
        ? `Sending to ${primary.device.name}`
        : `Receiving from ${primary.device.name}`;
      const text  = getProgressText(primary);

      BackgroundService.update(title, text, Math.round(progress));
    }

    // ── Completion ────────────────────────────────────────────────────────────
    if (activeCount === 0 && prevActiveCount.current > 0 && serviceRunning.current) {
      serviceRunning.current = false;

      if (completed.length > 0) {
        const last = completed[completed.length - 1];
        const fileLabel = last.files.length === 1
          ? last.files[0]?.name ?? 'file'
          : `${last.files.length} files`;
        BackgroundService.complete(
          '✓ Transfer Complete',
          `${fileLabel} · ${formatBytes(last.totalBytes)}`,
        );
      } else if (failed.length > 0) {
        BackgroundService.stop();
      } else {
        BackgroundService.stop();
      }
    }

    // ── All cancelled / no active ─────────────────────────────────────────────
    if (activeCount === 0 && prevActiveCount.current === 0 && serviceRunning.current) {
      serviceRunning.current = false;
      BackgroundService.stop();
    }

    prevActiveCount.current = activeCount;
  }, [state.activeTransfers]);
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTransferLabel(t: Transfer): string {
  const fileLabel = t.files.length === 1
    ? t.files[0]?.name ?? 'file'
    : `${t.files.length} files`;
  return `${fileLabel} · ${formatBytes(t.totalBytes)}`;
}

function getProgressText(t: Transfer): string {
  const speed    = t.speed;
  const remaining = t.totalBytes - t.transferredBytes;
  const pct      = Math.round(getProgress(t.transferredBytes, t.totalBytes) * 100);

  if (t.status === 'connecting') return 'Connecting…';
  if (speed === 0)               return `${pct}% · ${formatBytes(t.transferredBytes)} of ${formatBytes(t.totalBytes)}`;

  return `${pct}% · ${formatSpeed(speed)} · ${formatETA(remaining, speed)}`;
}
