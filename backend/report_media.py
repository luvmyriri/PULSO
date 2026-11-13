"""Resolve recorded local report media and render metadata-free public previews."""

from functools import lru_cache
from io import BytesIO
from pathlib import Path
import re

from fastapi import HTTPException, Response
from fastapi.responses import FileResponse
from PIL import Image, ImageOps
from sqlalchemy import or_

import models
from public_reports import PUBLIC_REPORT_STATUSES


IMAGE_PATH = re.compile(r"/?(?:api/)?uploads/(reports|news)/([A-Za-z0-9_-]{1,120}\.(?:jpe?g|png|webp))", re.I)
MEDIA_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
NO_STORE = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
MAX_PIXELS = 25_000_000


def missing_photo():
    return HTTPException(404, "Image not found", headers=NO_STORE)


def image_reference(value):
    match = IMAGE_PATH.fullmatch(value or "")
    if not match:
        raise missing_photo()
    return match[1].lower(), match[2]


def local_image(directory, filename):
    try:
        root = Path(directory).resolve()
        path = (root / filename).resolve()
        if path == root / filename and path.is_file():
            return path
    except (OSError, RuntimeError):
        pass
    raise missing_photo()


def original(report, directory):
    folder, filename = image_reference(report.image_url)
    if folder != "reports":
        raise missing_photo()
    path = local_image(directory, filename)
    try:
        with Image.open(path) as image:
            media_type = MEDIA_TYPES[image.format]
    except (OSError, ValueError, KeyError, Image.DecompressionBombError):
        raise missing_photo() from None
    return FileResponse(path, media_type=media_type, headers=NO_STORE)


def public_thumbnail(db, src, size, report_dir, news_dir):
    folder, filename = image_reference(src)
    if folder == "reports":
        references = (f"/api/uploads/reports/{filename}", f"/uploads/reports/{filename}", f"uploads/reports/{filename}")
        matches = db.query(models.Report.status, models.Report.image_url, models.Report.resolution_image_url).filter(
            or_(models.Report.image_url.in_(references), models.Report.resolution_image_url.in_(references))
        ).limit(101).all()
        # An unreviewed or proof-only reference must not be bypassed by another row sharing the file.
        if (not matches or len(matches) > 100 or any(
                report_status not in PUBLIC_REPORT_STATUSES or image_url not in references or proof_url in references
                for report_status, image_url, proof_url in matches)):
            raise missing_photo()
    path = local_image(report_dir if folder == "reports" else news_dir, filename)
    try:
        revision = path.stat()
        image_bytes = render_thumbnail(path, size, revision.st_size, revision.st_mtime_ns, revision.st_ctime_ns)
    except (OSError, ValueError, Image.DecompressionBombError):
        raise missing_photo() from None
    return Response(image_bytes, media_type="image/jpeg", headers={
        **NO_STORE, "Access-Control-Allow-Origin": "*", "Cross-Origin-Resource-Policy": "cross-origin",
    })


@lru_cache(maxsize=64)
def render_thumbnail(path, size, byte_count, modified_ns, changed_ns):
    """Cache encoded bytes in process by file revision, after the caller authorizes every read."""
    with Image.open(path) as source:
        if source.format not in MEDIA_TYPES or source.width * source.height > MAX_PIXELS:
            raise missing_photo()
        image = ImageOps.exif_transpose(source).convert("RGB")
        if size == 512:
            image.thumbnail((size, size), Image.Resampling.LANCZOS)
        else:
            image = ImageOps.fit(image, (size, size), Image.Resampling.LANCZOS)
        # Paste pixels into a fresh image so EXIF, XMP and other source metadata never travel.
        preview = Image.new("RGB", image.size)
        preview.paste(image)
        output = BytesIO()
        preview.save(output, "JPEG", quality=85, optimize=True)
        return output.getvalue()
