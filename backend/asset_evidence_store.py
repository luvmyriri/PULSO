"""Shared private image storage; caller owns the database transaction/cleanup."""
from hashlib import sha256
from io import BytesIO
from uuid import UUID, uuid4

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import text
from gov_models import AssetInspectionEvidence

MAX_EVIDENCE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {'PNG':('.png','image/png'),'JPEG':('.jpg','image/jpeg'),'WEBP':('.webp','image/webp')}


def evidence_lock_key(evidence_id):
    return int(UUID(evidence_id).hex[:16],16) % (2**63)


def store_image(db, root, asset_id, actor_id, data):
    if not data or len(data) > MAX_EVIDENCE_BYTES:
        raise HTTPException(422,'Choose an image up to 5 MB.')
    try:
        with Image.open(BytesIO(data)) as image:
            kind = image.format
            image.verify()
        suffix, media_type = IMAGE_TYPES[kind]
    except (UnidentifiedImageError,KeyError,ValueError,OSError,Image.DecompressionBombError):
        raise HTTPException(422,'Choose a valid PNG, JPEG or WebP image.')
    evidence_id = str(uuid4())
    # A reconciler cannot remove bytes while their producing transaction is active.
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':evidence_lock_key(evidence_id)})
    folder = root / evidence_id[:2]
    folder.mkdir(parents=True,exist_ok=True)
    location = folder / f'{evidence_id}{suffix}'
    created = False
    try:
        with location.open('xb') as target:
            created = True
            target.write(data)
    except OSError:
        if created:
            location.unlink(missing_ok=True)
        raise
    row = AssetInspectionEvidence(id=evidence_id,asset_id=asset_id,uploaded_by_id=actor_id,
        stored_path=str(location.relative_to(root)),content_type=media_type,byte_size=len(data),sha256=sha256(data).hexdigest())
    db.add(row)
    return row,location
