"""Quiet, read-only local credential checks. Never emit values or exception text."""

from __future__ import annotations

import os
import base64
import io
from pathlib import Path

import requests
from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[1]
backend = dotenv_values(ROOT / "backend" / ".env")
frontend = dotenv_values(ROOT / "frontend" / ".env")
compose = dotenv_values(ROOT / ".env")


def present(source: dict, key: str) -> bool:
    return bool(source.get(key))


def http_ok(url: str, *, params=None, headers=None, method="GET", json=None) -> bool:
    try:
        response = requests.request(
            method, url, params=params, headers=headers, json=json, timeout=12
        )
        return response.status_code == 200
    except Exception:
        return False


def jwt_check() -> bool:
    if not present(backend, "JWT_SECRET_KEY"):
        return False
    from jose import jwt

    token = jwt.encode({"sub": "synthetic-local-check"}, backend["JWT_SECRET_KEY"], algorithm="HS256")
    return jwt.decode(token, backend["JWT_SECRET_KEY"], algorithms=["HS256"])["sub"] == "synthetic-local-check"


def database_check() -> bool:
    if not present(backend, "DATABASE_URL"):
        return False
    from sqlalchemy import create_engine, text

    engine = create_engine(backend["DATABASE_URL"], connect_args={"connect_timeout": 5})
    try:
        with engine.connect() as connection:
            return connection.execute(text("SELECT 1")).scalar_one() == 1
    finally:
        engine.dispose()


def compose_check() -> bool:
    if not all(present(compose, key) for key in ("POSTGRES_PASSWORD", "POSTGRES_USER", "POSTGRES_DB")):
        return False
    import psycopg2

    connection = psycopg2.connect(
        host="127.0.0.1",
        port=compose.get("POSTGRES_PORT", "5432"),
        user=compose["POSTGRES_USER"],
        password=compose["POSTGRES_PASSWORD"],
        dbname=compose["POSTGRES_DB"],
        connect_timeout=5,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            return cursor.fetchone()[0] == 1
    finally:
        connection.close()


def backend_maps_check() -> bool:
    if not present(backend, "GOOGLE_MAPS_API_KEY"):
        return False
    try:
        result = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": "Caloocan City Hall", "key": backend["GOOGLE_MAPS_API_KEY"]},
            timeout=12,
        )
        return result.status_code == 200 and result.json().get("status") in ("OK", "ZERO_RESULTS")
    except Exception:
        return False


def vision_check() -> bool:
    if not present(backend, "GOOGLE_VISION_API_KEY"):
        return False
    from PIL import Image

    image = Image.new("RGB", (16, 16), "white")
    output = io.BytesIO()
    image.save(output, format="PNG")
    return http_ok(
        "https://vision.googleapis.com/v1/images:annotate",
        params={"key": backend["GOOGLE_VISION_API_KEY"]},
        method="POST",
        json={"requests": [{"image": {"content": base64.b64encode(output.getvalue()).decode("ascii")}, "features": [{"type": "TEXT_DETECTION"}]}]},
    )


def gemini_check() -> bool:
    if not present(backend, "GOOGLE_GEMINI_API_KEY"):
        return False
    return http_ok(
        "https://generativelanguage.googleapis.com/v1beta/models",
        params={"key": backend["GOOGLE_GEMINI_API_KEY"], "pageSize": 1},
    )


def recaptcha_check() -> bool:
    if not present(backend, "RECAPTCHA_SECRET_KEY"):
        return False
    try:
        result = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": backend["RECAPTCHA_SECRET_KEY"], "response": "synthetic-invalid-token"},
            timeout=12,
        )
        return result.status_code == 200 and "invalid-input-secret" not in result.json().get("error-codes", [])
    except Exception:
        return False


def not_safely_probeable() -> bool:
    return False


checks = {
    "JWT_SECRET_KEY": jwt_check,
    "DATABASE_URL": database_check,
    "POSTGRES_PASSWORD": compose_check,
    "GOOGLE_MAPS_API_KEY": backend_maps_check,
    "VITE_GOOGLE_MAPS_API_KEY": not_safely_probeable,
    "GOOGLE_VISION_API_KEY": vision_check,
    "GOOGLE_GEMINI_API_KEY": gemini_check,
    "GOOGLE_APPLICATION_CREDENTIALS": not_safely_probeable,
    "ANDROID_MANIFEST_GCP_KEY": not_safely_probeable,
    "OCR_LOG_GCP_API_KEY": not_safely_probeable,
    "OCR_API_KEY": not_safely_probeable,
    "SMTP_PASS": not_safely_probeable,
    "RECAPTCHA_SECRET_KEY": recaptcha_check,
    "VITE_RECAPTCHA_SITE_KEY": not_safely_probeable,
    "PHILSYS_API_ID": not_safely_probeable,
    "PHILSYS_API_SECRET": not_safely_probeable,
    "PHILSYS_QR_COOKIE": not_safely_probeable,
    "PHILSYS_PUBLIC_KEY": not_safely_probeable,
}

for key, check in checks.items():
    try:
        passed = bool(check())
    except Exception:
        passed = False
    print(f"{key}: {'PASS' if passed else 'FAIL'}")
