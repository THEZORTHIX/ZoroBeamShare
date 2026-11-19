package com.zorobeamshare;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * TransferService — Android Foreground Service that keeps transfers alive
 * when the app is backgrounded or the screen is off.
 *
 * Lifecycle:
 *   startService(ACTION_START) → promotes to foreground with a persistent notification
 *   updateService(ACTION_UPDATE) → updates notification with live progress text
 *   startService(ACTION_STOP)  → removes foreground, stops service, releases wakelock
 *
 * Uses a PARTIAL_WAKE_LOCK so the CPU stays on during transfers even with
 * the screen off, without requiring the screen itself to stay on.
 */
public class TransferService extends Service {

    // ── Intent actions ────────────────────────────────────────────────────────
    public static final String ACTION_START  = "com.zorobeamshare.TRANSFER_START";
    public static final String ACTION_UPDATE = "com.zorobeamshare.TRANSFER_UPDATE";
    public static final String ACTION_STOP   = "com.zorobeamshare.TRANSFER_STOP";

    // ── Extras ────────────────────────────────────────────────────────────────
    public static final String EXTRA_TITLE    = "title";
    public static final String EXTRA_TEXT     = "text";
    public static final String EXTRA_PROGRESS = "progress";   // 0–100
    public static final String EXTRA_MAX      = "max";        // always 100

    // ── Notification channel ──────────────────────────────────────────────────
    private static final String CHANNEL_ID   = "zbs_transfer_channel";
    private static final String CHANNEL_NAME = "ZoroBeam Transfers";
    private static final int    NOTIF_ID     = 1001;

    // ── Wake lock ─────────────────────────────────────────────────────────────
    private PowerManager.WakeLock wakeLock;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        final String action = intent.getAction();
        if (action == null)           return START_NOT_STICKY;

        switch (action) {
            case ACTION_START:
                handleStart(intent);
                break;
            case ACTION_UPDATE:
                handleUpdate(intent);
                break;
            case ACTION_STOP:
                handleStop();
                break;
        }

        // If killed by OS, don't restart automatically
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        super.onDestroy();
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    private void handleStart(Intent intent) {
        String title    = intent.getStringExtra(EXTRA_TITLE);
        String text     = intent.getStringExtra(EXTRA_TEXT);
        int    progress = intent.getIntExtra(EXTRA_PROGRESS, 0);

        if (title == null) title = "Transferring…";
        if (text  == null) text  = "Starting transfer";

        startForeground(NOTIF_ID, buildNotification(title, text, progress, true));
    }

    private void handleUpdate(Intent intent) {
        String title    = intent.getStringExtra(EXTRA_TITLE);
        String text     = intent.getStringExtra(EXTRA_TEXT);
        int    progress = intent.getIntExtra(EXTRA_PROGRESS, 0);
        boolean ongoing = progress < 100;

        if (title == null) title = "Transferring…";
        if (text  == null) text  = "";

        NotificationManager nm =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID, buildNotification(title, text, progress, ongoing));
        }
    }

    private void handleStop() {
        stopForeground(true);
        stopSelf();
    }

    // ── Notification builder ──────────────────────────────────────────────────

    private Notification buildNotification(
        String title, String text, int progress, boolean ongoing
    ) {
        // Tap notification → open app
        Intent openIntent  = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent openPending = PendingIntent.getActivity(this, 0, openIntent, piFlags);

        // Cancel action
        Intent cancelIntent = new Intent(this, TransferService.class);
        cancelIntent.setAction(ACTION_STOP);
        PendingIntent cancelPending = PendingIntent.getService(this, 1, cancelIntent, piFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_upload)   // system upload icon
            .setContentIntent(openPending)
            .setOngoing(ongoing)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        if (progress >= 0 && progress <= 100) {
            builder.setProgress(100, progress, progress == 0);
        }

        if (!ongoing) {
            // Transfer complete — show check icon, auto-dismiss after 5s
            builder.setSmallIcon(android.R.drawable.stat_sys_upload_done)
                   .setAutoCancel(true)
                   .setTimeoutAfter(5000)
                   .clearActions();
        } else {
            builder.addAction(
                android.R.drawable.ic_delete,
                "Cancel",
                cancelPending
            );
        }

        return builder.build();
    }

    // ── Notification channel ──────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active ZoroBeam file transfers");
            channel.setShowBadge(false);
            channel.enableLights(false);
            channel.enableVibration(false);

            NotificationManager nm =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    // ── Wake lock ─────────────────────────────────────────────────────────────

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ZoroBeamShare::TransferWakeLock"
            );
            wakeLock.acquire(10 * 60 * 1000L); // 10-minute safety timeout
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    // ── Static helpers (called from native module) ────────────────────────────

    public static void start(Context ctx, String title, String text) {
        Intent intent = new Intent(ctx, TransferService.class);
        intent.setAction(ACTION_START);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_TEXT, text);
        intent.putExtra(EXTRA_PROGRESS, 0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }
    }

    public static void update(Context ctx, String title, String text, int progress) {
        Intent intent = new Intent(ctx, TransferService.class);
        intent.setAction(ACTION_UPDATE);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_TEXT, text);
        intent.putExtra(EXTRA_PROGRESS, progress);
        ctx.startService(intent);
    }

    public static void stop(Context ctx) {
        Intent intent = new Intent(ctx, TransferService.class);
        intent.setAction(ACTION_STOP);
        ctx.startService(intent);
    }
}
