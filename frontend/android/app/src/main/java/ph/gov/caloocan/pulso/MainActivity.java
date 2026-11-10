package ph.gov.caloocan.pulso;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(
            this,
            SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT)
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android otherwise adds a tinted scrim behind three-button navigation.
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }
    }

    @Override
    protected void load() {
        registerPlugin(PulsoAppearancePlugin.class);
        registerPlugin(PulsoAppUpdatePlugin.class);
        super.load();
        bridge.getWebView().setWebChromeClient(new PulsoWebChromeClient(bridge));
    }
}
