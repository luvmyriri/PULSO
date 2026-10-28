# Google Maps address privacy update

Status: implemented in the working tree; not deployed. Owner: PULSO maintainers. Validated: 2026-10-28 (Asia/Manila).

## What was inspected

The supplied screenshot matches `frontend/src/components/QuickReportWizardModal.jsx`. This checkout uses React/Vite JavaScript and a Python/FastAPI backend. No PHP or database files were invented, and no database migration is needed.

| Existing responsibility | Observed implementation | Result of this change |
| --- | --- | --- |
| Device location | `ResidentDashboard.jsx`: `requestDeviceLocation`, `acceptDevicePosition`, `startDeviceLocationTracking`; browser `getCurrentPosition` and `watchPosition` | Preserved, including automatic acquisition when Quick Report opens, high-accuracy/network fallback, movement threshold and watch cleanup. Explicit retry also retries an address lookup at the same point. |
| Camera-first report location | `Step2CameraLocation.jsx`: automatic `getCurrentPosition` | GPS commits before address retrieval. Async address responses are checked against the current request/coordinates. |
| Map/marker/recentering | `Step2LocationMap.jsx`: existing `GoogleMap`, `MarkerF`, `panTo`, initial zoom 15 and GPS/search zoom 16 | Coordinates, map options, marker dragging, click selection, recentering and zoom retained. Address lookup cannot prevent GPS selection. |
| Reverse geocoding | `backend/maps_service.py` and `/api/geocode/reverse`; additional lookups and external fallbacks in the dashboard/Quick Report | One shared Google-only lookup service. Server first, existing browser Geocoder as fallback. Concurrent identical lookups share a promise; map clicks debounce 400 ms. No settled-result cache. |
| Address display | Old formatter combined full formatted strings, premise/house/block/lot values and precise Plus Codes, with default city/postal values | Separate `locationPrivacy.js` display boundary; the legacy registry/formatter file is retained for existing consumers. |

## Exact production filenames

New files:

- `backend/address_privacy.py`
- `frontend/src/utils/locationPrivacy.js`
- `frontend/src/utils/reverseGeocode.js`
- `frontend/src/utils/openLocationCode.js`
- `frontend/src/components/maps/LocationAddressPanel.jsx`
- `frontend/src/components/maps/LocationCoordinates.jsx`

Updated files (including the existing, previously untracked camera/location step):

- `backend/main.py`
- `backend/maps_service.py`
- `frontend/src/pages/ResidentDashboard.jsx`
- `frontend/src/pages/PublicTrackPage.jsx`
- `frontend/src/components/QuickReportWizardModal.jsx`
- `frontend/src/components/NearbyIssuesMapModal.jsx`
- `frontend/src/components/IDCameraModal.jsx`
- `frontend/src/components/LatestReportCard.jsx`
- `frontend/src/components/ReportHistoryCard.jsx`
- `frontend/src/components/ReportDetailView.jsx`
- `frontend/src/components/report-wizard/Step2CameraLocation.jsx`
- `frontend/src/components/report-wizard/Step2LocationMap.jsx`
- `frontend/src/utils/watermark.js`
- `frontend/src/locales/en.json`
- `frontend/src/locales/tl.json`

Regression files:

- `backend/tests/test_address_privacy.py`
- `frontend/tests/location-privacy.test.mjs`
- `frontend/tests/location-privacy.browser.mjs`
- `frontend/tests/report-details-render.test.mjs`

The complete-file delivery also includes the existing `frontend/src/components/camera/CameraTopBar.jsx` and `CameraZoomControls.jsx` dependencies used by the relocated top-bar zoom presets.

The chat's `complete-code.md` artifact contains the entire contents of every file listed above. Its `complete-code.zip` artifact contains the same complete source files in their repository paths, plus this guide and screenshots. Delivery artifacts are stored outside the website document root; use the links in the chat. These are snapshots of the current checkout, including preexisting uncommitted work in those files; review before copying onto a different checkout. They are not isolated snippets. Environment files, secrets, dependencies and database data are excluded.

## Address contract and privacy

The backend and browser parsers inspect address components across all returned Google results. `route` supplies street/road and `postal_code` supplies postal code. Locality/postal-town components supply city when they are not explicitly a barangay or subdivision. A named city/municipality at another administrative level is a fallback. The first administrative level supplies region. Province and country are excluded from the display contract, including existing data that still contains them. Missing values stay empty.

