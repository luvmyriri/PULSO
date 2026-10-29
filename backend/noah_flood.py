"""Offline, pinned NOAH flood-map intersections for verified asset geometry.

These return-period hazard classes are static planning context. They are never
live water levels, event forecasts, or automatic work-order decisions.
"""
from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import gc
import zipfile

from shapely import make_valid, union_all
from shapely.geometry import LinearRing, Polygon
from shapely.wkb import loads as load_wkb
import shapefile
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from gov_models import InfrastructureAsset, NoahFloodAssetExposure, NoahFloodRelease

SOURCE_REVISION = "6a2237939a07540b9f3103b04141d37adc665ff3"
SOURCE_URL = "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/tree/" + SOURCE_REVISION
LICENSE_URL = "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/blob/" + SOURCE_REVISION + "/NOAH_License.pdf"
ARCHIVES = {
    5: ("Flood/5yr/MetroManila.zip", "99bb769db123c574d8190b4316150f72c818a6bb3dacdb1d0b609f28e960e7f9"),
    25: ("Flood/25yr/MetroManila.zip", "b5354166cce55f21ebaeaad72ce8d86f6d3f7092fb0072d17a434096a7435264"),
    100: ("Flood/100yr/Metro Manila.zip", "7f92b0e079ff611907adc4b102b5ebda45331a819109f9cbb97f56f42889b3e2"),
}


def _asset_geometries(db: Session):
    rows = (db.query(InfrastructureAsset.asset_id, func.ST_AsBinary(InfrastructureAsset.geom))
            .filter(InfrastructureAsset.registry_status == "verified",
                    InfrastructureAsset.barangay_id.isnot(None), InfrastructureAsset.geom.isnot(None))
            .order_by(InfrastructureAsset.asset_id).all())
    assets = []
    for asset_id, binary in rows:
        raw = bytes(binary)
        geometry = load_wkb(raw)
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Verified asset {asset_id} has invalid geometry; correct the register first.")
        assets.append((asset_id, geometry, sha256(raw).hexdigest()))
    return assets


def _archive_layers(path: Path, expected_hash: str):
    if not path.is_file() or path.stat().st_size > 100_000_000:
        raise ValueError("A Metro Manila source archive is missing or exceeds 100 MB.")
    digest = sha256(path.read_bytes()).hexdigest()
    if digest != expected_hash:
        raise ValueError("NOAH archive checksum does not match the pinned source revision.")
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 8 or sum(entry.file_size for entry in entries) > 150_000_000:
            raise ValueError("NOAH archive contains unexpected members or expanded data size.")
        if archive.testzip() is not None:
            raise ValueError("NOAH archive failed its CRC check.")
        members = archive.namelist()
        shp = [name for name in members if name.lower().endswith(".shp")]
        if len(shp) != 1:
            raise ValueError("Expected exactly one shapefile in each Metro Manila archive.")
        stem = shp[0][:-4]
        if any(stem + suffix not in members for suffix in (".shx", ".dbf", ".prj")):
            raise ValueError("Shapefile sidecars or CRS declaration are missing.")
        prj = archive.read(stem + ".prj").decode("ascii", errors="strict")
        if "WGS_1984" not in prj or "Degree" not in prj:
            raise ValueError("NOAH shapefile is not declared in WGS 84 coordinates.")
        reader = shapefile.Reader(shp=BytesIO(archive.read(stem + ".shp")),
                                  shx=BytesIO(archive.read(stem + ".shx")),
                                  dbf=BytesIO(archive.read(stem + ".dbf")))
        fields = [field[0] for field in reader.fields[1:]]
        if "Var" not in fields:
            raise ValueError("NOAH flood hazard classification field Var is missing.")
        index = fields.index("Var")
        if len(reader) < 3 or len(reader) > 1000:
            raise ValueError("Unexpected NOAH flood-map feature count.")
        records = len(reader)
        try:
            for item in reader.iterShapeRecords():
                value = item.record[index]
                if value not in (1, 2, 3):
                    raise ValueError("NOAH flood class is outside the documented 1–3 range.")
                if item.shape.shapeType != shapefile.POLYGON:
                    raise ValueError("NOAH flood map contains a non-polygon feature.")
                yield int(value), item.shape, records
        finally:
            reader.close()


def _polygonal(geometry):
    if geometry.geom_type in ("Polygon", "MultiPolygon"):
        return geometry
    polygons = [piece for piece in getattr(geometry, "geoms", ()) if piece.geom_type in ("Polygon", "MultiPolygon")]
    return union_all(polygons) if polygons else None


def _intersecting_assets(source_shape, assets):
    """Read only rings near registered assets; dissolved source has ~94k rings.

    Shapefile outer rings are clockwise and holes are counterclockwise. Building
    the complete GeoJSON polygon via pyshp is prohibitively slow for this source.
    """
    points = source_shape.points
    offsets = list(source_shape.parts) + [len(points)]
    bounds = {asset_id: geometry.bounds for asset_id, geometry, _ in assets}
    outers = {asset_id: [] for asset_id in bounds}
    holes = {asset_id: [] for asset_id in bounds}
    for start, end in zip(offsets, offsets[1:]):
        ring_points = points[start:end]
        if len(ring_points) < 4:
            raise ValueError("NOAH flood map contains a ring with fewer than four points.")
        xs, ys = zip(*ring_points)
        box = (min(xs), min(ys), max(xs), max(ys))
        targets = [asset_id for asset_id, (west, south, east, north) in bounds.items()
                   if not (box[2] < west or box[0] > east or box[3] < south or box[1] > north)]
        if not targets:
            continue
        ring = LinearRing(ring_points)
        if not ring.is_closed:
            raise ValueError("NOAH flood map contains an unclosed ring near an asset.")
        polygon = Polygon(ring)
        if not polygon.is_valid:
            polygon = _polygonal(make_valid(polygon))
            if polygon is None or polygon.is_empty:
                raise ValueError("NOAH flood geometry near an asset could not be repaired.")
        destination = holes if ring.is_ccw else outers
        for asset_id in targets:
            destination[asset_id].append(polygon)
    matched = set()
    for asset_id, geometry, _ in assets:
        if not outers[asset_id]:
            continue
        area = union_all(outers[asset_id])
        if holes[asset_id]:
            area = area.difference(union_all(holes[asset_id]))
        if area.intersects(geometry):
            matched.add(asset_id)
    return matched


