package ph.gov.caloocan.pulso;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/** Serializes system permission prompts for PULSO's in-WebView camera and GPS. */
final class PulsoWebChromeClient extends BridgeWebChromeClient {
    private record Prompt(
        Object request,
        boolean location,
        String[] permissions,
        BooleanSupplier granted,
        Consumer<Boolean> respond
    ) {}

    private final Context context;
    private final ActivityResultLauncher<String[]> launcher;
    private final ArrayDeque<Prompt> waiting = new ArrayDeque<>();
    private Prompt active;
    private boolean activeCancelled;

    PulsoWebChromeClient(Bridge bridge) {
        super(bridge);
        context = bridge.getContext();
        launcher = bridge.registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            ignored -> {
                Prompt finished = active;
                active = null;
                if (finished != null && !activeCancelled) {
                    finished.respond().accept(finished.granted().getAsBoolean());
                }
                advance();
            }
        );
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private static boolean isAppOrigin(Uri uri) {
        return "https".equals(uri.getScheme()) && "localhost".equals(uri.getHost()) &&
            (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void enqueue(Prompt prompt) {
        waiting.addLast(prompt);
        advance();
    }

    private void advance() {
        while (active == null && !waiting.isEmpty()) {
            Prompt next = waiting.removeFirst();
            if (next.granted().getAsBoolean()) {
                next.respond().accept(true);
            } else {
                active = next;
                activeCancelled = false;
                launcher.launch(next.permissions());
            }
        }
    }

    @Override
    public void onPermissionRequest(PermissionRequest request) {
        if (!isAppOrigin(request.getOrigin())) {
            request.deny();
            return;
        }
        ArrayList<String> permissions = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                permissions.add(Manifest.permission.CAMERA);
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                permissions.add(Manifest.permission.RECORD_AUDIO);
            } else {
                request.deny();
                return;
            }
        }
        enqueue(new Prompt(request, false, permissions.toArray(new String[0]),
            () -> permissions.stream().allMatch(this::hasPermission),
            granted -> {
                try {
                    if (granted) request.grant(request.getResources());
                    else request.deny();
                } catch (IllegalStateException ignored) {
                    // Chromium can cancel the request while Android's dialog is closing.
                }
            }
        ));
    }

    @Override
    public void onPermissionRequestCanceled(PermissionRequest request) {
        waiting.removeIf(prompt -> prompt.request() == request);
        if (active != null && active.request() == request) activeCancelled = true;
    }

    @Override
    public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
        if (!isAppOrigin(Uri.parse(origin))) {
            callback.invoke(origin, false, false);
            return;
        }
        String coarse = Manifest.permission.ACCESS_COARSE_LOCATION;
        String fine = Manifest.permission.ACCESS_FINE_LOCATION;
        enqueue(new Prompt(callback, true, new String[] { coarse, fine },
            () -> hasPermission(coarse) || hasPermission(fine),
            granted -> callback.invoke(origin, granted, false)
        ));
    }

    @Override
    public void onGeolocationPermissionsHidePrompt() {
        waiting.removeIf(Prompt::location);
        if (active != null && active.location()) activeCancelled = true;
    }
}
