package pl.przystan.app;

import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // app-local plugins must be registered before the bridge starts
        registerPlugin(BiometricPlugin.class);
        super.onCreate(savedInstanceState);
        // Sensitive data: hide content in the app switcher and block screenshots.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // The app has its own dark theme: never let WebView (or One UI) invert colours.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        }

        // System font size: instead of WebView's text zoom (which enlarges only some text blocks
        // and breaks the layout), pass the scale to CSS, where it scales the whole rem-based layout.
        settings.setTextZoom(100);
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                injectFontScale(view);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) injectFontScale(webView);
    }

    /**
     * Effective scale at body-text size (16 sp). On Android 14+ font scaling is non-linear,
     * so this is what native apps actually show, not the raw Configuration.fontScale.
     */
    private float bodyFontScale() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        float sp = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 16f, dm);
        float dp = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 16f, dm);
        float scale = dp > 0 ? sp / dp : 1f;
        return Math.max(0.85f, Math.min(scale, 2f));
    }

    private void injectFontScale(WebView view) {
        String js = String.format(
            Locale.US,
            "document.documentElement.style.setProperty('--os-font-scale','%.3f');",
            bodyFontScale()
        );
        view.post(() -> view.evaluateJavascript(js, null));
    }
}
