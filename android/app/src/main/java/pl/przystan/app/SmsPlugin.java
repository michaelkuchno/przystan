package pl.przystan.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.net.Uri;
import android.provider.Settings;
import android.telephony.SmsManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Sends an SMS directly from this phone's SIM (the user's own plan – no gateway, no cost for
 * Przystań). Only on an explicit tap in the app; asks for the SEND_SMS permission the first time.
 * The APK is installed outside Google Play, so the Play SMS policy does not apply (docs D-065).
 */
@CapacitorPlugin(name = "PrzystanSms", permissions = { @Permission(strings = { Manifest.permission.SEND_SMS }, alias = "sms") })
public class SmsPlugin extends Plugin {

    private static final long TIMEOUT_MS = 60_000;

    @PluginMethod
    public void available(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        JSObject r = new JSObject();
        r.put("available", pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY));
        PermissionState st = getPermissionState("sms");
        r.put("permission", st == PermissionState.GRANTED ? "granted" : st == PermissionState.DENIED ? "denied" : "prompt");
        call.resolve(r);
    }

    /**
     * Opens Android's "App info" screen for Przystań. Android 13+ blocks the SMS permission of apps
     * installed outside Google Play ("restricted setting"); it can only be allowed there (⋮ → Allow
     * restricted settings → Permissions → SMS). There is no way – and no intent – to bypass this.
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Settings could not be opened: " + e.getMessage(), "FAILED");
        }
    }

    @PluginMethod
    public void send(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
            return;
        }
        doSend(call);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) doSend(call);
        else call.reject("SMS permission denied", "DENIED");
    }

    @SuppressWarnings("deprecation")
    private SmsManager smsManager() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return getContext().getSystemService(SmsManager.class);
        return SmsManager.getDefault();
    }

    private void doSend(PluginCall call) {
        String to = call.getString("to", "");
        String body = call.getString("body", "");
        if (to == null || to.trim().isEmpty() || body == null || body.isEmpty()) {
            call.reject("Recipient and text are required", "INVALID");
            return;
        }
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
            call.reject("This device cannot send SMS", "UNAVAILABLE");
            return;
        }
        final String[] recipients = to.split("[,;]");
        final Context ctx = getContext();
        final String action = "pl.przystan.app.SMS_SENT." + System.nanoTime();
        final int[] pending = { 0 };
        final AtomicBoolean done = new AtomicBoolean(false);
        final Handler handler = new Handler(Looper.getMainLooper());
        final BroadcastReceiver[] holder = new BroadcastReceiver[1];

        final Runnable finish = () -> {
            try {
                ctx.unregisterReceiver(holder[0]);
            } catch (Exception ignored) {
                // already unregistered
            }
        };

        holder[0] = new BroadcastReceiver() {
            @Override
            public void onReceive(Context c, Intent intent) {
                if (done.get()) return;
                if (getResultCode() != Activity.RESULT_OK) {
                    if (done.compareAndSet(false, true)) {
                        finish.run();
                        call.reject("SMS was not sent (code " + getResultCode() + ")", "FAILED");
                    }
                    return;
                }
                pending[0]--;
                if (pending[0] <= 0 && done.compareAndSet(false, true)) {
                    finish.run();
                    JSObject r = new JSObject();
                    r.put("sent", true);
                    r.put("confirmed", true);
                    call.resolve(r);
                }
            }
        };
        ContextCompat.registerReceiver(ctx, holder[0], new IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED);

        try {
            SmsManager sms = smsManager();
            for (String raw : recipients) {
                String number = raw.trim();
                if (number.isEmpty()) continue;
                ArrayList<String> parts = sms.divideMessage(body);
                ArrayList<PendingIntent> sent = new ArrayList<>();
                for (int i = 0; i < parts.size(); i++) {
                    Intent intent = new Intent(action).setPackage(ctx.getPackageName());
                    sent.add(PendingIntent.getBroadcast(ctx, (int) (System.nanoTime() & 0xffff) + i, intent, PendingIntent.FLAG_IMMUTABLE));
                    pending[0]++;
                }
                sms.sendMultipartTextMessage(number, null, parts, sent, null);
            }
        } catch (Exception e) {
            if (done.compareAndSet(false, true)) {
                finish.run();
                call.reject("SMS could not be sent: " + e.getMessage(), "FAILED");
            }
            return;
        }

        // no delivery report within a minute (some phones never send one) – handed over to the network
        handler.postDelayed(() -> {
            if (done.compareAndSet(false, true)) {
                finish.run();
                JSObject r = new JSObject();
                r.put("sent", true);
                r.put("confirmed", false);
                call.resolve(r);
            }
        }, TIMEOUT_MS);
    }
}
