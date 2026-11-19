package com.zorobeamshare;

import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

/**
 * TransferServiceModule — React Native bridge module.
 * Exposes start / update / stop of TransferService to JavaScript.
 *
 * JS usage:
 *   import { NativeModules } from 'react-native';
 *   const { TransferServiceModule } = NativeModules;
 *   TransferServiceModule.startService("Sending…", "Connecting to Pixel 8");
 *   TransferServiceModule.updateService("Sending…", "2.4 MB/s · 12s left", 45);
 *   TransferServiceModule.stopService();
 */
public class TransferServiceModule extends ReactContextBaseJavaModule {

    public TransferServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        // This is the name used in NativeModules.TransferServiceModule on the JS side
        return "TransferServiceModule";
    }

    @ReactMethod
    public void startService(String title, String text, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            TransferService.start(ctx, title, text);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("START_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void updateService(String title, String text, int progress, Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            TransferService.update(ctx, title, text, progress);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("UPDATE_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            TransferService.stop(ctx);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERROR", e.getMessage(), e);
        }
    }
}
