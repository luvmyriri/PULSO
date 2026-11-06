# PULSO resident Android app

The debug APK bundles the resident PWA from the same React source. It uses the PWA's report, tracking, account, draft, camera, and location code. The wrapper supplies Android permissions, Back behavior, a native launch screen, and the local API address.

## Run the app locally

Use Node.js 22.12 or newer, Android Studio with its bundled JDK 21, Android SDK Platform 37.0, and Android SDK Platform-Tools. In Android Studio, use **Tools → SDK Manager** to find the SDK and platform tools. If the tools are installed in a custom location, set `ANDROID_HOME` and `JAVA_HOME` before running the commands. Add the SDK's `platform-tools` folder to your terminal's PATH or call `adb` by its full path.

Start your configured PULSO backend on port 33159 with `PULSO_ENV=development`. The app build bundles the web files, so the Vite server is optional.

### USB phone

Enable USB debugging on the phone, connect it, and accept the debugging prompt. From the repository root:

```powershell
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

```powershell
$env:VITE_API_BASE_URL = 'http://10.0.2.2:33159'
npm run app:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
Remove-Item Env:VITE_API_BASE_URL
```

The default USB APK can also run on the emulator with `adb reverse`. If multiple devices are connected, use `adb -s DEVICE_SERIAL` or `npm run app:run -- --target DEVICE_SERIAL`.

### Wi-Fi phone

Keep the phone and computer on the same private network. Run `npm run app:lan-ip` in `frontend` to find the computer's IPv4 address. Use the active Wi-Fi or Ethernet adapter's address. For this case, start the backend with `--host 0.0.0.0 --port 33159` and allow port 33159 in the computer's firewall for the private network.

Use USB on Android 17. Android 17 requires a separate permission for LAN connections from an app targeting API 37, and this build requests only the permissions used by the existing resident workflow. [Android local network permission](https://developer.android.com/privacy-and-security/local-network-permission)

```powershell
$env:VITE_API_BASE_URL = 'http://192.168.1.20:33159' # Replace with your computer's address
npm run app:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
Remove-Item Env:VITE_API_BASE_URL
```

On macOS or Linux, use `VITE_API_BASE_URL=http://10.0.2.2:33159 npm run app:apk` to override the address for a single command. To save a machine-local setting, put `VITE_API_BASE_URL` in the ignored `frontend/.env.android.local`. Use public browser configuration there if your local setup uses Google Maps, Google sign-in or reCAPTCHA. Keep backend credentials in the backend configuration.

## Other commands

| Command from `frontend` | Result |
| --- | --- |
| `npm run app:sync` | Builds the existing Vite app and syncs its files and plugins to Android |
| `npm run app:open` | Opens the Android project in Android Studio after sync |
| `npm run app:run` | Builds, syncs and runs on a connected device |
| `npm run app:lan-ip` | Lists private network IPv4 addresses |

The build generates the debug network allowlist for loopback, the emulator, and the specific LAN host selected for that build. The APK uses `https://localhost` for its bundled WebView and permits HTTP for those local targets. The API's development CORS settings cover requests and images from the native origin. The native app skips PWA service-worker registration, while browser builds keep it.

The app's version is maintained in `app/build.gradle` and read by Settings → About PULSO. The adaptive launcher artwork was generated with Capacitor Assets from `frontend/public/caloocan-seal-large.png`. Android supplies runtime permission prompts, and residents take photos inside the existing PULSO camera screen.
