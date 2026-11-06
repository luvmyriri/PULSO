package ph.gov.caloocan.pulso;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        super.load();
        bridge.getWebView().setWebChromeClient(new PulsoWebChromeClient(bridge));
    }
}
