# Predictive maintenance testing data — 29 October 2026

Status: implemented locally for noncommercial evaluation. No VPS deployment in this change.

The recorded asset queue remains usable before registry verification. A separate evaluation weather endpoint accepts scoped, recorded asset geometry, rounds the point to approximately a kilometer, and retrieves actual Open-Meteo precipitation and GloFAS regional river discharge forecasts. These are provider forecasts attached to unverified test records. No asset records are marked verified, and no provider forecasts are substituted for inspected defects or calibrated failure probabilities.

## Configuration

Set `PULSO_PREDICTIVE_TESTING=true` in backend/.env.local and restart the backend. It is enabled locally for this testing session. The default is disabled. The free provider service is for noncommercial evaluation, subject to attribution and usage limits: https://open-meteo.com/en/terms. Each process caches two calls per rounded area for one hour, including failures. Restart clears this transient cache. A multi-worker deployment needs a shared cache before enabling evaluation there.

## Available functions

- `GET /api/gov/predictive/testing/progress`: actual counts of scoped registry assets, locations, conditions, maintenance histories, recorded inspections, and reviewed inspections. Append `?export=true` for a rectangular UTF-8 BOM CSV with scope, units/counts, and timestamp.
- `GET /api/gov/predictive/testing/assets/{asset_id}/weather`: 72-hour precipitation and seven-day regional river discharge, with provider, units, source times, selected point, grid coordinates, expiry, and series. Append `?export=true` for the available source series as CSV.
- Both require authenticated maintenance viewing permission. Asset requests enforce jurisdiction. There is no registry verification prerequisite for testing context.
- Missing location, provider failure, and absent river coverage remain explicit. No zero is substituted for missing coverage. These results are never persisted into production hazard snapshots, training labels, or model assessments.
- Existing work order creation, production model release checks, and NOAH release checks continue using their established policies.

## Google options

Google Weather API provides current weather, up to 240 forecast hours, and 24 hours of hourly history: https://developers.google.com/maps/documentation/weather/overview. It needs a Cloud project, enabled API, billing/quota configuration, and an appropriately restricted server credential. No new Google API was enabled or billed in this change.

Google Flood Forecasting API provides river flood forecasts at no charge, with waitlist approval and an enabled Cloud project: https://developers.google.com/flood-forecasting. Check actual supported gauges/reaches near Caloocan after approval. Local drainage flooding is a separate problem from regional river discharge. Google Cloud Console itself is not an asset registry.

## Local evidence and validation

Local data inspection found 34 assets with geometry, condition and maintenance history; zero verified registry assets and zero inspection outcomes. Live provider requests succeeded for CAL-DR-176B. Values are time dependent and are displayed with their retrieval and forecast windows.

15 focused backend checks passed on a disposable PostGIS database, including opt-in behavior, missing coverage, cache isolation, unverified asset access, CSV, and permission denial. Frontend build, targeted ESLint, and Impeccable mechanical checks passed. Existing dependency deprecations and bundle-size notices remain.

Visual scope uses existing government sections, facts, details, buttons and tables. No visual tokens, navigation, or Figma artifacts were changed. A future material predictive layout change must inspect and reconcile the shared Figma file.
