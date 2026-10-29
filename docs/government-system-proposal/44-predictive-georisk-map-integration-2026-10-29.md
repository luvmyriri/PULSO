# Predictive infrastructure hazard map — 29 October 2026

Status: implemented locally for testing. No VPS deployment in this change.

## User contract

Predictive maintenance uses the same Caloocan city/barangay boundary component and map styling as Reports. The predictive map renders scoped infrastructure asset markers and selected asset geometry. It does not fetch report-map records or render report pins. Existing queue filters, asset detail, history, weather and work order actions remain. An explicit related-reports link still opens the Reports map for a separate investigation.

The map shows filtered assets, including unverified registry candidates. Select a marker or use the asset table. Clicking a barangay outline sets the existing barangay filter. Hazard selection persists in the `hazard` URL parameter. Fit assets frames filtered asset geometry. Opacity can be adjusted independently of selection. The list and recorded coordinates remain usable when the map fails.

## Source services verified directly

Base: https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/

| Layer | Agency | Service |
| --- | --- | --- |
| Flood susceptibility | MGB | MGBPublic/Flood/MapServer |
| Rain-induced landslide susceptibility | MGB | MGBPublic/RainInducedLandslide/MapServer |
| Active faults | PHIVOLCS | PHIVOLCSPublic/ActiveFault/MapServer |
| Liquefaction susceptibility | PHIVOLCS | PHIVOLCSPublic/Liquefaction/MapServer |

All four returned valid map exports and legends during local testing. These services do not publish a dataset revision date in the inspected metadata. Source dates are displayed as unknown. Fetch/load time is not a dataset update date.

Flood, landslide and active fault services expose map capabilities without feature identify access. Liquefaction also advertises Query/Data. This implementation consistently uses map images and does not infer asset hazard categories from pixel colors. No shading/blank response is not a safety classification. Source colors and legend labels are preserved. Earthquake context is fault traces and liquefaction susceptibility, not earthquake timing or magnitude prediction. Other mapped hazards and assessment are accessible through https://hazardhunter.georisk.gov.ph/.

## Backend and geometry

`GET /api/gov/predictive/hazard-layers` lists the allowlisted sources. `/{id}/legend` supplies published legend symbols. `/{id}/map` accepts a bounded Caloocan-area extent and returns an image and its actual geographic bounds. ArcGIS adjusts the image extent to its aspect ratio, so the returned extent is required for alignment. Arbitrary upstream service URLs and redirected image hosts are rejected. Upstream errors remain explicit and stale overlays are cleared on viewport/layer changes.

Endpoints require official authentication and maintenance viewing permission. Registry geometry in `/health` uses the same server jurisdiction scope as the maintenance queue. Provider fetches are bounded, timed out, and cached for an hour with a fixed cache size. These are read-only planning layers; no asset status, report, model input or work order is created by viewing them.

## Validation and design status

17 focused backend checks passed on a disposable PostGIS database. New checks cover permission denial, source allowlisting, request extent limits, corrected image extent, and scoped unverified registry geometry. Frontend build, targeted ESLint and mechanical design scan passed. Existing deprecation and bundle-size warnings remain. Desktop and 320px map/control rendering were inspected in the local in-app browser.

The Figma plugin was discovered but is not installed. Implementation reuses existing Reports primitives. No Figma write or validation is claimed. Next Figma action: inspect the government reviewer-final reference and add the predictive hazard selector, source legend and failure annotations as reusable map variants when the connector is available.

## Queue visibility correction

The initial always-visible map pushed the maintenance table below the viewport. Corrected the default to Table View, using the same view switch as Reports with an accessible Maintenance view label. Map View is explicitly selected with `display=map`; filters, hazard selection, selected asset and draft inputs remain in the current route state. The map replaces the queue pane while the same asset detail remains alongside it. Data progress and model availability are preserved in a collapsed section below the primary workspace. The map height is bounded and its source legend is collapsed initially. This supersedes the initial above-table map composition described earlier.

Verified the restored table, pagination and selected asset detail in the local browser, and switched to the hazard map and back with the asset selection retained. Frontend build, targeted ESLint and mechanical design scan passed. No backend logic changed for this correction.

## City clipping, automatic fit and loading performance

Hazard exports are now masked with the same versioned North and South city reference geometries used by Reports outlines. Outside-city pixels and polygon holes are transparent. Original source alpha is preserved. The browser verifies the boundary digest before displaying a layer and fails visibly if boundary versions differ.

Each layer is requested for the fixed city extent at a bounded 1600-pixel maximum dimension. Pan, zoom, record selection and asset filters reuse that image. Browser promise caching deduplicates in-flight requests and retains successful layers for one hour; failures are evicted. The server caches the finished clipped render for one hour, avoiding repeated provider calls and raster processing. The first load remains dependent on GeoRiskPH availability. This city-wide raster is planning context, not a parcel-scale hazard assessment.

The map automatically fits filtered asset geometry on entry and scope changes. Selecting a record no longer replaces the overview with a single-asset zoom. Manual pan/zoom stays put during routine form edits and layer changes. One located asset uses zoom 16; no located assets fall back to the city outline. Default hazard opacity is 30%, retaining the existing adjustment control.

Validation: 18 backend checks passed, including exterior transparency, polygon holes, separated sectors, preserved alpha, and finished-render cache reuse. Frontend build, targeted lint and design scan passed. Local HTTP cold/warm measurements for the four layers were faults 1836/14 ms, flood 2492/10 ms, landslide 1965/6 ms, and liquefaction 2225/8 ms. These are local measurements, not an external service guarantee.

Browser verification confirmed exterior transparency with the flood layer and all 21 filtered assets fitted in the overview. The map pane now scrolls its supporting source content independently on wide screens, and its map height stays within the available workspace. A resize observer fits assets after the actual map pane size is established. The map initializes its center/zoom once, avoiding controlled default props interfering with later fitting or manual navigation.

## Hazard coverage feedback

The public services can return a successful transparent image. A successful HTTP response therefore does not mean that visible hazard features exist in the current city or asset view. The server now measures the clipped image alpha channel and reports visible feature extents for each city sector. These are raster display extents, not completeness claims, hazard absence findings or asset exposure classifications.

The current city render returned flood shading in both sectors, sparse landslide shading in North, liquefaction shading in South, and no visible active fault traces inside either city sector at the requested map scale. This explains why layers can appear inactive over the North Caloocan asset cohort. Upstream errors continue to be represented as errors.

The UI now presents a distinct no-visible-features state above the map. Layers with visible content identify which sectors have returned pixels and provide View mapped areas to navigate to the source feature extent. Fit assets still restores the filtered asset overview. No layers or existing functions were removed.

19 backend checks passed, including explicit blank-source and South-only coverage cases. Frontend build, targeted ESLint and the design scan passed.