Barangay identification requires an explicit Barangay/Brgy/Bgy label on an eligible component. A neighborhood or administrative level is not automatically a barangay. Village/subdivision names require a recognizable community label; an arbitrary `premise` is not assumed to be a subdivision, and `subpremise` is never displayed. Ambiguous labels are omitted rather than guessed. Existing reporting jurisdiction/boundary logic is separate and preserved.

The display allowlist excludes `street_number`, `subpremise`, room/floor and postal suffix components, and never uses Google's `formatted_address`. House/block/lot/unit/apartment/building identifiers, composite/private labels, raw coordinate strings, HTML-like values and suspicious number-prefixed labels are rejected as whole fields. Legacy saved strings receive stricter recognition because they lack component types; some untyped legacy street labels may therefore be omitted. React renders values as text nodes, which escapes address data; no `innerHTML` is used.

Nonempty, deduplicated values are joined by commas in one bold address paragraph, with extra emphasis on the Plus Code, matching the watermark's address presentation and wrapping naturally on narrow screens. The eight permitted address fields, in order, are Plus Code, village/subdivision, neighborhood/community, street/road, barangay, city/municipality, postal code and region. Field labels are not displayed. The explanatory privacy and source paragraphs have been removed. Latitude, longitude, a button to copy both numbers, and the GPS accuracy badge share one compact row underneath. The row stays unbroken and can scroll horizontally on very narrow screens. Copy success is announced only after the clipboard write succeeds; failure leaves the coordinates selectable.

Following the user's request for an accurate short Plus Code, each selected/GPS coordinate pair is encoded locally using eleven significant Open Location Code digits. The four-character global prefix is omitted in the visible code, leaving four characters before `+` and three after it. The city/address and coordinate row provide context for this short form. The example supplied by the user is not hardcoded. Google address lookup failure does not prevent code generation. Existing padded coarse area codes are not passed off as precise point codes. The frontend and backend encoder tests use official [Google encoding vectors](https://github.com/google/open-location-code/blob/main/test_data/encoding.csv) and the [Open Location Code specification](https://github.com/google/open-location-code/blob/main/Documentation/Specification/specification.md).

House, block, lot and unit identifiers remain filtered. The user's later requests explicitly enable precise short Plus Codes and visible latitude/longitude, including a coordinate line in the live and saved photo watermarks. These are precise location metadata; omitting the global code prefix does not reduce precision. Code precision does not improve GPS measurement accuracy: the badge continues to show actual reported device accuracy. Existing raster photos are not rewritten. Existing server authorization and public-report serialization remain the authority for what is shared publicly.

The camera's 1×/2×/3× controls now sit in the top bar. Hardware/software zoom and image capture are unchanged. The resident report-details activity card was removed; timeline loading still supports the existing information-request reply flow. The shared `Clock` icon import remains because the pending/in-progress status banners still use it, and all report status branches have a render regression check.

The reverse endpoint retains `address`, `lat` and `lng` for compatibility and adds `structuredAddress` and `status`. Its response uses `Cache-Control: no-store`; frontend requests also use `cache: no-store`. Server secrets stay server-side. The lookup service itself does not persist responses. The dashboard removes its old session-storage address/Plus Code cache instead of writing new entries. The existing reporting draft and submission mechanisms still retain selected location data, now including safe structured display fields; review their retention against the app's privacy and Google usage policies.

## Google Cloud setup

