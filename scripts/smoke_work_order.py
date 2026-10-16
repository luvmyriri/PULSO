#!/usr/bin/env python3
"""Transactional PostGIS and government-record smoke test on a throwaway DB."""

import os
import sys

from sqlalchemy.engine import make_url

import db_schema


def main() -> int:
    url = os.environ.get("DATABASE_URL", "")
    name = make_url(url).database if url else ""
    if os.environ.get("PULSO_TEST_DATABASE") != "1" or not name or not (
        "test" in name or name == "pulso_ci" or name.startswith("pulso_ci_") or name.startswith("pulso_dev_")
    ):
        raise ValueError("Smoke test requires an explicit disposable PostGIS DATABASE_URL")
    connection = db_schema.connect()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT ST_Covers(geom, ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326)) FROM city_boundaries WHERE sector='North'")
            if not any(row[0] for row in cursor.fetchall()):
                raise ValueError("North test point is outside the loaded boundary")
            cursor.execute("""
                INSERT INTO officials (full_name, email, password_hash, role, account_type)
                VALUES ('Synthetic smoke dispatcher', 'smoke-dispatch@example.invalid', 'unused', 'dispatcher', 'staff')
                RETURNING id
            """)
            dispatcher = cursor.fetchone()[0]
            cursor.execute("""
                INSERT INTO reports (ticket_id, reporter_type, category, description,
                                     location_lat, location_lng, location, status)
                VALUES ('SMOKE-ROLLBACK-ONLY', 'guest', 'Roads', 'Synthetic smoke report',
                        14.7562, 121.0423, ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326), 'pending')
                RETURNING id
            """)
            report = cursor.fetchone()[0]
            cursor.execute("""
                INSERT INTO work_orders (wo_number, report_id, assigned_by_id, title, status)
                VALUES ('SMOKE-ROLLBACK-ONLY', %s, %s, 'Synthetic smoke work', 'open')
                RETURNING id
            """, (report, dispatcher))
            work_order = cursor.fetchone()[0]
            cursor.execute("SELECT count(*) FROM work_orders WHERE id=%s AND report_id=%s", (work_order, report))
            if cursor.fetchone()[0] != 1:
                raise ValueError("Work order was not linked to the synthetic report")
        print("Boundary lookup and synthetic work order: PASS; transaction rolled back.")
        return 0
    finally:
        connection.rollback()
        connection.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Smoke test failed: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1)
