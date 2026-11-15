package ph.gov.caloocan.pulso;

import java.net.URI;

/** Android-independent validation shared by scheduled and foreground checks. */
final class UpdateReleasePolicy {
    static String origin(String raw, boolean debug) throws Exception {
        URI uri = new URI(raw);
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
            || !("https".equals(uri.getScheme()) || (debug && "http".equals(uri.getScheme())))
            || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) throw new IllegalArgumentException("Invalid update origin");
        return raw.replaceAll("/+$", "");
    }

    static boolean valid(String expectedApp, Object app, Object code, Object name, Object size, Object sha) {
        return expectedApp.equals(app) && (code instanceof Integer || code instanceof Long)
            && ((Number) code).longValue() > 0 && ((Number) code).longValue() <= Integer.MAX_VALUE
            && (size instanceof Integer || size instanceof Long) && ((Number) size).longValue() > 0
            && name instanceof String && ((String) name).matches("\\d+\\.\\d+\\.\\d+")
            && sha instanceof String && ((String) sha).matches("[a-f0-9]{64}");
    }

    static boolean shouldNotify(long available, long installed, long notified) {
        return available > installed && available > notified;
    }
}
