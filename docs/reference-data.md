# Governed district and barangay reference data

Status: one city-level geometry source is pinned for review and controlled
insertion. District and barangay mappings remain unapproved and are not seeded.

## Caloocan city boundary (pinned source)

- Source: [geoBoundaries gbOpen Philippines ADM3 metadata](https://www.geoboundaries.org/api/current/gbOpen/PHL/ADM3/) and its [simplified GeoJSON retrieved through GitHub LFS media](https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/PHL/ADM3/geoBoundaries-PHL-ADM3_simplified.geojson). The metadata credits NAMRIA, PSA, and OCHA Philippines; the represented boundary year is 2020 and the source data update is 19 January 2023.
- License reported for this dataset: **Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)**. Preserve attribution in any map or data redistribution. This is an open source planning geometry, not a city-validated jurisdiction determination.
- Retrieved: **16 October 2026**. Full simplified ADM3 GeoJSON SHA-256: `2ece3d44a5c6a2afb385ffbf3a6b88d83e4d3a3e7eed9a52cb3be1bc59e289fc`.
- Extracted feature: `Caloocan City`, source `shapeID=30758251B52612034306412`, in [the pinned GeoJSON](../backend/reference_data/caloocan-city-geoboundaries-adm3-simplified.geojson). Extracted file SHA-256: `58ab1b6fc0f1fb756fddd647caad4271476662c43440a6e5327d803fef4d57e8`.
- The source feature has two disjoint polygon components. The loader assigns North and South using component centroids and checks the components against Camarin, Monumento, and an outside Malabon point. Coordinates are validated as EPSG:4326 and geometry is checked in PostGIS before insert. Simplification limits use for precise parcel, emergency, or legal boundary decisions.
- Run `scripts/load_boundaries.py --dry-run` first, then `--apply` on a **fresh bootstrapped database** with an explicit `DATABASE_URL`. It inserts only when `city_boundaries` is empty. A rerun verifies matching geometry and makes no change. It never updates or deletes rows.
- The ADM3 source has no barangay polygons or legislative-district mapping. Loading `districts` or `barangays` from it would require invented assignments, so those tables are intentionally skipped.

The current models need `districts` (`id`, unique `name`, unique `code`) and
`barangays` (`id`, unique `name`, required `district_id`, optional `sector`,
`brgy_num`, `display_name`, `zip_code`, and WGS84 multipolygon `geom`). The
application also needs a reviewed mapping from each barangay to its legislative
district and a provenance/version record for any boundary geometry. Model
comments and old seed scripts are not authority for district assignments.

Candidate sources for a data steward to review:

1. [PSA Philippine Standard Geographic Code](https://psa.gov.ph/classification/psgc/barangays): official barangay names and codes, with a dated release. Use its versioned identifiers as the reference key; check name changes before import.
2. [COMELEC election and precinct material](https://www.comelec.gov.ph/?r=2026BSKE%2FProjectOfPrecincts): candidate evidence for legislative district membership. Have the city election office confirm the current barangay-to-district mapping before use.
3. [NAMRIA Geoportal Philippines](https://www.geoportal.gov.ph/) and its [data inventory](https://geoportal.gov.ph/gpresources/GP_DataInventory.pdf): candidate boundary layers and metadata. Availability and download rights vary by layer; request the authoritative Caloocan coverage and confirm the coordinate reference system and permitted use.
4. The Caloocan City planning/GIS and engineering offices: obtain written confirmation of operational sector labels, district assignments, boundary version, and any local naming conventions that differ from PSGC.

Before a district or barangay import is approved, the steward should supply the release date,
issuing agency, license/permission, unique source identifiers, effective dates,
district mapping, geometry provenance and CRS, and a review of missing or
overlapping polygons. Reconcile those fields to the model and require a
separate reviewed seed/import change. Do not infer boundaries from map tiles,
copy production rows, or fabricate barangay coordinates.
