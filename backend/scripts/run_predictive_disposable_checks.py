"""Migrate and test against a newly created, uniquely named disposable PostGIS DB."""
import os
import argparse
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import DATABASE_URL


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-inventory", action="store_true")
    parser.add_argument("--regression", action="store_true")
    args = parser.parse_args()
    backend = Path(__file__).resolve().parents[1]
    name = f"pulso_test_predictive_{uuid4().hex[:12]}"
    source = make_url(DATABASE_URL)
    if not source.drivername.startswith("postgresql"):
        raise RuntimeError("A PostgreSQL/PostGIS source connection is required.")
    admin_url = source.set(database="postgres").render_as_string(hide_password=False)
    test_url = source.set(database=name).render_as_string(hide_password=False)
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    created = False
    try:
        with admin.connect() as connection:
            if connection.execute(text("SELECT 1 FROM pg_database WHERE datname=:name"), {"name": name}).scalar():
                raise RuntimeError("Generated test database unexpectedly exists; refusing to use it.")
            connection.execute(text(f'CREATE DATABASE "{name}"'))
            created = True
        env = os.environ.copy()
        env["DATABASE_URL"] = test_url
        env["PULSO_TEST_DATABASE"] = "1"
        bootstrap = backend.parent / "scripts" / "db_schema.py"
        subprocess.run([sys.executable, str(bootstrap), "bootstrap"], cwd=backend, env=env, check=True)
        subprocess.run([sys.executable, "-m", "alembic", "stamp", "c455ca49f6d5"], cwd=backend, env=env, check=True)
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend, env=env, check=True)
        if args.write_inventory:
            subprocess.run([sys.executable, str(bootstrap), "inventory", "--output",
                            str(backend / "schema" / "head_23a7b8c9d0e1.inventory.json")], cwd=backend, env=env, check=True)
        subprocess.run([sys.executable, str(bootstrap), "check-existing"], cwd=backend, env=env, check=True)
        subprocess.run([sys.executable, "-m", "pytest", "tests/test_asset_inspection_routes.py",
                        "tests/test_production_predictive.py", "tests/test_hazard_feeds.py",
                        "tests/test_noah_flood.py", "tests/test_testing_hazard_context.py",
                        "tests/test_resident_government_integration.py", "-q"], cwd=backend, env=env, check=True)
        if args.regression:
            subprocess.run([sys.executable, "-m", "pytest", "tests/test_government_workspace.py",
                            "tests/test_government_access_guards.py", "-q", "--disable-warnings"],
                           cwd=backend, env=env, check=True)
    finally:
        if created:
            with admin.connect() as connection:
                connection.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
        admin.dispose()


if __name__ == "__main__":
    main()
