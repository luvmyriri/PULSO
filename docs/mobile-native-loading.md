# Native loading appearance

The native React loader follows the app's resolved appearance instead of forcing dark mode. Saved light/dark choices override the device appearance; system mode follows live device changes. Background, wordmark, secondary copy and spinner have paired colors. The document's color scheme also updates with theme changes so native controls do not retain an old appearance.

The brief Android starting window uses day/night launch resources and matching system-icon contrast. Once the bundled app renders, its saved app appearance takes over. Platform force-dark recoloring is disabled; the splash plugin does not override the resource background with a hard-coded light fill. The first HTML loader uses the same light/dark background colors as React.

`data-native-splash` enables edge-to-edge system bars only while the native loader is present. Its opaque themed background extends behind transparent status/navigation bars, while content respects published native safe insets. System icons remain visible and receive contrast from the existing native appearance controller. When loading ends, the destination restores its existing bar/inset policy. Startup timing, bundled/offline behavior and preview overrides remain unchanged.

`frontend/tests/native-loading.browser.mjs` holds the native splash handshake to inspect the real compiled loader. It verifies opposite app/device appearances, both system modes, live device-theme changes, foreground contrast, safe padding, edge-to-edge requests and restoration on dashboard entry with synthetic bridge/API responses. Android resource compilation and APK signing are checked separately. This is not a claim of physical-device verification. No Figma changes were made; live-file reconciliation remains pending access.
