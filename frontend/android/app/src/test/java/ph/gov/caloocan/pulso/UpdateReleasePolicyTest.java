package ph.gov.caloocan.pulso;

import org.junit.Test;
import static org.junit.Assert.*;

public class UpdateReleasePolicyTest {
    private static final String APP = "ph.gov.caloocan.pulso";
    private static final String HASH = "a".repeat(64);

    @Test public void releaseMustBeCompleteForThisApp() {
        assertTrue(UpdateReleasePolicy.valid(APP, APP, 28, "2.4.27", 1000L, HASH));
        assertFalse(UpdateReleasePolicy.valid(APP, "other.app", 28, "2.4.27", 1000, HASH));
        for (Object code : new Object[] { "28", 28.5, -1, 0, Long.MAX_VALUE, null }) {
            assertFalse(UpdateReleasePolicy.valid(APP, APP, code, "2.4.27", 1000, HASH));
        }
        assertFalse(UpdateReleasePolicy.valid(APP, APP, 28, "install now", 1000, HASH));
        assertFalse(UpdateReleasePolicy.valid(APP, APP, 28, "2.4.27", "1000", HASH));
        assertFalse(UpdateReleasePolicy.valid(APP, APP, 28, "2.4.27", 0, HASH));
        assertFalse(UpdateReleasePolicy.valid(APP, APP, 28, "2.4.27", 1000, "bad"));
    }

    @Test public void onlyANewBuildNotifiesOnce() {
        assertTrue(UpdateReleasePolicy.shouldNotify(28, 27, 26));
        assertFalse(UpdateReleasePolicy.shouldNotify(27, 27, 26));
        assertFalse(UpdateReleasePolicy.shouldNotify(26, 27, 25));
        assertFalse(UpdateReleasePolicy.shouldNotify(28, 27, 28));
        assertTrue(UpdateReleasePolicy.shouldNotify(29, 27, 28));
    }

    @Test public void serverOriginNeverCarriesCredentialsPathsOrInsecureProduction() throws Exception {
        assertEquals("https://pulso.example", UpdateReleasePolicy.origin("https://pulso.example/", false));
        assertEquals("http://192.168.0.192:33159", UpdateReleasePolicy.origin("http://192.168.0.192:33159", true));
        for (String bad : new String[] { "http://pulso.example", "https://user:pass@pulso.example", "https://pulso.example/api", "https://pulso.example?secret=1", "https://pulso.example#fragment", "file:///tmp/app" }) {
            try { UpdateReleasePolicy.origin(bad, false); fail(bad); } catch (IllegalArgumentException expected) { }
        }
    }
}
