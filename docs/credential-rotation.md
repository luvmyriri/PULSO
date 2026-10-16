# Credential rotation runbook

Status: local verification only, 2026-10-14. Never paste credentials into an issue, log, chat, command argument, or Git file. A successful local check does not prove the deployed service has switched. For every credential: create replacement, install it in the local ignored environment, deploy it to the running app, verify the running app, and only then revoke the old credential. Record old provider key IDs privately for the revoke step.

## Inventory

| Key name | Rotation console or owner | Use in code | If wrong | Referrer restriction |
| --- | --- | --- | --- | --- |
| JWT_SECRET_KEY | Local generator and deployment secret store | backend/auth.py token signing and validation | Sign-in sessions fail | No |
| DATABASE_URL | PostgreSQL administrator and deployment secret store | backend/database.py, Alembic | All database-backed routes fail | No |
| POSTGRES_PASSWORD | Local Compose environment | docker-compose.yml local PostgreSQL | Local database connections fail | No |
| GOOGLE_MAPS_API_KEY | Google Cloud Console > APIs & Services > Credentials | Backend geocoding and places calls | Address/location services fail | Server key: API restrictions, no HTTP referrer |
| VITE_GOOGLE_MAPS_API_KEY | Google Cloud Console > APIs & Services > Credentials | Frontend Maps JavaScript and places | Maps and location selection fail | Yes: production/staging domains and localhost, plus API restrictions |
| GOOGLE_VISION_API_KEY | Google Cloud Console > APIs & Services > Credentials | backend/ocr_service.py Vision fallback | Vision OCR fallback fails | No; restrict to Cloud Vision API |
| GOOGLE_GEMINI_API_KEY | Google Cloud Console > APIs & Services > Credentials | Backend diagnostic scripts; production Gemini uses Vertex credentials | Diagnostic scripts fail | No; restrict to the API actually used |
| GOOGLE_APPLICATION_CREDENTIALS | Google Cloud Console > IAM & Admin > Service Accounts > Keys | backend/gemini_service.py Vertex client | AI service authentication fails | No |
| ANDROID_MANIFEST_GCP_KEY | Google Cloud Console > APIs & Services > Credentials | mobile_app Android Maps SDK | Android map fails | Android package and release SHA-1 restriction |
| OCR_LOG_GCP_API_KEY | Google Cloud Console > APIs & Services > Credentials | Historical OCR scan log; not a current environment key | Exposed historical key can be abused | Restrict replacement to its actual API and client |
| OCR_API_KEY | OCR.space account dashboard/support | backend/ocr_service.py fallback | OCR.space fallback fails | No |
| SMTP_PASS | Mail provider security console; Gmail App Passwords if Gmail is used | backend/main.py and backend/notification_service.py | Verification and notification mail fails | No |
| RECAPTCHA_SECRET_KEY | Google reCAPTCHA Admin Console > site settings | backend/main.py verification | CAPTCHA verification fails | Domain restriction belongs to site key |
| VITE_RECAPTCHA_SITE_KEY | Google reCAPTCHA Admin Console > site settings | Frontend login and government landing | CAPTCHA cannot render or pair with secret | Configure allowed domains in reCAPTCHA |
| PHILSYS_API_ID | PhilSys eVerify integration administrator | backend/philsys_service.py and router | Identity check fails | No |
| PHILSYS_API_SECRET | PhilSys eVerify integration administrator | backend/philsys_service.py and router | Identity check fails | No |
| PHILSYS_QR_COOKIE | PhilSys eVerify integration administrator | backend/philsys_service.py | QR verification fails | No |
| PHILSYS_PUBLIC_KEY | PhilSys eVerify integration administrator | backend/philsys_service.py | Signature validation fails | No |

Also review GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID when rotating OAuth configuration; they are client identifiers, not passwords. GOOGLE_MAPS_MAP_ID and VITE_GOOGLE_MAPS_MAP_ID identify map styles, not secrets.

## Google Cloud keys

Use the already authenticated gcloud CLI or Google Cloud Console. Select the project that owns each existing key; the backend Maps key and the Gemini/Android keys were found in different accessible projects. Create a separate replacement per use. For browser Maps, set HTTP referrers for the actual deployed domains and local development origins and restrict to the Maps JavaScript, Places, Geocoding, and Directions APIs used by the app. For server geocoding, restrict to the corresponding server APIs. For Vision, restrict to Cloud Vision API. Do not enable a disabled billable API merely to make a rotation test pass. Install with scripts/set_secret, then verify the specific app path before deleting the old key in Credentials. The old shared backend Maps key must remain until every consumer, including Vision and the deployed app, has moved.

