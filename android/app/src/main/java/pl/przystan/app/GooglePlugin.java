package pl.przystan.app;

import android.accounts.Account;
import android.app.Activity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.ArrayList;
import java.util.List;

/**
 * Google authorization for sending e-mail from the user's own Gmail (scope gmail.send) in the
 * Android app. Google does not allow OAuth inside WebViews, so the native AuthorizationClient is
 * used (account picker + consent by Google Play services). Returns a short-lived access token;
 * nothing is stored by the plugin. Needs an "Android" OAuth client (package pl.przystan.app + the
 * SHA-1 of the signing certificate) in the user's Google Cloud project (docs/NOTIFICATIONS.md, D-066).
 */
@CapacitorPlugin(name = "PrzystanGoogle")
public class GooglePlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> launcher;
    private PluginCall pending;

    @Override
    public void load() {
        launcher = getActivity().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), result -> {
            PluginCall call = pending;
            pending = null;
            if (call == null) return;
            if (result.getResultCode() != Activity.RESULT_OK) {
                call.reject("Authorization cancelled", "CANCELLED");
                return;
            }
            try {
                AuthorizationResult r = Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(result.getData());
                resolveToken(call, r);
            } catch (ApiException e) {
                call.reject("Authorization failed: " + e.getStatusCode(), "AUTH");
            }
        });
    }

    @PluginMethod
    public void authorize(PluginCall call) {
        JSArray arr = call.getArray("scopes", new JSArray());
        List<Scope> scopes = new ArrayList<>();
        try {
            for (Object s : arr.toList()) scopes.add(new Scope(String.valueOf(s)));
        } catch (Exception e) {
            call.reject("Invalid scopes", "INVALID");
            return;
        }
        if (scopes.isEmpty()) {
            call.reject("No scopes", "INVALID");
            return;
        }
        AuthorizationRequest request = AuthorizationRequest.builder().setRequestedScopes(scopes).build();
        Identity.getAuthorizationClient(getActivity())
            .authorize(request)
            .addOnSuccessListener(r -> {
                if (r.hasResolution() && r.getPendingIntent() != null) {
                    pending = call;
                    launcher.launch(new IntentSenderRequest.Builder(r.getPendingIntent().getIntentSender()).build());
                } else {
                    resolveToken(call, r);
                }
            })
            .addOnFailureListener(e -> call.reject("Authorization failed: " + e.getMessage(), "AUTH"));
    }

    @SuppressWarnings("deprecation")
    private void resolveToken(PluginCall call, AuthorizationResult r) {
        String token = r.getAccessToken();
        if (token == null) {
            call.reject("No access token", "AUTH");
            return;
        }
        JSObject out = new JSObject();
        out.put("accessToken", token);
        try {
            if (r.toGoogleSignInAccount() != null) {
                Account account = r.toGoogleSignInAccount().getAccount();
                String email = r.toGoogleSignInAccount().getEmail();
                if (email == null && account != null) email = account.name;
                if (email != null) out.put("email", email);
            }
        } catch (Exception ignored) {
            // the e-mail is optional – the app asks Google's userinfo endpoint instead
        }
        call.resolve(out);
    }
}
