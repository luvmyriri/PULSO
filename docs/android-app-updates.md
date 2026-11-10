# Resident Android APK updates

Implemented for the current LAN development APK. The web experience has no updater control.

Residents can select the outlined **App update** button on the mobile landing footer or **Check for updates** in **Account → About PULSO**. A shared bottom sheet checks the installed package/build against `GET /api/mobile/app-updates/latest`. It offers **Download update** only for a higher build of the same package. Selecting it first shows **Update PULSO?**, with **Not now** and **Update now**. Focus starts on Not now; cancelling or pressing Android Back does not open a download. Only Update now opens the phone browser; the resident then opens the downloaded APK and confirms Android's installation prompt. Android may request permission for the browser to install downloaded apps. This is not a silent installer. No uninstall, storage clearing, or onboarding reset is performed.

The sheet preserves English/Filipino and light/dark parity. It announces checking/current/available/unavailable states, times out after 10 seconds, allows retry, and retains the shared sheet's focus return, scrim, handle and Android Back dismissal. Download handoff is not reported as installation success. Updating is manually initiated, so it does not interrupt report entry or camera capture.

## Building and publishing

Run `npm run app:apk` from `frontend` with the existing `VITE_API_BASE_URL` LAN setting. The build script increments `android/version.properties` above the last built or published version. After Gradle succeeds it copies the complete APK to ignored `frontend/android/updates/pulso-<versionCode>.apk`, hashes it, then atomically publishes `latest.json`. The backend distributes that immutable build; an old download request returns a conflict after a newer build is published, prompting another check. Failed builds never advance the published manifest.

Retain application ID `ph.gov.caloocan.pulso` and the existing signing key. Current builds use the existing Android debug signing configuration. Keep that key when building on another computer; a different key cannot update an installed copy. This LAN workflow is not Play Store distribution or a production release/signing service. The phone must reach the same API server used by its installed build.

Install the first APK containing this updater over the existing app once. Subsequent builds are discoverable through its button. Update both worktrees with the same source/version and copy the published APK/manifest when serving from the secondary worktree. Never place APKs in Vite's `public` folder, which would bundle them recursively.

Figma: this change reuses the existing bottom-sheet and utility-button pattern; no Figma changes were made. Live-file reconciliation remains pending access.
