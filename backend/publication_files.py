"""Private draft files. Only an available immutable release grants public access."""
from io import BytesIO
from pathlib import Path
from uuid import UUID
import os
import zipfile
from fastapi import HTTPException
from fastapi.responses import FileResponse

ROOT = Path(os.getenv('PUBLICATION_FILE_DIR', Path(__file__).parent / 'private_publications'))
MAX_BYTES = 15 * 1024 * 1024
TYPES = {'.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}


def validate(data, name):
    ext = Path(name).suffix.lower()
    if not data or len(data) > MAX_BYTES or ext not in TYPES:
        raise HTTPException(422, 'Choose a PDF, image, text, Word or Excel file up to 15 MB.')
    try:
        if ext == '.pdf':
            if not data.startswith(b'%PDF-'): raise ValueError()
        elif ext in {'.png', '.jpg', '.jpeg', '.webp'}:
            from PIL import Image
            with Image.open(BytesIO(data)) as image:
                if image.format != {'.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WEBP'}[ext]: raise ValueError()
                image.verify()
        elif ext == '.txt':
            data.decode('utf-8')
        else:
            with zipfile.ZipFile(BytesIO(data)) as z:
                expected = 'word/document.xml' if ext == '.docx' else 'xl/workbook.xml'
                if expected not in z.namelist() or any('vbaProject' in n for n in z.namelist()): raise ValueError()
    except Exception:
        raise HTTPException(422, 'The file contents do not match the selected file type.')
    return TYPES[ext]


def path(announcement_id, file_id):
    try:
        UUID(file_id)
    except ValueError:
        raise HTTPException(404, 'Document not found.')
    return ROOT / str(int(announcement_id)) / file_id


def response(announcement_id, metadata):
    location = path(announcement_id, metadata['id'])
    if not location.is_file(): raise HTTPException(404, 'Document is temporarily unavailable.')
    inline = metadata['media_type'] in {'application/pdf', 'image/png', 'image/jpeg', 'image/webp'}
    return FileResponse(location, filename=metadata['name'], media_type=metadata['media_type'], content_disposition_type='inline' if inline else 'attachment', headers={
        'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 " + os.getenv('PUBLIC_WEB_ORIGIN', ''),
    })
