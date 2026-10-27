"""Safe data resets for the already bootstrapped disposable PostGIS database."""

import os

from sqlalchemy import text
from sqlalchemy.engine import make_url

from database import engine


def disposable_engine():
    raw_url = os.environ.get("DATABASE_URL", "")
    name = make_url(raw_url).database if raw_url else ""
    if os.environ.get("PULSO_TEST_DATABASE") != "1" or not name or not (
        "test" in name or name == "pulso_ci" or name.startswith("pulso_ci_") or name.startswith("pulso_dev_")
    ):
        raise RuntimeError(
            "Tests require an explicit throwaway PostGIS database "
            f"(guard={os.environ.get('PULSO_TEST_DATABASE') == '1'}, "
            f"test_name={bool(name and 'test' in name)})"
        )
    with engine.connect() as connection:
        if connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() != "18efa117cb09":
            raise RuntimeError("Disposable database is not at the expected Alembic head")
        connection.execute(text("SELECT PostGIS_Version()"))
    return engine


def reset_rows():
    test_engine = disposable_engine()
    with test_engine.begin() as connection:
        tables = connection.execute(text("""
            SELECT quote_ident(tablename) FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename NOT IN ('alembic_version', 'spatial_ref_sys')
            ORDER BY tablename
        """)).scalars().all()
        if tables:
            connection.execute(text("TRUNCATE TABLE " + ", ".join(tables) + " RESTART IDENTITY CASCADE"))
    return test_engine
