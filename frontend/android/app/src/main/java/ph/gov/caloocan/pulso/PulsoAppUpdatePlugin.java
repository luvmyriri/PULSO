package ph.gov.caloocan.pulso;

import android.content.Intent;
import android.net.Uri;
import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URI;

/** Let Android's browser and installer handle user-confirmed APK updates. */
@CapacitorPlugin(name = "PulsoAppUpdate", permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class PulsoAppUpdatePlugin extends Plugin {
    private boolean pendingUpdateTap;

    @Override public void load() {
        PulsoUpdateMonitor.restoreSchedule(getContext());
        receiveTap(getActivity().getIntent());
    }

    private void receiveTap(Intent intent) {
        if (intent != null && intent.getBooleanExtra(PulsoUpdateMonitor.TAP_EXTRA, false)) {
            intent.removeExtra(PulsoUpdateMonitor.TAP_EXTRA);
            pendingUpdateTap = true;
            notifyListeners("openUpdate", new JSObject(), true);
        }
    }

    @Override protected void handleOnNewIntent(Intent intent) { receiveTap(intent); }

    @PluginMethod public void consumeUpdateTap(PluginCall call) {
        JSObject result = new JSObject(); result.put("open", pendingUpdateTap);
        pendingUpdateTap = false; call.resolve(result);
    }

    @PluginMethod public void configureNotifications(PluginCall call) {
        try {
            String server = PulsoUpdateMonitor.origin(getConfig().getString("serverUrl", ""));
            PulsoUpdateMonitor.preferences(getContext()).edit().putString("server", server)
                .putString("language", "tl".equals(call.getString("language")) ? "tl" : "en").apply();
            if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED
                && !PulsoUpdateMonitor.preferences(getContext()).getBoolean("permission_requested", false)) {
                PulsoUpdateMonitor.preferences(getContext()).edit().putBoolean("permission_requested", true).apply();
                requestPermissionForAlias("notifications", call, "notificationPermissionResult");
            } else notificationPermissionResult(call);
        } catch (Exception error) { call.reject("Update notifications could not be configured."); }
    }

    @PermissionCallback private void notificationPermissionResult(PluginCall call) {
        PulsoUpdateMonitor.schedule(getContext()); PulsoUpdateMonitor.checkAsync(getContext());
        JSObject result = new JSObject(); result.put("enabled", PulsoUpdateMonitor.allowed(getContext())); call.resolve(result);
    }

    @PluginMethod public void checkNotifications(PluginCall call) {
        PulsoUpdateMonitor.schedule(getContext()); PulsoUpdateMonitor.checkAsync(getContext()); call.resolve();
    }


    @PluginMethod
    public void download(PluginCall call) {
        Integer versionCode = call.getInt("versionCode");
        String server = getConfig().getString("serverUrl", "");
        try {
            URI origin = new URI(server);
            if (versionCode == null || versionCode < 1 || origin.getHost() == null ||
                origin.getUserInfo() != null || origin.getQuery() != null || origin.getFragment() != null ||
                !("https".equals(origin.getScheme()) || "http".equals(origin.getScheme()))) {
                call.reject("Update server is not configured.");
                return;
            }
            Uri download = Uri.parse(server.replaceAll("/+$", "") + "/api/mobile/app-updates/" + versionCode + "/apk");
            getActivity().runOnUiThread(() -> {
                try {
                    Intent browser = new Intent(Intent.ACTION_VIEW, download);
                    browser.addCategory(Intent.CATEGORY_BROWSABLE);
                    getActivity().startActivity(browser);
                    call.resolve();
                } catch (Exception error) {
                    call.reject("Could not open the APK download.", error);
                }
            });
        } catch (Exception error) {
            call.reject("Update server is not configured.", error);
        }
    }
}
