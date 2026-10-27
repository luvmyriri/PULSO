"""Explicit clean-install reference catalog and first administrator, never demo data."""
import argparse
import json
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, '/app/backend')
import auth
import models
import staff_accounts
from database import SessionLocal
from sqlalchemy import func

BACKEND_ROOT = Path('/app/backend') if Path('/app/backend').is_dir() else Path(__file__).resolve().parents[2] / 'backend'


def references(db):
    # Legislative district mapping: RA 11545, section 1. Do not confuse sectors
    # with legislative districts. The shipped 188-barangay geometry bundle is a
    # versioned reference dataset, not a claim that the PSGC catalog is current.
    first = set(range(1, 5)) | set(range(77, 86)) | set(range(132, 178))
    third = set(range(178, 189))
    for number in (1, 2, 3):
        if not db.get(models.District, number):
            db.add(models.District(id=number, name=f'District {number}', code=f'D{number}'))
    db.flush()
    bundle = BACKEND_ROOT / 'caloocan_border.json'
    features = json.loads(bundle.read_text(encoding='utf-8'))['features']
    for feature in features:
        properties = feature['properties']
        number = int(properties['brgy_num'])
        if db.get(models.Barangay, number):
            continue
        district = 1 if number in first else 3 if number in third else 2
        db.add(models.Barangay(id=number, name=f'Barangay {number}', district_id=district,
            brgy_num=number, sector=properties.get('sector'), display_name=properties.get('display_name')))
    # Preserve the application's existing service-boundary source. Presentation
    # clipping layers are populated separately by map_reference at API startup.
    for sector in ('North', 'South'):
        name = f'{sector} Caloocan'
        if not db.query(models.CityBoundary).filter_by(name=name).first():
            geometry = dict(type='GeometryCollection', geometries=[feature['geometry'] for feature in features if feature['properties']['sector'] == sector])
            db.add(models.CityBoundary(name=name, sector=sector,
                geom=func.ST_Multi(func.ST_CollectionExtract(func.ST_UnaryUnion(func.ST_MakeValid(func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(geometry)), 4326))), 3))))
    db.commit()
    print(json.dumps({'reference_catalog': 'ready', 'districts': db.query(models.District).count(),
        'barangays': db.query(models.Barangay).count(), 'service_boundaries': db.query(models.CityBoundary).count()}))


def first_admin(db):
    if db.query(models.Official).count():
        raise SystemExit('Staff already exist; first-administrator bootstrap refused.')
    email = os.environ['PULSO_ADMIN_EMAIL'].strip().lower()
    name = os.environ['PULSO_ADMIN_NAME'].strip()
    origin = os.environ['PULSO_PUBLIC_BASE_URL'].rstrip('/')
    if not name or '@' not in email or not origin.startswith('https://'):
        raise SystemExit('A name, valid email and HTTPS public origin are required.')
    person = models.Official(full_name=name, email=email, role='system_admin', account_type='admin',
        password_hash=auth.get_password_hash(secrets.token_urlsafe(40)), is_active=False,
        is_suspended=False, invitation_pending=True)
    db.add(person)
    db.flush()
    link = staff_accounts.issue_link(db, person, person, 'invite')
    staff_accounts.audit(db, person, 'Initial administrator invited', {'reason':'Explicit clean VPS deployment setup', 'target_id':person.id})
    db.commit()
    # Capture stdout into an owner-only server file. Never put this in build logs.
    print(json.dumps({'activation_url':origin + link['invite_link'], 'expires_at':link['expires_at'], 'email':email}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['references', 'first-admin'])
    command = parser.parse_args().command
    with SessionLocal() as session:
        references(session) if command == 'references' else first_admin(session)
