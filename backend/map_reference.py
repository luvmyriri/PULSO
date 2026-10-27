"""Versioned presentation geometry. Jurisdiction-enforcement tables stay separate."""
from pathlib import Path
from hashlib import sha256
import json
from fastapi import HTTPException
from sqlalchemy import text

BUNDLE = Path(__file__).parent / 'data' / 'map-reference'


def load_bundle():
    features=[]
    digest=sha256(b'map-reference-clipped-v1')
    for name in ('north.geojson','south.geojson','barangays.geojson'):
        raw=(BUNDLE/name).read_bytes()
        digest.update(raw)
        data=json.loads(raw)
        for f in data['features']:
            source=f.get('properties',{})
            city=name != 'barangays.geojson'
            properties = dict(layer='city',sector='North' if name=='north.geojson' else 'South',name=source['name']) if city else dict(layer='barangay',brgy_num=source['brgy_num'],name=source.get('display_name') or source['ADM4_EN'],sector=source['sector'])
            key=f'city:{properties["sector"]}' if city else f'barangay:{properties["brgy_num"]}'
            features.append(dict(id=key,properties=properties,geometry=f['geometry']))
    return features,digest.hexdigest()


def sync_reference_layers(db):
    features,digest=load_bundle()
    db.execute(text('SELECT pg_advisory_xact_lock(86173302)'))
    existing=db.execute(text('SELECT count(*),min(source_digest),max(source_digest) FROM map_reference_features')).one()
    if existing[0] and existing[1] == digest and existing[2] == digest:
        db.commit()
        return
    db.execute(text("""
        WITH raw AS (
          SELECT f->>'id' id,f->'properties' props,
          ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((f->'geometry')::text),4326)) g
          FROM jsonb_array_elements(CAST(:features AS jsonb)) f
        ), city AS (
          SELECT ST_UnaryUnion(ST_Collect(g)) boundary FROM raw WHERE props->>'layer'='city'
        ), shapes AS (
          SELECT id,props,ST_Multi(ST_CollectionExtract(ST_MakeValid(CASE WHEN props->>'layer'='barangay'
            THEN ST_Intersection(raw.g,city.boundary) ELSE raw.g END),3)) g FROM raw CROSS JOIN city
        )
        INSERT INTO map_reference_features(feature_id,layer,properties,source_digest,geom)
        SELECT id,props->>'layer',props,:digest,g FROM shapes WHERE NOT ST_IsEmpty(g)
        ON CONFLICT(feature_id) DO UPDATE SET layer=excluded.layer,properties=excluded.properties,
          source_digest=excluded.source_digest,geom=excluded.geom,updated_at=now()
    """),dict(features=json.dumps(features),digest=digest))
    db.execute(text('DELETE FROM map_reference_features WHERE source_digest<>:digest'),dict(digest=digest))
    db.commit()


def reference_geojson(db):
    rows=db.execute(text('SELECT feature_id,properties,source_digest,ST_AsGeoJSON(geom,8) geometry FROM map_reference_features ORDER BY feature_id')).all()
    if not rows: raise HTTPException(503,'Map boundaries are unavailable. The report list remains available.')
    return dict(type='FeatureCollection',features=[dict(type='Feature',id=r.feature_id,properties=r.properties,geometry=json.loads(r.geometry)) for r in rows],metadata=dict(source='Bundled project map reference, processed by PostGIS',source_digest=rows[0].source_digest,simplified=False,barangays_clipped_to_city=True,accuracy='Reference geometry; not a certified survey or a change to service jurisdiction.'))