For GOOGLE_APPLICATION_CREDENTIALS, open IAM & Admin > Service Accounts > the account used by the local JSON file > Keys. Create a replacement JSON key, put it in the ignored backend/google-credentials.json path, verify a harmless Vertex request, deploy the replacement, then delete the old key by its key ID. The local CLI account was denied key-list permission and automated creation was rejected by the approval system, so an authorized cloud administrator must perform this item. The service account currently has roles/aiplatform.expressUser and roles/aiplatform.user in its home project, and roles/aiplatform.user in the Vertex project; review whether the first role is necessary.

For ANDROID_MANIFEST_GCP_KEY, obtain the package name and the SHA-1 of the actual release signing certificate. In Credentials, create a new Android-restricted Maps key for that exact package and SHA-1, restrict it to Maps SDK for Android, put it in the next app build, release and verify the build, then delete the old key. Do not delete or prematurely restrict the existing key while an older release is in use. The package in this repository is com.pulso.resident; the release SHA-1 was not available locally.

## Manual provider rotations

1. OCR_API_KEY: in the OCR.space account's API key management page, or through OCR.space support if key management is unavailable, request a replacement key. Install it in backend/.env, deploy, run an OCR request on synthetic sample text, then revoke the old key through the provider. The public documentation does not establish a stable menu path, so confirm the account UI before revocation.
2. SMTP_PASS: if SMTP_USER uses Gmail, open Google Account > Security > 2-Step Verification > App passwords, generate a replacement app password, install it in backend/.env and the deployment store, send a test message to an authorized test inbox, then remove the old app password from the same page. For another mail provider, use its equivalent app-password or credential page.
3. RECAPTCHA_SECRET_KEY and VITE_RECAPTCHA_SITE_KEY: open the reCAPTCHA Admin Console, select the site, inspect allowed domains, create or migrate to a replacement key pair according to the site's version, install both local and deployed values, verify a normal form challenge on deployed origin, then retire the old pair. Do not use production CAPTCHA calls for a speculative probe.
4. PHILSYS_API_ID, PHILSYS_API_SECRET, PHILSYS_QR_COOKIE, PHILSYS_PUBLIC_KEY: contact the PhilSys eVerify integration administrator or PSA support for reissue and overlap procedure. No public credential-rotation menu was verified. Install the replacements in backend/.env and the deployment store, test against the approved sandbox endpoint using synthetic identity material, then ask the issuer to revoke the old set.
5. DATABASE_URL: locate and update the deployed application's secret store before changing the PostgreSQL role password. In a low-traffic window, prepare a rollback command privately; set the new password using psql stdin, update local and deployed DATABASE_URL, restart, verify login and that the old password is rejected, then close the overlap. If deployment configuration is inaccessible, do not change the role password. No production password change was made by this run.
6. JWT_SECRET_KEY: generate a cryptographic replacement, install locally and in the deployed secret store, restart, verify a new login and token-protected request. Existing tokens signed with the old secret will expire immediately on cutover; plan the user-facing re-login.

Use scripts/set_secret.ps1 or scripts/set_secret.sh to write local ignored env files with hidden input. scripts/verify_secrets.ps1 and scripts/verify_secrets.sh print key names and PASS/FAIL only. A FAIL can mean that the provider has no safe read-only verification endpoint; complete the app-path verification above before any revoke. Never interpret mere presence in an env file as proof of a working credential.

History scanning found historical credential material in backend/.env, frontend/.env, backend/google-credentials.json, mobile_app/android/app/src/main/AndroidManifest.xml, and backend/logs/ocr_scans/scan_20260312_230125_411257.json. The latter was untracked locally and ignored; history still exists. No history rewrite is authorized. Coordinate provider-side revocation of historical keys after replacement is verified.

## 16 October 2026 tracked-file Gitleaks triage

| Gitleaks rule | Tracked path | Key type | Required action |
| --- | --- | --- | --- |
| `gcp-api-key` | `mobile_app/android/app/src/main/AndroidManifest.xml` | Google Maps Android client API key, potentially live | Rotate and restrict the replacement to the Android package, signing certificate, and required Maps APIs. Source its value from untracked local or CI build configuration, verify the new build, then revoke the old key. |

The manifest itself must remain tracked, so `git rm --cached` and `.gitignore` do not apply to that file. The key is not in `.gitleaksignore`. Removing its literal in an ordinary patch would repeat the old value in review output; coordinate a replacement that keeps it out of diffs and logs. No provider key was used in this triage.

The other 45 tracked-file findings were synthetic fixtures, placeholder/documentation examples, or generated analysis containing synthetic examples. Each confirmed false positive has an exact fingerprint and reason in `.gitleaksignore`; no file-wide or rule-wide exemption was added.
