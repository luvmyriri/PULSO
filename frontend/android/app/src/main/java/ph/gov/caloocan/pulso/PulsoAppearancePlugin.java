package ph.gov.caloocan.pulso;

import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.view.Window;
import androidx.core.graphics.ColorUtils;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "PulsoAppearance")
public class PulsoAppearancePlugin extends Plugin {
    private int topColor;
    private int bottomColor;
    private boolean hasAppearance;
    private boolean edgeToEdge;
    private boolean immersive;
    private String previousInsets = "";

    @Override
    public void load() {
        getBridge().executeOnMainThread(() -> {
            // Own the inset listener instead of relying on a particular WebView
            // version to expose safe-area env() values correctly.
            ViewCompat.setOnApplyWindowInsetsListener(getActivity().getWindow().getDecorView(), (view, insets) -> {
                int types = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
                Insets bars = insets.getInsets(types);
                boolean keyboard = insets.isVisible(WindowInsetsCompat.Type.ime());
                Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
                view.setPadding(
                    edgeToEdge ? 0 : bars.left,
                    edgeToEdge ? 0 : bars.top,
                    edgeToEdge ? 0 : bars.right,
                    keyboard ? ime.bottom : (edgeToEdge ? 0 : bars.bottom)
                );
                publishInsets(edgeToEdge ? bars : Insets.NONE, keyboard);
                return new WindowInsetsCompat.Builder(insets).setInsets(types, Insets.NONE).build();
            });
            ViewCompat.requestApplyInsets(getActivity().getWindow().getDecorView());
        });
    }

    private void publishInsets(Insets bars, boolean keyboard) {
        float density = getActivity().getResources().getDisplayMetrics().density;
        int top = Math.round(bars.top / density);
        int right = Math.round(bars.right / density);
        int bottom = keyboard ? 0 : Math.round(bars.bottom / density);
        int left = Math.round(bars.left / density);
        String values = top + ":" + right + ":" + bottom + ":" + left;
        if (values.equals(previousInsets)) return;
        previousInsets = values;
        String script = String.format(Locale.US,
            "{const s=document.documentElement.style;" +
            "s.setProperty('--pulso-safe-top','%dpx');" +
            "s.setProperty('--pulso-safe-right','%dpx');" +
            "s.setProperty('--pulso-safe-bottom','%dpx');" +
            "s.setProperty('--pulso-safe-left','%dpx');}", top, right, bottom, left);
        getBridge().getWebView().evaluateJavascript(script, null);
    }

    @PluginMethod
    public void setSystemBars(PluginCall call) {
        final int nextTop;
        final int nextBottom;
        try {
            nextTop = Color.parseColor(call.getString("topColor", "#F7F9FC"));
            nextBottom = Color.parseColor(call.getString("bottomColor", "#F7F9FC"));
        } catch (IllegalArgumentException error) {
            call.reject("System bar backgrounds must be valid colors.");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            topColor = nextTop;
            bottomColor = nextBottom;
            boolean nextEdgeToEdge = Boolean.TRUE.equals(call.getBoolean("edgeToEdge", false));
            edgeToEdge = nextEdgeToEdge;
            immersive = Boolean.TRUE.equals(call.getBoolean("immersive", false));
            hasAppearance = true;
            applyAppearance();
            previousInsets = "";
            ViewCompat.requestApplyInsets(getActivity().getWindow().getDecorView());
            call.resolve();
        });
    }

    @Override
    protected void handleOnResume() {
        getActivity().getWindow().getDecorView().post(this::applyAppearance);
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration configuration) {
        getActivity().getWindow().getDecorView().post(this::applyAppearance);
    }

    @SuppressWarnings("deprecation")
    private void applyAppearance() {
        if (!hasAppearance) return;
        Window window = getActivity().getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }
        if (edgeToEdge) {
            window.getDecorView().setBackgroundColor(Color.TRANSPARENT);
        } else {
            // Reserved edges on forms match the visible surface behind each bar.
            window.getDecorView().setBackground(new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[] { topColor, topColor, bottomColor, bottomColor }
            ));
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(ColorUtils.calculateLuminance(topColor) > 0.179);
        controller.setAppearanceLightNavigationBars(ColorUtils.calculateLuminance(bottomColor) > 0.179);
        if (immersive) {
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars());
        }
    }
}
