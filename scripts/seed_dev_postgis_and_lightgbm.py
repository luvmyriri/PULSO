"""
seed_dev_postgis_and_lightgbm.py — Idempotent PostGIS & LightGBM Developer Seeder
Caloocan City Engineering Office — PULSO System

Populates:
  1. city_boundaries from backend/data/caloocan_boundaries.geojson (if empty)
  2. environmental_context for North Caloocan Barangays 165–188
  3. True PostGIS POINT(lng, lat) SRID 4326 geometries on InfrastructureAsset records
  4. >= 32 empirical InfrastructureAsset, MaintenanceHistory, and completed WorkOrder
     records so PostGIS ST_DWithin 50m/150m geography rings and LightGBM empirical
     calibration (lightgbm_empirical_postgis) work out-of-the-box for all developers.
"""

import datetime
from datetime import timezone
import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import text
from database import SessionLocal
import models
import gov_models
from services import lightgbm_service


# Verified North Caloocan Barangay coordinates (Barangays 165 to 188)
NORTH_CALOOCAN_COORDS = {
    "165": (14.7315, 121.0155, "Low"),
    "166": (14.7348, 121.0192, "Low"),
    "167": (14.7382, 121.0235, "Medium"),
    "168": (14.7420, 121.0310, "Medium"),
    "169": (14.7445, 121.0350, "Low"),
    "170": (14.7460, 121.0375, "Medium"),
    "171": (14.7485, 121.0289, "High"),
    "172": (14.7510, 121.0340, "Medium"),
    "173": (14.7525, 121.0390, "Medium"),
    "174": (14.7540, 121.0410, "High"),
    "175": (14.7562, 121.0423, "High"),
    "176": (14.7650, 121.0480, "High"),
    "177": (14.7585, 121.0460, "Medium"),
    "178": (14.7610, 121.0495, "Medium"),
    "179": (14.7630, 121.0540, "Low"),
    "180": (14.7660, 121.0580, "Low"),
    "181": (14.7685, 121.0610, "Low"),
    "182": (14.7700, 121.0630, "Medium"),
    "183": (14.7715, 121.0650, "Low"),
    "184": (14.7730, 121.0670, "Low"),
    "185": (14.7745, 121.0685, "Medium"),
    "186": (14.7760, 121.0700, "Medium"),
    "187": (14.7775, 121.0660, "Low"),
    "188": (14.7790, 121.0640, "High"),
}


SEED_ASSETS = [
    ("CAL-RD-165", "Bagbaguin Main Road Section A", "Roads", "165", 20, 74.0, "Asphalt Concrete", 14.7318, 121.0158),
    ("CAL-RD-167", "Llano Road Pavement Corridor", "Roads", "167", 20, 52.0, "Portland Cement Concrete", 14.7385, 121.0238),
    ("CAL-DR-168", "Deparo Main Drainage Interceptor", "Drainage", "168", 15, 44.0, "Reinforced Concrete Pipe", 14.7423, 121.0313),
    ("CAL-LT-170", "Deparo-Camarin Streetlight Grid", "Lighting", "170", 10, 81.0, "Galvanized Steel Pole / LED", 14.7463, 121.0378),
    ("CAL-BR-171", "Bagumbong Creek Bridge Approach", "Bridges", "171", 30, 39.0, "Reinforced Concrete", 14.7488, 121.0292),
    ("CAL-DR-171", "Bagumbong Floodway Culvert B", "Drainage", "171", 15, 31.0, "Box Culvert", 14.7483, 121.0286),
    ("CAL-RD-172", "Urduja Village Collector Road", "Roads", "172", 20, 63.0, "Asphalt Overlay", 14.7513, 121.0343),
    ("CAL-RD-173", "Congressional Road Extension", "Roads", "173", 20, 48.0, "Portland Cement Concrete", 14.7528, 121.0393),
    ("CAL-DR-174", "Camarin Central Storm Drain", "Drainage", "174", 15, 34.0, "Reinforced Concrete", 14.7543, 121.0413),
    ("CAL-RD-175", "Zapote-Camarin Arterial Road", "Roads", "175", 20, 41.0, "Asphalt Concrete", 14.7564, 121.0425),
    ("CAL-DR-175", "Camarin Creek Outfall Culvert", "Drainage", "175", 15, 29.0, "Box Culvert", 14.7560, 121.0421),
    ("CAL-LT-175", "Camarin Road LED Corridor", "Lighting", "175", 10, 68.0, "LED Luminaire", 14.7566, 121.0427),
    ("CAL-RD-176A", "Bagong Silang Phase 1 Arterial", "Roads", "176", 20, 33.0, "Portland Cement Concrete", 14.7652, 121.0482),
    ("CAL-DR-176B", "Bagong Silang Langit Rd Canal", "Drainage", "176", 15, 27.0, "Reinforced Concrete", 14.7648, 121.0478),
    ("CAL-BLDG-176", "Bagong Silang Multi-Purpose Hall", "Facilities", "176", 35, 77.0, "Structural Steel & Concrete", 14.7655, 121.0485),
    ("CAL-RD-177", "Cielito Homes Access Road", "Roads", "177", 20, 58.0, "Asphalt Concrete", 14.7588, 121.0463),
    ("CAL-DR-178", "Camarin-Kiko Drainage Line", "Drainage", "178", 15, 46.0, "Reinforced Concrete Pipe", 14.7613, 121.0498),
    ("CAL-LT-179", "Amparo Subdivision Lighting", "Lighting", "179", 10, 84.0, "LED Luminaire", 14.7633, 121.0543),
    ("CAL-RD-180", "Quirino Highway Tala Section", "Roads", "180", 25, 51.0, "Portland Cement Concrete", 14.7663, 121.0583),
    ("CAL-BR-182", "Pangarap Village Bridge", "Bridges", "182", 30, 56.0, "Prestressed Concrete", 14.7703, 121.0633),
    ("CAL-DR-185", "Maligaya Park Storm Culvert", "Drainage", "185", 15, 42.0, "Box Culvert", 14.7748, 121.0688),
    ("CAL-RD-186", "Barracks II Collector Road", "Roads", "186", 20, 61.0, "Asphalt Overlay", 14.7763, 121.0703),
    ("CAL-DR-188", "Tala Flood Control Interceptor", "Drainage", "188", 15, 32.0, "Reinforced Concrete", 14.7793, 121.0643),
    ("CAL-LT-188", "Tala Hospital Access Lighting", "Lighting", "188", 10, 72.0, "LED Luminaire", 14.7788, 121.0638),
]


