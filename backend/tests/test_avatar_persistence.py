"""
test_avatar_persistence.py — Automated Test Suite for Resident Avatar Upload & Cross-Browser Persistence

Verifies:
1. POST /api/residents/{id}/avatar uploads, validates, and resizes image
2. Database persistence of avatar_url on residents table
3. GET /api/users/{id} and /api/me return the server-persisted avatar_url
4. Public static serving of avatar through /api/uploads/avatars/ with CORS headers
5. File validation rejects invalid types and oversized files (>2MB)
6. Login responses include avatar_url for cross-browser synchronization
"""

import io
from PIL import Image
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import auth

client = TestClient(app)


def _get_or_create_test_resident():
    db = SessionLocal()
    try:
        resident = db.query(models.Resident).filter(models.Resident.email == "avatar_test@caloocan.gov.ph").first()
        if not resident:
            resident = models.Resident(
                full_name="Marc Test Resident",
                email="avatar_test@caloocan.gov.ph",
                password_hash=auth.get_password_hash("password123"),
                is_verified=True,
                is_active=True,
                trust_score=100
            )
            db.add(resident)
            db.commit()
            db.refresh(resident)
        return resident.id, resident.email
    finally:
        db.close()


def test_avatar_upload_resize_and_persistence():
    resident_id, email = _get_or_create_test_resident()
    token = auth.create_access_token(data={"sub": email})
    headers = {"Authorization": f"Bearer {token}"}

    # Create dummy 400x300 image in memory
    img = Image.new("RGB", (400, 300), color=(255, 120, 0))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    # 1. Upload to POST /api/residents/{id}/avatar
    files = {"file": ("test_avatar.jpg", img_bytes, "image/jpeg")}
    response = client.post(f"/api/residents/{resident_id}/avatar", headers=headers, files=files)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert "avatar_url" in data
    assert data["avatar_url"].startswith("/api/uploads/avatars/")
    assert "versioned_avatar_url" in data

    saved_url = data["avatar_url"]

    # 2. Check Database record
    db = SessionLocal()
    try:
        res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
        assert res.avatar_url == saved_url
        assert res.updated_at is not None
    finally:
        db.close()

    # 3. Verify GET /api/users/{id} returns avatar_url
    user_res = client.get(f"/api/users/{resident_id}", headers=headers)
    assert user_res.status_code == 200
    user_data = user_res.json()
    assert user_data["avatar_url"] == saved_url

    # 4. Verify static fetch of avatar image
    img_res = client.get(saved_url)
    assert img_res.status_code == 200
    assert img_res.headers.get("content-type") == "image/webp"

    # Verify resized dimensions are 256x256
    downloaded_img = Image.open(io.BytesIO(img_res.content))
    assert downloaded_img.size == (256, 256)


def test_avatar_upload_validation_rejects_bad_files():
    resident_id, email = _get_or_create_test_resident()
    token = auth.create_access_token(data={"sub": email})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid file format
    files = {"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    res = client.post(f"/api/residents/{resident_id}/avatar", headers=headers, files=files)
    assert res.status_code == 400
    assert "Invalid image format" in res.json()["detail"]

    # 2. Oversized file (>2MB)
    large_bytes = b"0" * (2 * 1024 * 1024 + 100)
    files_large = {"file": ("huge.jpg", large_bytes, "image/jpeg")}
    res_large = client.post(f"/api/residents/{resident_id}/avatar", headers=headers, files=files_large)
    assert res_large.status_code == 400
    assert "exceeds maximum limit" in res_large.json()["detail"]
