package pl.przystan.app;

import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Biometric unlock: an AES-256-GCM key in the Android Keystore that can only be used after a
 * strong biometric authentication (BiometricPrompt + CryptoObject). It encrypts a copy of the
 * app's data key (DEK). The key is invalidated by the system when biometrics are enrolled or
 * removed – the JS side then switches biometric unlock off and asks for the password.
 *
 * Errors (call.reject code): cancelled, failed, invalidated, lockout, unavailable.
 */
@CapacitorPlugin(name = "PrzystanBiometric")
public class BiometricPlugin extends Plugin {

    private static final String KEY_ALIAS = "przystan-bio-dek";
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int status = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        JSObject ret = new JSObject();
        ret.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        ret.put("status", status);
        call.resolve(ret);
    }

    @PluginMethod
    public void encrypt(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("missing data", "failed");
            return;
        }
        try {
            deleteKeyQuietly();
            SecretKey key = createKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            authenticate(call, cipher, (c, failed) -> {
                byte[] ct = c.doFinal(Base64.decode(data, Base64.NO_WRAP));
                JSObject ret = new JSObject();
                ret.put("iv", Base64.encodeToString(c.getIV(), Base64.NO_WRAP));
                ret.put("ct", Base64.encodeToString(ct, Base64.NO_WRAP));
                ret.put("failedAttempts", failed);
                return ret;
            });
        } catch (Exception e) {
            call.reject(e.getMessage(), "failed", e);
        }
    }

    @PluginMethod
    public void decrypt(PluginCall call) {
        String iv = call.getString("iv");
        String ct = call.getString("ct");
        if (iv == null || ct == null) {
            call.reject("missing data", "failed");
            return;
        }
        try {
            SecretKey key = getKey();
            if (key == null) {
                call.reject("key missing", "invalidated");
                return;
            }
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            try {
                cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            } catch (KeyPermanentlyInvalidatedException e) {
                // biometrics changed since the key was created
                deleteKeyQuietly();
                call.reject("biometrics changed", "invalidated", e);
                return;
            }
            authenticate(call, cipher, (c, failed) -> {
                byte[] plain = c.doFinal(Base64.decode(ct, Base64.NO_WRAP));
                JSObject ret = new JSObject();
                ret.put("data", Base64.encodeToString(plain, Base64.NO_WRAP));
                ret.put("failedAttempts", failed);
                java.util.Arrays.fill(plain, (byte) 0);
                return ret;
            });
        } catch (Exception e) {
            call.reject(e.getMessage(), "failed", e);
        }
    }

    @PluginMethod
    public void deleteKey(PluginCall call) {
        deleteKeyQuietly();
        call.resolve();
    }

    /* ------------------------------------------------------------------ helpers */

    private interface CipherAction {
        JSObject run(Cipher cipher, int failedAttempts) throws Exception;
    }

    private void authenticate(PluginCall call, Cipher cipher, CipherAction action) {
        String title = call.getString("title", "Przystań");
        String subtitle = call.getString("subtitle", "");
        String cancel = call.getString("cancel", "Cancel");
        FragmentActivity activity = getActivity();
        activity.runOnUiThread(() -> {
            final int[] failed = { 0 };
            BiometricPrompt prompt = new BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        BiometricPrompt.CryptoObject crypto = result.getCryptoObject();
                        if (crypto == null || crypto.getCipher() == null) {
                            call.reject("no crypto object", "failed");
                            return;
                        }
                        try {
                            call.resolve(action.run(crypto.getCipher(), failed[0]));
                        } catch (Exception e) {
                            call.reject(e.getMessage(), "failed", e, attempts(failed[0]));
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        // a finger / face was not recognised; the prompt stays open
                        failed[0]++;
                    }

                    @Override
                    public void onAuthenticationError(int code, @NonNull CharSequence msg) {
                        String c;
                        switch (code) {
                            case BiometricPrompt.ERROR_LOCKOUT:
                            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                                c = "lockout";
                                break;
                            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
                            case BiometricPrompt.ERROR_USER_CANCELED:
                            case BiometricPrompt.ERROR_CANCELED:
                                c = "cancelled";
                                break;
                            case BiometricPrompt.ERROR_NO_BIOMETRICS:
                            case BiometricPrompt.ERROR_HW_NOT_PRESENT:
                            case BiometricPrompt.ERROR_HW_UNAVAILABLE:
                                c = "unavailable";
                                break;
                            default:
                                c = "failed";
                        }
                        call.reject(msg.toString(), c, null, attempts(failed[0]));
                    }
                }
            );
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setNegativeButtonText(cancel)
                .setAllowedAuthenticators(AUTHENTICATORS)
                .setConfirmationRequired(false)
                .build();
            prompt.authenticate(info, new BiometricPrompt.CryptoObject(cipher));
        });
    }

    private static JSObject attempts(int n) {
        JSObject o = new JSObject();
        o.put("failedAttempts", n);
        return o;
    }

    private SecretKey createKey() throws Exception {
        KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // every use needs a fresh strong-biometric authentication
            spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        }
        KeyGenerator gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        gen.init(spec.build());
        return gen.generateKey();
    }

    private SecretKey getKey() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE);
        ks.load(null);
        return (SecretKey) ks.getKey(KEY_ALIAS, null);
    }

    private void deleteKeyQuietly() {
        try {
            KeyStore ks = KeyStore.getInstance(KEYSTORE);
            ks.load(null);
            if (ks.containsAlias(KEY_ALIAS)) ks.deleteEntry(KEY_ALIAS);
        } catch (Exception ignored) {
            // nothing to delete
        }
    }
}
