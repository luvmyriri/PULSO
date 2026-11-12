"""Shared fixtures for tests that exercise the PostGIS-backed application schema.

The database is a disposable database created by scripts/bootstrap_db; tests
never create ORM tables or point at the developer's configured database.
"""

import os
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from tests.postgis_support import disposable_engine, reset_rows


KNOWN_FAILURES = Path(__file__).resolve().parents[2] / "tests" / "known_failures.txt"


def _known_failures():
    if not KNOWN_FAILURES.exists():
        return {}
    result = {}
    for line in KNOWN_FAILURES.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        nodeid, reason = line.split("\t", 1)
        if not reason.strip() or nodeid in result:
            raise pytest.UsageError("Invalid or duplicate known failure entry")
        result[nodeid] = reason.strip()
    return result


def pytest_collection_modifyitems(items):
    known = _known_failures()
    collected = {item.nodeid for item in items}
    if os.environ.get("PULSO_ENFORCE_KNOWN") == "1":
        stale = set(known) - collected
        if stale:
            raise pytest.UsageError("Known failure list contains uncollected tests: " + ", ".join(sorted(stale)))
    for item in items:
        if item.nodeid in known:
            item.add_marker(pytest.mark.xfail(reason=known[item.nodeid], strict=False))


def pytest_sessionstart(session):
    path = os.environ.get("PULSO_XPASS_FILE")
    if path:
        Path(path).write_text("", encoding="utf-8")


def pytest_runtest_logreport(report):
    path = os.environ.get("PULSO_XPASS_FILE")
    if path and report.when == "call" and report.passed and hasattr(report, "wasxfail"):
        with Path(path).open("a", encoding="utf-8") as handle:
            handle.write(report.nodeid + "\n")


@pytest.fixture(scope="session")
def postgis_database():
    yield disposable_engine()


@pytest.fixture
def clean_postgis(postgis_database):
    """Reset only data in the throwaway schema; retain bootstrapped DDL."""
    reset_rows()
    return sessionmaker(autocommit=False, autoflush=False, bind=postgis_database)


@pytest.fixture(autouse=True)
def reset_auth_limits():
    from utils.rate_limiter import auth_limiter, otp_verification_limiter

    for limiter in (auth_limiter, otp_verification_limiter):
        limiter.reset()


@pytest.fixture
def synthetic_boundaries(clean_postgis, postgis_database):
    """Fake rectangles for deterministic tests, never a civic boundary source."""
    with postgis_database.begin() as connection:
        connection.execute(text("""
            INSERT INTO city_boundaries (name, sector, geom) VALUES
            ('FAKE North test boundary', 'North', ST_Multi(ST_MakeEnvelope(121.0, 14.70, 121.09, 14.80, 4326))),
            ('FAKE South test boundary', 'South', ST_Multi(ST_MakeEnvelope(120.97, 14.62, 121.04, 14.70, 4326)))
        """))
