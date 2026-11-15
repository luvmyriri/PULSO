package ph.gov.caloocan.pulso;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.drawable.Icon;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** A bounded, anonymous release check; never downloads or installs an APK. */
final class PulsoUpdateMonitor {
    static final int JOB_ID = 216731;
    static final int RECOVERY_JOB_ID = 216734;
    static final int NOTIFICATION_ID = 216732;
    static final String TAP_EXTRA = "pulso_open_app_update";
    static final String CHANNEL = "pulso_app_updates";
    static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("pulso_app_updates", Context.MODE_PRIVATE);
    }

    static String origin(String raw) throws Exception {
        return UpdateReleasePolicy.origin(raw, BuildConfig.DEBUG);
    }

    static Context localized(Context context) {
        Configuration configuration = new Configuration(context.getResources().getConfiguration());
        configuration.setLocale(new Locale(preferences(context).getString("language", "en").equals("tl") ? "fil" : "en"));
        return context.createConfigurationContext(configuration);
    }

    static boolean allowed(Context context) {
        return (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
            && context.getSystemService(NotificationManager.class).areNotificationsEnabled();
    }

    static void schedule(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL,
            localized(context).getString(R.string.update_channel), NotificationManager.IMPORTANCE_DEFAULT));
        manager.cancel(NOTIFICATION_ID + 1); // Remove any notice left by the retired test action.
        JobScheduler scheduler = context.getSystemService(JobScheduler.class);
        // Keep the OS-managed check registered even if notification permission is
        // temporarily unavailable. Otherwise, a resident who re-enables PULSO
        // notifications in Android Settings would have to reopen the app before
        // a closed-app update notice could recover.
        if (scheduler.getPendingJob(JOB_ID) == null) {
            scheduler.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(context, PulsoUpdateJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15 * 60 * 1000L).setPersisted(true).build());
        }
    }

    /** Restore native checks without needing React or an open activity. */
    static void restoreSchedule(Context context) {
        try (InputStream input = context.getAssets().open("capacitor.config.json");
             ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[2048]; int size;
            while ((size = input.read(chunk)) != -1) {
                if (buffer.size() + size > 65536) throw new IllegalStateException("Invalid bundled update configuration");
                buffer.write(chunk, 0, size);
            }
            JSONObject config = new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            String server = origin(config.getJSONObject("plugins").getJSONObject("PulsoAppUpdate").getString("serverUrl"));
            // Read the current APK configuration after replacement, including a
            // changed development Wi-Fi origin. Never retain a stale server.
            preferences(context).edit().putString("server", server).apply();
            schedule(context);
            JobScheduler scheduler = context.getSystemService(JobScheduler.class);
            if (scheduler.getPendingJob(RECOVERY_JOB_ID) == null) {
                scheduler.schedule(new JobInfo.Builder(RECOVERY_JOB_ID, new ComponentName(context, PulsoUpdateJobService.class))
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(0)
                    .setBackoffCriteria(30000, JobInfo.BACKOFF_POLICY_EXPONENTIAL).setPersisted(true).build());
            }
        } catch (Exception unavailable) {
            JobScheduler scheduler = context.getSystemService(JobScheduler.class);
            scheduler.cancel(JOB_ID);
            scheduler.cancel(RECOVERY_JOB_ID);
            // No fallback to a different update server or fabricated notice.
        }
    }

    static void checkAsync(Context context) {
        Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> { try { check(app); } catch (Exception ignored) { /* Retry later; no false update/current claim. */ } });
    }

    static synchronized void check(Context context) throws Exception {
        check(context, null);
    }

    static synchronized void check(Context context, android.net.Network network) throws Exception {
        if (!allowed(context)) return;
        SharedPreferences prefs = preferences(context);
        String server = origin(prefs.getString("server", ""));
        java.net.URL url = new URI(server + "/api/mobile/app-updates/latest").toURL();
        HttpURLConnection connection = (HttpURLConnection) (network == null ? url.openConnection() : network.openConnection(url));
        connection.setConnectTimeout(8000); connection.setReadTimeout(8000);
        connection.setInstanceFollowRedirects(false); connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");
        JSONObject release;
        try {
            if (connection.getResponseCode() != 200) throw new IllegalStateException("Update unavailable");
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[2048]; int size;
                while ((size = input.read(chunk)) != -1) {
                    if (buffer.size() + size > 16384 || Thread.currentThread().isInterrupted()) throw new IllegalStateException("Invalid update response");
                    buffer.write(chunk, 0, size);
                }
                release = new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            }
        } finally { connection.disconnect(); }
        Object codeValue = release.opt("versionCode");
        if (!UpdateReleasePolicy.valid(context.getPackageName(), release.opt("applicationId"), codeValue,
            release.opt("versionName"), release.opt("size"), release.opt("sha256"))) return;
        long code = ((Number) codeValue).longValue();
        String name = release.optString("versionName", "");
        android.content.pm.PackageInfo installedPackage = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
        long installed = Build.VERSION.SDK_INT >= 28 ? installedPackage.getLongVersionCode() : installedPackage.versionCode;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (code <= installed) { manager.cancel(NOTIFICATION_ID); return; }
        NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
        if (!UpdateReleasePolicy.shouldNotify(code, installed, prefs.getLong("notified_build", 0)) || !allowed(context)
            || channel == null || channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return;
        Context text = localized(context);
        post(context, NOTIFICATION_ID, text.getString(R.string.update_available_title, name), text.getString(R.string.update_available_body));
        prefs.edit().putLong("notified_build", code).apply();
    }

    private static Icon statusLogo(Context context) {
        Bitmap logo = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_pulso_notification);
        Bitmap monochrome = Bitmap.createBitmap(logo.getWidth(), logo.getHeight(), Bitmap.Config.ARGB_8888);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColorFilter(new PorterDuffColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN));
        new Canvas(monochrome).drawBitmap(logo, 0, 0, paint);
        return Icon.createWithBitmap(monochrome);
    }

    private static void post(Context context, int id, String title, String body) {
        Intent intent = new Intent(context, MainActivity.class).putExtra(TAP_EXTRA, true)
            .setAction("ph.gov.caloocan.pulso.OPEN_APP_UPDATE").addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notice = new Notification.Builder(context, CHANNEL)
            .setSmallIcon(statusLogo(context))
            .setLargeIcon(Icon.createWithResource(context, R.drawable.ic_pulso_notification))
            .setColor(Color.rgb(255, 107, 0)).setContentTitle(title)
            .setContentText(body).setContentIntent(tap)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_RECOMMENDATION).build();
        context.getSystemService(NotificationManager.class).notify(id, notice);
    }
}
