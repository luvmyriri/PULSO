# UP NOAH flood-map exposure for verified infrastructure assets

**Status:** Repository implementation ready for source review; no approved release or Caloocan exposure is active. **Date:** 29 October 2026. This supplements [41 — Flood and weather sources](41-hazard-source-integration-runbook-2026-10-29.md). This task did not inspect the live VPS or activate a release.

## Source decision

The [UP NOAH site](https://noah.up.edu.ph/) provides the public map experience. The older [third-party PHP wrapper](https://github.com/ridvanbaluyos/noah) is not the production data contract for PULSO; its methods refer to historical endpoints and their present availability is unverified. The [BetterGov.PH redistribution](https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps) provides the concrete files used here. Its [flood metadata](https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/blob/main/Flood/metadata_flood.txt) defines `Var=1/2/3` and WGS 84. Its bundled [NOAH license](https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/blob/main/NOAH_License.pdf) states ODbL 1.0, attribution and share-alike. An LGU data steward must record how derived asset exposure is governed before activation.

These are **static mapped hazard scenarios** for 5-, 25-, and 100-year rainfall return periods. `Var` is a hazard class considering depth and velocity. It is not a current flood, a measured depth at an asset, an annual asset-failure probability, or an official warning. A missing polygon match is **unclassified**, not low risk or safe. Forecast rain and regional GloFAS discharge remain separate time-stamped signals; PAGASA warnings and verified field observations govern actual events.

## Pinned source contract

Source revision: `6a2237939a07540b9f3103b04141d37adc665ff3` from BetterGov.PH's dataset repository. Obtain these exact Metro Manila ZIP files into operator-controlled storage; do not commit them to PULSO:

| Scenario | Repository path | SHA-256 |
|---|---|---|
| 5 years | `Flood/5yr/MetroManila.zip` | `99bb769db123c574d8190b4316150f72c818a6bb3dacdb1d0b609f28e960e7f9` |
| 25 years | `Flood/25yr/MetroManila.zip` | `b5354166cce55f21ebaeaad72ce8d86f6d3f7092fb0072d17a434096a7435264` |
| 100 years | `Flood/100yr/Metro Manila.zip` | `7f92b0e079ff611907adc4b102b5ebda45331a819109f9cbb97f56f42889b3e2` |

The importer checks all three hashes, shapefile sidecars, WGS 84 declaration, flood class and archive integrity. The source has some invalid dissolved polygon topology. The importer reads only rings near verified assets, repairs invalid nearby rings where possible, and fails if a relevant ring cannot be repaired. It intersects those rings with the **current verified asset geometry**, stores the worst intersecting class per scenario, records the exact asset-geometry hash, and refuses a release with no verified assets. A changed asset geometry makes its prior exposure stale. Every release stores source revision, archive hashes, license review, named approver, approval reference, and activation time. An earlier release is retired in the same database transaction.

## Operator procedure

1. Back up and rehearse restore, then migrate to Alembic revision `22f6a7b8c9d0`. Check the schema inventory. Review source coverage against Caloocan asset points and a sample of the original maps; this repository's boundary reference is not a certified survey boundary.
2. Confirm ODbL attribution and share-alike treatment for any redistributed derived exposure database. Record the LGU's approval and license review references.
3. Run a dry classification from `backend/` with `python scripts/import_noah_flood_exposure.py --flood-5 <path> --flood-25 <path> --flood-100 <path> --approved-by <name> --approval-reference <reference> --license-reference <reference>`. Review the counts and a spatial sample. The default does not mutate the database.
4. Repeat with `--apply` only when the review is accepted. This operation activates the new release. The script has no network fetch and will not silently switch to a later dataset revision.
5. Authorized staff can read `/api/gov/predictive/production/assets/{asset_id}/flood-exposure` and its `.csv` export. Both enforce maintenance permission and asset scope. The response includes attribution, source revision, scenario classes and limitations. A changed geometry returns a stale state.

**Predictive-model boundary:** These static map classes are not yet model features. Historical labels must not be paired with a map release that was unavailable at their baseline date, and a prospective contribution must pass the approved model's chronological validation and ablation gate before inclusion. Keep this as planning context meanwhile.

**Local verification, 29 October 2026:** All three actual Metro Manila archives matched their pinned SHA-256 values and parsed through the importer; a point inside a 5-year mapped polygon classified as class 1. The local database is at revision 22, with 34 assets, zero verified assets and zero active NOAH releases. No Caloocan asset exposure has been validated or published. The previous local database was backed up at `C:\Users\Val\AppData\Local\Temp\pulso_local_pre_noah_20261029.dump` before migration. The provider archive files and license review copy reside in `C:\Users\Val\AppData\Local\Temp\pulso_noah_source_20261029`, outside the repository.
