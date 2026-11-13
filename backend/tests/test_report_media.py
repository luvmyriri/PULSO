"""Exercise real report media policy with synthetic records and images."""

from io import BytesIO

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

import main
import models
from tests.test_resident_government_integration import connected, submit


def attach_photo(client, directory, headers=None):
    response = submit(client, headers)
    assert response.status_code == 201, response.text
    report = response.json()
    exif = Image.Exif()
    exif[270] = "SAMPLE private camera metadata"
    path = directory / report["image_url"].rsplit("/", 1)[-1]
    Image.new("RGB", (100, 60), "navy").save(path, format="JPEG", exif=exif)
    return report, path.read_bytes()


def test_public_thumbnail_checks_publication_before_rendering_and_after_withdrawal(connected):
    client, sessions, headers, directory = connected
    report, original = attach_photo(client, directory, headers["resident"])
    path = report["image_url"]
    filename = path.rsplit("/", 1)[-1]
    references = [path, path.removeprefix("/api"), path.removeprefix("/api/")]
    for reference in references:
        assert client.get("/api/thumbnails", params={"src": reference}).status_code == 404
    assert client.get("/api/thumbnails", params={"src": path}, headers=headers["chief"]).status_code == 404
    with sessions() as db:
        row = db.get(models.Report, report["id"])
        row.status = "validated"
        db.commit()
    public = client.get("/api/reports/public").json()
    photo_url = next(row["image_url"] for row in public if row["id"] == report["id"])
    preview = client.get(photo_url)
    assert preview.status_code == 200 and preview.content != original
    assert preview.headers["cache-control"] == "private, no-store"
    assert preview.headers["content-type"] == "image/jpeg"
    with Image.open(BytesIO(preview.content)) as image:
        assert image.size == (100, 60)
        assert not image.getexif()
    assert client.get(photo_url).content == preview.content
    Image.new("RGB", (120, 70), "maroon").save(directory / filename, format="JPEG")
    updated = client.get(photo_url)
    assert updated.status_code == 200 and updated.content != preview.content
    with Image.open(BytesIO(updated.content)) as image:
        assert image.size == (120, 70)
    assert client.get("/api/thumbnails", params={"src": f"/api/uploads/reports/../reports/{filename}"}).status_code == 404
    with sessions() as db:
        row = db.get(models.Report, report["id"])
        row.status = "rejected"
        db.commit()
    assert client.get(photo_url).status_code == 404


def test_public_thumbnail_rejects_orphan_and_shared_private_proof(connected):
    client, sessions, headers, directory = connected
    report, _ = attach_photo(client, directory, headers["resident"])
    with sessions() as db:
        row = db.get(models.Report, report["id"])
        row.status = "validated"
        other = models.Report(ticket_id="SAMPLE-SHARED-PRIVATE", category="Roads", description="SAMPLE work proof",
            status="pending", resolution_image_url=report["image_url"])
        db.add(other)
        db.commit()
    assert client.get("/api/thumbnails", params={"src": report["image_url"]}).status_code == 404
    Image.new("RGB", (40, 40)).save(directory / "orphan.jpg")
    assert client.get("/api/thumbnails", params={"src": "/uploads/reports/orphan.jpg"}).status_code == 404


def test_both_legacy_mounts_refuse_previous_thumbnail_cache_files(tmp_path):
    (tmp_path / "thumbnails").mkdir()
    (tmp_path / "thumbnails" / "old.jpg").write_bytes(b"SAMPLE old cache")
    (tmp_path / "news").mkdir()
    (tmp_path / "news" / "public.jpg").write_bytes(b"SAMPLE public news")
    app = FastAPI()
    for mount in ("/api/uploads", "/uploads"):
        app.mount(mount, main.PublicUploadFiles(directory=tmp_path))
    client = TestClient(app)
    for mount in ("/api/uploads", "/uploads"):
        assert client.get(f"{mount}/thumbnails/old.jpg").status_code == 404
        assert client.head(f"{mount}/%74humbnails/old.jpg").status_code == 404
        assert client.get(f"{mount}/news/public.jpg").content == b"SAMPLE public news"


def test_original_requires_owner_or_scoped_staff_and_preserves_bytes(connected):
    client, sessions, headers, directory = connected
    report, original = attach_photo(client, directory, headers["resident"])
    path = f"/api/reports/{report['id']}/photo"
    assert client.get(path).status_code == 401
    for actor in ("resident", "chief"):
        response = client.get(path, headers=headers[actor])
        assert response.status_code == 200 and response.content == original
        assert response.headers["content-type"] == "image/jpeg"
        assert response.headers["cache-control"] == "private, no-store"
    with sessions() as db:
        db.get(models.Official, 1).primary_jurisdiction = [1]
        db.commit()
    assert client.get(path, headers=headers["chief"]).status_code == 404
    guest, _ = attach_photo(client, directory)
    assert client.get(f"/api/reports/{guest['id']}/photo", headers=headers["resident"]).status_code == 404


def test_guest_original_uses_only_a_matching_private_tracking_token(connected):
    client, _, _, directory = connected
    report, original = attach_photo(client, directory)
    path = "/api/reports/track/photo"
    ticket = report["ticket_id"]
    for body in ({"ticket_id": ticket}, {"ticket_id": ticket, "tracking_token": ticket},
                 {"ticket_id": ticket, "contact": "guest@test.invalid"},
                 {"ticket_id": "SAMPLE-NONEXISTENT", "tracking_token": report["tracking_token"]}):
        response = client.post(path, json=body)
        assert response.status_code == 404 and response.json() == {"detail": "Image not found"}
    response = client.post(path, json={"ticket_id": ticket, "tracking_token": report["tracking_token"]})
    assert response.status_code == 200 and response.content == original
    assert response.headers["cache-control"] == "private, no-store"
