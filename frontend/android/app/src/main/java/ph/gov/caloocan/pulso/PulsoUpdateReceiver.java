package ph.gov.caloocan.pulso;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Register OS-managed checks after install, reboot or an in-place app update. */
public class PulsoUpdateReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        boolean installed = Intent.ACTION_PACKAGE_ADDED.equals(action)
            && intent.getData() != null
            && context.getPackageName().equals(intent.getData().getSchemeSpecificPart());
        if (installed || Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            // Schedule native work only; no network, activity or WebView here.
            PulsoUpdateMonitor.restoreSchedule(context.getApplicationContext());
        }
    }
}