def classify_assets(db: Session, archives: dict[int, Path]):
    assets = _asset_geometries(db)
    if not assets:
        raise ValueError("No verified asset with geometry and barangay is available for classification.")
    if set(archives) != set(ARCHIVES):
        raise ValueError("All three NOAH flood return-period archives are required.")
    exposures = []
    manifest = {}
    for period, (source_path, expected_hash) in ARCHIVES.items():
        matches = {asset_id: None for asset_id, _, _ in assets}
        count = None
        for hazard_class, source_shape, count in _archive_layers(Path(archives[period]), expected_hash):
            for asset_id in _intersecting_assets(source_shape, assets):
                matches[asset_id] = max(matches[asset_id] or 0, hazard_class)
            del source_shape
            gc.collect()
        manifest[str(period)] = {"source_path": source_path, "sha256": expected_hash, "records": count}
        exposures.extend({"asset_id": asset_id, "return_period_years": period,
                          "hazard_class": matches[asset_id], "asset_geometry_sha256": geometry_hash}
                         for asset_id, _, geometry_hash in assets)
    return exposures, manifest


def import_approved_release(db: Session, archives: dict[int, Path], approved_by: str,
                            approval_reference: str, license_reference: str, *, apply: bool = False):
    for value in (approved_by, approval_reference, license_reference):
        if not value or not value.strip() or len(value) > 300 or value.strip().lower() in {"tbd", "pending", "none"}:
            raise ValueError("Named data steward, approval reference and license review reference are required.")
    exposures, manifest = classify_assets(db, archives)
    result = {"status": "ready_for_review", "source_revision": SOURCE_REVISION,
              "assets": len(exposures) // 3, "classifications": len(exposures),
              "mapped": sum(item["hazard_class"] is not None for item in exposures), "manifest": manifest}
    if not apply:
        return result
    db.execute(text("SELECT pg_advisory_xact_lock(176202692)"))
    if db.query(NoahFloodRelease.id).filter_by(source_revision=SOURCE_REVISION).first():
        raise ValueError("This NOAH source revision was already imported; releases are immutable.")
    db.query(NoahFloodRelease).filter_by(status="active").update({"status": "retired"}, synchronize_session=False)
    release = NoahFloodRelease(source_revision=SOURCE_REVISION, source_url=SOURCE_URL,
                               license_reference=license_reference.strip(), archive_manifest=manifest,
                               approved_by=approved_by.strip(), approval_reference=approval_reference.strip(),
                               approved_at=datetime.now(timezone.utc), status="active", asset_count=result["assets"])
    db.add(release)
    db.flush()
    db.add_all(NoahFloodAssetExposure(release_id=release.id, **item) for item in exposures)
    db.commit()
    return {**result, "status": "active", "release_id": release.id}


def asset_exposure(db: Session, asset: InfrastructureAsset):
    if asset.registry_status != "verified" or asset.geom is None or asset.barangay_id is None:
        return {"status": "insufficient_location", "reason": "Verify the asset geometry and barangay first.", "scenarios": []}
    release = db.query(NoahFloodRelease).filter_by(status="active").first()
    if not release:
        return {"status": "unavailable", "reason": "No operator-approved NOAH flood-map release is active.", "scenarios": []}
    raw = db.query(func.ST_AsBinary(InfrastructureAsset.geom)).filter_by(asset_id=asset.asset_id).scalar()
    geometry_hash = sha256(bytes(raw)).hexdigest()
    rows = (db.query(NoahFloodAssetExposure).filter_by(release_id=release.id, asset_id=asset.asset_id)
            .order_by(NoahFloodAssetExposure.return_period_years).all())
    if len(rows) != 3 or any(row.asset_geometry_sha256 != geometry_hash for row in rows):
        return {"status": "stale_geometry", "reason": "Asset geometry changed since the NOAH intersection; reimport the approved maps.", "scenarios": []}
    scenarios = [{"return_period_years": row.return_period_years, "hazard_class": row.hazard_class,
                  "classification": {1: "low", 2: "medium", 3: "high"}.get(row.hazard_class, "unclassified")}
                 for row in rows]
    return {"status": "available", "asset_id": asset.asset_id, "source": "UP NOAH via BetterGov.PH",
            "source_url": release.source_url, "source_revision": release.source_revision,
            "approved_at": release.approved_at, "approval_reference": release.approval_reference,
            "license": "ODbL 1.0", "license_url": LICENSE_URL, "license_reference": release.license_reference,
            "attribution": "Project NOAH and contributors; BetterGov.PH redistribution",
            "scenarios": scenarios,
            "limitation": "Static return-period map intersections, not a current flood, depth measurement, or asset failure probability. Unclassified means no polygon match, not no flood risk."}