def seed_all():
    db = SessionLocal()
    today = datetime.date.today()
    now_utc = datetime.datetime.now(timezone.utc)
    try:
        # 1. Seed city_boundaries from GeoJSON if empty
        boundary_cnt = db.execute(text("SELECT COUNT(*) FROM city_boundaries")).scalar() or 0
        geojson_path = BACKEND_DIR / "data" / "caloocan_boundaries.geojson"
        if boundary_cnt == 0 and geojson_path.exists():
            data = json.loads(geojson_path.read_text(encoding="utf-8"))
            for feat in data.get("features", []):
                props = feat.get("properties", {})
                geom_json = json.dumps(feat.get("geometry"))
                db.execute(
                    text("""
                        INSERT INTO city_boundaries (name, sector, barangay_number, area_sqkm, geom)
                        VALUES (:name, :sector, :brgy, :area, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)))
                    """),
                    {
                        "name": props.get("name", "Caloocan Sector"),
                        "sector": props.get("sector", "North"),
                        "brgy": props.get("barangay_number"),
                        "area": props.get("area_sqkm", 15.0),
                        "geom": geom_json,
                    },
                )
            db.commit()
            print("[1/4] Seeded city_boundaries from caloocan_boundaries.geojson")
        else:
            print(f"[1/4] city_boundaries already populated ({boundary_cnt} rows)")

        # 2. Seed Districts, Barangays, and EnvironmentalContext for Barangays 165-188
        dist = db.query(models.District).filter_by(id=1).first()
        if not dist:
            dist = models.District(id=1, name="North Caloocan", code="NC-1")
            db.add(dist)
            db.commit()

        for brgy_str, (lat, lng, flood_lvl) in NORTH_CALOOCAN_COORDS.items():
            brgy_id = int(brgy_str)
            b_obj = db.query(models.Barangay).filter_by(id=brgy_id).first()
            if not b_obj:
                db.add(models.Barangay(id=brgy_id, name=f"Barangay {brgy_id}", district_id=dist.id, zip_code="1420"))
                db.flush()
            env_obj = db.query(gov_models.EnvironmentalContext).filter_by(barangay_id=brgy_id).first()
            if not env_obj:
                db.add(
                    gov_models.EnvironmentalContext(
                        barangay_id=brgy_id,
                        flood_risk_level=flood_lvl,
                        soil_subsidence=1.2 if flood_lvl == "High" else (0.6 if flood_lvl == "Medium" else 0.2),
                    )
                )
        db.commit()
        print("[2/4] Verified 24 North Caloocan Barangays (165-188) & EnvironmentalContext records")

        # 3. Seed & Geocode InfrastructureAssets with PostGIS POINT geometries
        for idx, (aid, aname, cat, brgy, dlife, score, mat, lat, lng) in enumerate(SEED_ASSETS):
            asset = db.query(gov_models.InfrastructureAsset).filter_by(asset_id=aid).first()
            completed_dt = today - datetime.timedelta(days=int(dlife * 365 * ((100.0 - score) / 100.0)))
            if not asset:
                asset = gov_models.InfrastructureAsset(
                    asset_id=aid,
                    asset_name=aname,
                    category=cat,
                    barangay=brgy,
                    barangay_id=int(brgy),
                    design_life=dlife,
                    condition_score=score,
                    material_type=mat,
                    date_completed=completed_dt,
                )
                db.add(asset)
                db.flush()

            db.execute(
                text("""
                    UPDATE infrastructure_assets
                    SET geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                        barangay_id = COALESCE(barangay_id, :brgy_id),
                        date_completed = COALESCE(date_completed, :completed_dt)
                    WHERE asset_id = :aid
                """),
                {"lng": lng, "lat": lat, "brgy_id": int(brgy), "completed_dt": completed_dt, "aid": aid},
            )

        # Backfill any existing assets that still have NULL geom
        existing_null = db.query(gov_models.InfrastructureAsset).filter(
            gov_models.InfrastructureAsset.geom.is_(None)
        ).all()
        for i, a in enumerate(existing_null):
            brgy_key = str(a.barangay or "175")
            base_lat, base_lng, _ = NORTH_CALOOCAN_COORDS.get(brgy_key, (14.7562, 121.0423, "Medium"))
            offset = (i + 1) * 0.0004
            completed_dt = a.date_completed or (today - datetime.timedelta(days=1200 + i * 180))
            db.execute(
                text("""
                    UPDATE infrastructure_assets
                    SET geom = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326),
                        date_completed = COALESCE(date_completed, :completed_dt)
                    WHERE asset_id = :aid
                """),
                {
                    "lng": base_lng + offset,
                    "lat": base_lat + offset,
                    "completed_dt": completed_dt,
                    "aid": a.asset_id,
                },
            )
        db.commit()

        # 4. Seed MaintenanceHistory & completed WorkOrders so empirical samples >= 30
        all_assets = db.query(gov_models.InfrastructureAsset).all()
        maint_cnt = db.query(gov_models.MaintenanceHistory).count()
        if maint_cnt < 25:
            for idx, a in enumerate(all_assets):
                days_ago = 35 + (idx * 17) % 320
                db.add(
                    gov_models.MaintenanceHistory(
                        asset_id=a.asset_id,
                        work_type="Preventive Rehabilitation" if (a.condition_score or 70) < 50 else "Routine Inspection & Patching",
                        completion_date=today - datetime.timedelta(days=days_ago),
                        cost=18500.0 + (idx % 6) * 7500.0,
                    )
                )
                if (a.condition_score or 70) <= 45:
                    # Second maintenance log in last 180d for high-stress assets
                    db.add(
                        gov_models.MaintenanceHistory(
                            asset_id=a.asset_id,
                            work_type="Emergency De-silting / Structural Stabilization",
                            completion_date=today - datetime.timedelta(days=18 + (idx % 25)),
                            cost=32000.0,
                        )
                    )
            db.commit()

        completed_wo_cnt = (
            db.query(gov_models.WorkOrder)
            .filter(gov_models.WorkOrder.completed_date.isnot(None))
            .count()
        )
        if completed_wo_cnt < 30:
            for idx in range(32):
                a = all_assets[idx % len(all_assets)]
                wo_num = f"WO-EMP-2026-{1001 + idx}"
                if db.query(gov_models.WorkOrder).filter_by(wo_number=wo_num).first():
                    continue
                cat_l = (a.category or "").lower()
                if "bridge" in cat_l:
                    dur_days = 6.5 + (idx % 5) * 1.4
                elif "road" in cat_l:
                    dur_days = 2.5 + (idx % 6) * 1.1
                elif "drain" in cat_l:
                    dur_days = 2.0 + (idx % 5) * 0.9
                elif "light" in cat_l:
                    dur_days = 1.0 + (idx % 3) * 0.6
                else:
                    dur_days = 3.5 + (idx % 4) * 1.0

                created_dt = now_utc - datetime.timedelta(days=85 - (idx * 2))
                completed_dt = created_dt + datetime.timedelta(days=dur_days)
                db.add(
                    gov_models.WorkOrder(
                        wo_number=wo_num,
                        title=f"Completed Maintenance: {a.asset_name}",
                        description=f"Empirical turnaround record for {a.asset_name} in Brgy. {a.barangay}.",
                        category=a.category,
                        priority="critical" if (a.condition_score or 70) <= 35 else ("high" if (a.condition_score or 70) <= 55 else "normal"),
                        status="completed",
                        wo_type="preemptive" if idx % 2 == 0 else "standard",
                        asset_id=a.asset_id,
                        estimated_cost=25000.0 + (idx % 5) * 8000.0,
                        actual_cost=24500.0 + (idx % 5) * 7800.0,
                        created_at=created_dt,
                        completed_date=completed_dt,
                    )
                )
            db.commit()

        # Force LightGBM cache refresh and print diagnostics
        lightgbm_service._ENGINE.last_fitted_key = None
        diag = lightgbm_service.get_global_model_diagnostics(db)
        total_assets = db.query(gov_models.InfrastructureAsset).count()
        geom_assets = db.query(gov_models.InfrastructureAsset).filter(gov_models.InfrastructureAsset.geom.isnot(None)).count()
        print(f"[3/4] Assets with PostGIS geom: {geom_assets}/{total_assets}")
        print(f"[4/4] LightGBM training_mode: {diag['training_mode']} (empirical_assets={diag['empirical_assets_sampled']}, empirical_work_orders={diag['empirical_work_orders_sampled']})")
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
