"""Pinned, operator-approved NOAH exposure import on a disposable PostGIS DB."""
from hashlib import sha256
from io import BytesIO
import zipfile

from geoalchemy2.elements import WKTElement
import shapefile
import pytest

import models
import noah_flood
from gov_models import InfrastructureAsset, NoahFloodAssetExposure, NoahFloodRelease


def synthetic_archive(path):
    shp, shx, dbf = BytesIO(), BytesIO(), BytesIO()
    writer = shapefile.Writer(shp=shp, shx=shx, dbf=dbf, shapeType=shapefile.POLYGON)
    writer.field("Var", "N", size=2)
    for hazard_class, west in ((1, 120.9), (2, 121.0), (3, 121.1)):
        writer.poly([[(west, 14.7), (west, 14.8), (west + 0.09, 14.8),
                      (west + 0.09, 14.7), (west, 14.7)]])
        writer.record(hazard_class)
    writer.close()
    with zipfile.ZipFile(path, "w") as archive:
        for suffix, data in ((".shp", shp), (".shx", shx), (".dbf", dbf)):
            archive.writestr("MetroManila_Flood" + suffix, data.getvalue())
        archive.writestr("MetroManila_Flood.prj", 'GEOGCS["GCS_WGS_1984",UNIT["Degree",0.0174532925199433]]')
    return sha256(path.read_bytes()).hexdigest()


def test_noah_archive_hash_and_class_validation(tmp_path, monkeypatch):
    archive = tmp_path / "metro.zip"
    digest = synthetic_archive(archive)
    layers = list(noah_flood._archive_layers(archive, digest))
    assert [item[0] for item in layers] == [1, 2, 3]
    with pytest.raises(ValueError, match="checksum"):
        list(noah_flood._archive_layers(archive, "0" * 64))


def test_approved_release_and_geometry_invalidation(clean_postgis, tmp_path, monkeypatch):
    archive = tmp_path / "metro.zip"
    digest = synthetic_archive(archive)
    monkeypatch.setattr(noah_flood, "ARCHIVES", {p: (f"Flood/{p}yr/Metro.zip", digest) for p in (5, 25, 100)})
    with clean_postgis() as db:
        db.add(models.District(id=1, name="Test district", code="TST1"))
        db.flush()
        db.add(models.Barangay(id=1, name="Test barangay", district_id=1))
        asset = InfrastructureAsset(asset_id="TEST-NOAH-1", asset_name="Test drain", category="Drainage",
                                    barangay_id=1, registry_status="verified", maintenance_authority="Test city",
                                    geom=WKTElement("POINT(121.04 14.75)", srid=4326))
        db.add(asset)
        db.commit()
        paths = {p: archive for p in (5, 25, 100)}
        preview = noah_flood.import_approved_release(db, paths, "Test steward", "Test approval", "Test license")
        assert preview["status"] == "ready_for_review"
        assert db.query(NoahFloodRelease).count() == 0
        active = noah_flood.import_approved_release(db, paths, "Test steward", "Test approval", "Test license", apply=True)
        assert active["status"] == "active" and db.query(NoahFloodAssetExposure).count() == 3
        context = noah_flood.asset_exposure(db, asset)
        assert context["status"] == "available"
        assert [row["hazard_class"] for row in context["scenarios"]] == [2, 2, 2]
        asset.geom = WKTElement("POINT(120.92 14.75)", srid=4326)
        db.commit()
        assert noah_flood.asset_exposure(db, asset)["status"] == "stale_geometry"
