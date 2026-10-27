# Local resident sign-in CAPTCHA

Implemented 27 October 2026 on `FinalIntegratedPulso` after the browser reported that localhost was not allowed for the configured site key.

The original browser and server credentials remain in their existing ignored environment configuration. Local-only overrides were added:

- `frontend/.env.development.local`: `VITE_RECAPTCHA_LOCAL_TEST=true`.
- `backend/.env.local`: `PULSO_ENV=development` and `PULSO_RECAPTCHA_LOCAL_TEST=true`.

The development frontend uses Google's official v2 test site key only in a Vite development build on localhost/127.0.0.1/IPv6 loopback. Production builds retain the configured browser key and omit the test site key. The development Vite server binds to 127.0.0.1 when test mode is enabled, so its API proxy cannot expose the always-passing test challenge to the LAN.

The backend selects the paired test secret only with both explicit flags and a loopback request host, network peer and, when supplied, browser origin. Other requests fail verification in test mode. Outside test mode the configured real secret is required; there is no implicit test secret. Hard-coded `mobile_bypass`, `dev_bypass` and `mock_captcha_token` values no longer skip Google verification. Native clients previously relying on these strings need an actual supported CAPTCHA token before resident login; this correction does not claim native-mobile compatibility.

The widget still requires a user interaction. No CAPTCHA was solved or login submitted by the agent. Expired challenges clear the client token; load failures preserve credentials and show a recoverable error. A visible local-development label accompanies Google's own testing warning. A missing production site key shows a configuration error rather than a broken widget.

Google explicitly states that its v2 test keys always pass and should not be used for production: [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq). For real local anti-abuse testing, provision a separate development key pair authorized for localhost and 127.0.0.1, disable both local-test flags, and configure the matching site/secret pair. Never add a CAPTCHA secret to a VITE variable. Google documents the server verification contract in [Verifying the user's response](https://developers.google.com/recaptcha/docs/verify).

Validation: production build passed; targeted lint returned zero errors with four pre-existing warnings; the production JavaScript contains no official development site key. Automated tests cover explicit environment selection, loopback restrictions, malformed origins, missing/test-secret rejection, hard-coded bypass rejection, provider rejection/timeouts, and preserved resident/government account flows. The local frontend served the development configuration and listened only on 127.0.0.1; backend health returned 200. Live widget inspection was unavailable because browser control is disabled in Work settings. A user must refresh the login page and complete the checkbox; a successful interactive sign-in has not been claimed.
