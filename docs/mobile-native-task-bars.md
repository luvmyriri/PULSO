# Native report and map system bars

Implemented for the installed Android app: Quick Report and Community Map fill the window behind transparent status and navigation bars. Their existing header surfaces continue beneath the status icons. Published Android safe insets keep controls outside the status, gesture and three-button navigation areas; keyboard handling remains owned by the native shell.

The appearance controller uses the active task surface for system-icon contrast, so scrolling orange buttons cannot recolor the status bar. A full-screen photo supplies its own dark surface, while the camera retains priority for immersive mode. Closing a task restores the destination's existing bar policy.

The map's floating **Exit fullscreen** pill is omitted in the APK. The existing header viewing toggle and back action remain available. Browser and standalone-preview behavior is unchanged.

Validation: compiled-app browser checks with synthetic native/API responses cover light English at 390 px and dark Filipino at 320 px, safe top/bottom spacing, task opening/closing, header toggle availability and absence of the floating pill. Loading-theme and camera-immersion checks also pass. Map-provider loading is simulated; these checks do not verify live map tiles or physical-device rendering. The signed APK is built separately. This targeted correction reuses existing layouts; no Figma changes are claimed, and live-file reconciliation remains pending access.
