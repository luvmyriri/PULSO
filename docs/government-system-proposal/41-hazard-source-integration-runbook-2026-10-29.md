# Flood and weather source integration for maintenance

**Status:** Implemented in repository; provider activation and production release pending data-use authority. **Date:** 29 October 2026. This adds to [40 — Predictive maintenance implementation](40-predictive-maintenance-implementation-runbook-2026-10-29.md). The live VPS and official provider entitlements have not been inspected in this task.

Static UP NOAH return-period map exposure is handled separately in [42 — NOAH flood exposure integration](42-noah-flood-exposure-integration-2026-10-29.md).

## What the API actually provides

| Signal | Source and meaning | Operational boundary |
|---|---|---|
| Forecast rain over 72 hours, mm | [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs), hourly precipitation summed from the forecast available when fetched. | Grid forecast for a verified barangay representative point; not a rain gauge, water depth, or observed street flood. The provider does not supply a fixed source-run timestamp in this response, so PULSO records retrieval and valid times separately. |
| Maximum modeled river discharge over seven days, m³/s | [Open-Meteo Flood API](https://open-meteo.com/en/docs/flood-api), with the explicit `forecast_v4` GloFAS model at roughly 5 km resolution. | Regional river context only. The provider warns the closest river may be selected incorrectly. Do not turn it into a local drain failure, barangay flood alert, or asset-level flood probability. |
| Official flood bulletin | [PAGASA Flood Information](https://www.pagasa.dost.gov.ph/flood) remains the official warning reference. | A stable machine-readable and licensed Caloocan-relevant bulletin contract has not been established here. Do not scrape the public page or call an undocumented endpoint. Emergency decisions follow the official warning process. |
| Hazard map | [GeoRiskPH account terms](https://georisk.gov.ph/request-for-account/requirements) describe MOA and training for advanced access. | No GeoRiskPH layer or service is ingested until the LGU has access and redistribution terms for a specified dataset/version. |

The [Open-Meteo pricing page](https://open-meteo.com/en/pricing) states the free tier is for evaluation/prototyping and that commercial use needs a subscription and customer endpoint. PULSO's production adapter calls fixed `customer-api.open-meteo.com` and `customer-flood-api.open-meteo.com` hosts only when all three settings are present: `PULSO_HAZARD_FEED_ENABLED=true`, `PULSO_OPEN_METEO_API_KEY`, and `PULSO_HAZARD_LICENSE_REFERENCE`. The key stays server-side and is neither stored in snapshots nor returned by the API. The LGU must confirm the applicable procurement/data-use terms before enabling it.

## Data flow and model boundary

1. The worker selects barangays with **verified** assets and geometry. It uses the official barangay polygon point when present, otherwise a verified asset point. It fetches both licensed products, validates units, time coverage, nonnegative finite values, and source-grid distance, then writes immutable `hazard_source_snapshots` and a run-health record. Missing or malformed source data is a named failed signal, not zero rain or zero flood risk.
2. `/api/gov/predictive/production/assets/{asset_id}/hazards` applies the same server-side asset scope as the maintenance record. The docket shows current, stale, disabled, and unavailable signals with source, times, units, grid resolution, and limitations. Its `.csv` endpoint exports the same scoped signals with provenance and safe spreadsheet cells. This is contextual evidence; it cannot create or reprioritize work automatically.
3. The offline outcome model takes the two source values **as they were available when a verified no-defect baseline was reviewed**. It cannot backfill today's forecast into an older training row. `minimum_hazard_coverage` in the signed release policy must be at least `0.8` in each forward split. The final holdout also compares the same model with and without these two inputs; `minimum_hazard_incremental_precision` must be positive and pre-registered. A current asset without both as-of baseline snapshots abstains from model scoring. Weather and regional river signal usefulness must pass those gates before any percentage is published.
4. These forecasts are separate from actual local flood observations. Confirmed inundation, drain blockage, overtopping, work intervention, and independent inspection findings need their own sourced records. PAGASA warnings and emergency procedures remain authoritative for action.

## Activate and verify

- Apply additive Alembic revision `21e5f6a7b8c9` after backup and restore rehearsal; check the schema inventory. Keep the feed disabled while the data-use agreement, approved area selection, and field comparison are pending.
- Configure the restricted provider key and license reference in `/opt/pulso/shared/backend.env`, enable the feed, and restart the predictive worker. The worker needs outbound HTTPS and private database access; the API only reads saved snapshots. Monitor the ingestion run and per-asset stale states. Do not place the key in the frontend build or logs.
- Compare several forecast grid points with real Caloocan observations and drainage/river geography. If GloFAS does not identify a relevant river at a location, keep that signal out of local decisions; the adapter can be disabled without losing the asset/inspection ledger.
- A production model release still needs historical **forecast snapshots captured as of their original availability**, independently reviewed defects and no-defect follow-up, pre-registered thresholds, and forward validation. Reanalysis fetched now is not a replacement for an archived forecast that staff could have seen at an earlier date. On failure, show recorded condition and inspection duties with a stale/unavailable source status.

## Remaining work

Official PAGASA/GeoRiskPH access, Caloocan sensor and rainfall-gauge data, observed flood-event and asset-intervention ledgers, spatial calibration, model ablation, incident alerts, and LGU acceptance are not supplied. The code does not claim that citywide flood forecasting or flood-driven maintenance prediction has been validated.
