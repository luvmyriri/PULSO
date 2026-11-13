# PULSO resident Android app

The debug APK bundles the resident PWA from the same React source. It uses the PWA's report, tracking, account, draft, camera, and location code. The wrapper supplies Android permissions, Back behavior, a native launch screen, and the local API address.

## Run the app locally

Use Node.js 22.12 or newer, Android Studio with its bundled JDK 21, Android SDK Platform 36, and Android SDK Platform-Tools. In Android Studio, use **Tools â†’ SDK Manager** to find the SDK and platform tools. If the tools are installed in a custom location, set `ANDROID_HOME` and `JAVA_HOME` before running the commands. Add the SDK's `platform-tools` folder to your terminal's PATH or call `adb` by its full path.

Start your configured PULSO backend on port 33159 with `PULSO_ENV=development`. The app build bundles the web files, so the Vite server is optional.

### USB phone

Enable USB debugging on the phone, connect it, and accept the debugging prompt. From the repository root:

```bash
cd frontend
npm ci
adb devices -l
adb reverse tcp:33159 tcp:33159
npm run app:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Open **PULSO** on the phone. `adb install -r` keeps settings and drafts when updating the same package signed with the same debug key. Re-run `adb reverse` after disconnecting or restarting the phone.

### Android emulator

Start an emulator in Android Studio. In the `frontend` directory, set the emulator's host address for this build:

```bash
VITE_API_BASE_URL=http://10.0.2.2:33159 npm run app:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The default USB APK can also run on the emulator with `adb reverse`. If multiple devices are connected, use `adb -s DEVICE_SERIAL` or `npm run app:run -- --target DEVICE_SERIAL`.

### Wi-Fi phone

Connect the phone and computer to the same private Wi-Fi network. Start the configured development backend from `backend` with `PULSO_ENV=development python -m uvicorn main:app --host 0.0.0.0 --port 33159`. In a second terminal, use Bash (Git Bash on Windows) from the repository root.

```bash
bash scripts/android-dev.sh
```

If several adapters are listed, pass the Wi-Fi IPv4 address as the first argument. Open the URL printed in the terminal, scan the QR on the Android phone, and tap **Download Android APK**. Open the downloaded APK and follow Android's installation prompt. Ports 4174 (download page) and 33159 (API) must be reachable on the private network. The QR page serves only the APK and its install instructions, and stops when you press Ctrl+C.

The Wi-Fi debug build targets API 36 to use Android's legacy local-network access on Android 17 while compiling with SDK 36. [Android local network permission](https://developer.android.com/privacy-and-security/local-network-permission)

To save a machine-local API address, put `VITE_API_BASE_URL` in the ignored `frontend/.env.android.local`. Use public browser configuration there if your local setup uses Google Maps, Google sign-in or reCAPTCHA. Keep backend credentials in the backend configuration.

## Other commands

| Command from `frontend` | Result |
| --- | --- |
| `npm run app:sync` | Builds the existing Vite app and syncs its files and plugins to Android |
| `npm run app:open` | Opens the Android project in Android Studio after sync |
| `npm run app:run` | Builds, syncs and runs on a connected device |
| `npm run app:lan-ip` | Lists private network IPv4 addresses |

The build generates the debug network allowlist for loopback, the emulator, and the specific LAN host selected for that build. The APK uses `https://localhost` for its bundled WebView and permits HTTP for those local targets. The API's development CORS settings cover requests and images from the native origin. The native app skips PWA service-worker registration, while browser builds keep it.

The app's version is maintained in `version.properties` and read by Settings â†’ About PULSO. The adaptive launcher artwork was generated with Capacitor Assets from `frontend/public/pulso-loading-mark.png`. Android supplies runtime permission prompts, and residents take photos inside the existing PULSO camera screen.

## Signed public test builds

The public installer bundles the same resident source and uses the deployed HTTPS API. It needs no Android Studio, USB cable or PC Wi-Fi connection on the resident's device. Android still requires the resident to approve installation of the downloaded APK. APK distribution is Android-only; iPhone users can use the website.

A maintainer builds with `npm run app:apk-public` using `VITE_API_BASE_URL` set to the public HTTPS origin and a persistent signing keystore. Signing settings are supplied through `PULSO_ANDROID_KEYSTORE`, `PULSO_ANDROID_KEY_ALIAS`, `PULSO_ANDROID_STORE_PASSWORD` and `PULSO_ANDROID_KEY_PASSWORD`. Never commit these values or include the key in source archives. The Docker builder in `deploy/production/android-builder.Dockerfile` supplies Java 21 and SDK 36 without requiring Android Studio on this PC.

Public builds disable cleartext traffic, mixed content and WebView debugging. Backend CORS must explicitly allow the bundled `https://localhost` origin. Production CAPTCHA and authentication checks remain enabled. Preserve the signing key for compatible updates; an older locally signed debug build may use a different signing identity. Do not uninstall it automatically or discard unsent drafts.

The landing page checks the published package metadata before offering the APK. Its QR links to `/api/mobile/app-updates/download`, which serves only a complete published package. Missing or invalid metadata shows a mobile-website fallback and a retry option. The API reads the APK folder from `PULSO_ANDROID_UPDATE_DIRECTORY`; publication writes the APK first and `latest.json` last. A manifest includes the package ID, version, byte length and SHA-256.

See `docs/integration/production-relogic-android-release-2026-11-12.md` for the deployed release and device acceptance limits.