1. Keep the current Google Cloud project and existing key configuration. Enable **Maps JavaScript API** and **Geocoding API** in the project. Keep existing Places/Geometry configuration as currently used. The JavaScript Geocoder requires Geocoding API to be enabled in the same project as Maps JavaScript API: [Google's Geocoding service setup](https://developers.google.com/maps/documentation/javascript/geocoding).
2. Ensure billing and quotas are configured for that project. Check Geocoding API metrics when diagnosing `REQUEST_DENIED`, quota errors or service availability. No Cloud settings were changed by this repository update.
3. Continue using `VITE_GOOGLE_MAPS_API_KEY` for the existing browser loader and `GOOGLE_MAPS_API_KEY` for the existing backend proxy. The `VITE_` value is public browser configuration; never place a server secret there. Do not paste either key into this guide, source files, screenshots or commits.
4. Restrict the browser key by the site's allowed HTTP referrers and required APIs. Restrict the server key by server egress IP and only its required APIs. Preserve separate browser/server keys if already configured. A single key cannot safely use both incompatible application restriction types; review an existing shared-key setup against Google's [API security guidance](https://developers.google.com/maps/api-security-best-practices).
5. Serve production pages over HTTPS. Browser geolocation also requires the user's permission and operating-system location access. `localhost` is useful for local testing; an ordinary HTTP LAN address may not qualify as a secure context.
6. Keep Google's built-in map attribution visible. The address panel's extra source paragraph was removed at the user's request. Review the app's published Terms of Use, Privacy Policy and existing retention practices against Google's [Geocoding policies and attribution requirements](https://developers.google.com/maps/documentation/geocoding/policies). The new shared service uses in-flight deduplication rather than a persistent geocoding cache.

## Integrate

The files are already updated in this working tree. For another copy of the same version, back up the listed files, review the complete-file snapshot, and copy the files to their identical repository paths. Do not replace unrelated work with this snapshot blindly. Keep your existing environment files and dependencies.

Restart the existing FastAPI backend using your normal project command so the new helper and endpoint response load. From `frontend`, run `npm run build`, then use the normal PULSO serving/deployment process. No new mapping library or production dependency is required. This work does not deploy or restart your production services.

## Tests and acceptance

Automated commands:

```powershell
# From frontend
node --test tests/*.test.mjs
npx eslint src/utils/locationPrivacy.js src/utils/reverseGeocode.js src/components/maps/LocationAddressPanel.jsx
npm run build

# From backend
python -m unittest discover -s tests -p test_address_privacy.py -v
```

The optional browser test needs Playwright and an installed browser. It uses test doubles for Google Maps, GPS and API responses, with no real keys or Google requests. In this environment, the bundled Playwright module and installed Chrome are used:

```powershell
# From frontend; replace the path if your Playwright installation differs.
$env:PLAYWRIGHT_MODULE_PATH = 'C:/Users/Gene/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_CHANNEL = 'chrome'
node tests/location-privacy.browser.mjs
```

The browser test verifies the shipped components' GPS-driven `panTo`/zoom calls, selected marker retention after lookup failure and denied permission, no rerender request loop, stale-response rejection after pin movement, and the camera-first automatic GPS flow. Screenshots in `evidence/` use synthetic data, including 320 px English/Filipino panels in both themes and the Quick Report modal. They are not live Google/device verification.

Validation covers the address privacy/precision contract, official Plus Code encoding vectors, coordinate copying, status-card rendering, GPS continuity, stale-response rejection, top-bar zoom placement and the actual live watermark painter using a synthetic camera. Build output retains the project's existing large-bundle advisory. See the command output recorded in the chat for final counts and status.

Manual checks in the running site:

1. Allow location and open Quick Report. Confirm automatic device detection and the existing map recentering/marker/zoom behavior. The displayed address must correspond to the selected point, not a default map center.
2. Use several genuine issue locations, including a location outside Metro Manila. Compare available components in the Google response privately in DevTools. Missing fields must disappear without a fabricated postal code or city. Province and country must remain absent even when Google returns them. Do not copy private response payloads into public tickets/screenshots.
3. Deny location permission; disable OS location; simulate timeout/unavailable GPS. Confirm recovery controls remain usable and a prior selected location is retained. Restore permission and retry.
4. Block `/api/geocode/reverse`; test a successful existing browser Geocoder fallback. Then block both provider paths or use an invalid restricted test key. GPS and the map must still work, while the address panel explains unavailability. `ZERO_RESULTS` and quota statuses must not cause a retry loop.
5. Move the pin rapidly and use GPS repeatedly. The latest selected coordinates must win, and old addresses must not reappear. In DevTools, verify only Google/backend services receive coordinates and simultaneous identical lookups share one request.
6. Copy the visible address and the separate coordinate pair, open a nearby marker popup, review a saved report, and capture a new evidence photo. Check that house, block, lot, unit and raw formatted-address strings remain omitted. Verify that the precise short Plus Code changes with the selected coordinates, and that latitude/longitude are visible on the live and captured watermarks as requested.
7. Check keyboard order, the visible 3 px focus treatment on the new copy controls, 44 px copy targets, text selection, screen-reader names/address reading, loading/error announcements, light/dark parity and English/Filipino content. Reflow at 320 px and 200% zoom; check long addresses. The new panel introduces no animation and remains readable in forced colors.

Known verification boundary: live API restrictions, Cloud enablement/billing, actual GPS accuracy, live Google component coverage, screen-reader operation and forced-colors behavior require the running site/device. Automated tests use synthetic provider responses.

## Figma/design status

Impeccable and PULSO frontend guidance were read. The existing panel surfaces and theme classes were reused. The required shared Figma file session was attempted and returned an access denial; no Figma write or validation is claimed. Next design action: a file editor should reconcile `LocationAddressPanel` and the bilingual/state annotations with the resident reporting template in the shared library. No new visual direction, lifecycle or permission model was adopted.
