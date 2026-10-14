# Governed district and barangay reference data

Status: proposed sources; no district, barangay, or boundary rows are seeded by the local setup.

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

Before an import is approved, the steward should supply the release date,
issuing agency, license/permission, unique source identifiers, effective dates,
district mapping, geometry provenance and CRS, and a review of missing or
overlapping polygons. Reconcile those fields to the model and require a
separate reviewed seed/import change. Do not infer boundaries from map tiles,
copy production rows, or fabricate barangay coordinates.
