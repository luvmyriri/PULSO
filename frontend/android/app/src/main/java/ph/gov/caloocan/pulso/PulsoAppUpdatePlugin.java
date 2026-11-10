package ph.gov.caloocan.pulso;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URI;

/** Let Android's browser and installer handle user-confirmed APK updates. */
@CapacitorPlugin(name = "PulsoAppUpdate")
public class PulsoAppUpdatePlugin extends Plugin {
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
