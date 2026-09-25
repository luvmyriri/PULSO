from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from database import get_db
from typing import Any, List, Union
from gov_models import SystemDocument
from auth import get_current_user
import os
import hashlib
import uuid
import json
import roles_service
from datetime import datetime, timedelta
from fastapi.responses import FileResponse

router = APIRouter()

UPLOAD_DIR = "uploads/docs"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_sha256(file_content: bytes) -> str:
    sha256_hash = hashlib.sha256()
    sha256_hash.update(file_content)
    return sha256_hash.hexdigest()

ALLOWED_EXTENSIONS = {
    'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
    'dwg', 'dxf', 'zip', 'rar', '7z'
}

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'image/vnd.dwg', 'image/x-dwg', 'application/dwg'
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# --- PULSO Retention & Gating Logic ---
# (document_type) -> (Category, Retention, Confidentiality)
RETENTION_MAP = {
    "as_built_plan":     ("Infrastructure", "PERPETUAL", "Public"),
    "building_permit":   ("Permits",        "PERPETUAL", "Restricted"),
    "materials_test":    ("Technical",      "10_YEARS",  "Restricted"),
    "draft_estimate":    ("Draft",          "2_YEARS",   "Confidential"),
    "resident_photo":    ("CitizenEvidence","5_YEARS",   "Restricted"),
    "survey_report":     ("Technical",      "10_YEARS",  "Restricted"),
    "topo_map":          ("Technical",      "10_YEARS",  "Restricted"),
    "design_plans":      ("Technical",      "PERPETUAL", "Restricted"),
    "pow":               ("Legal",          "10_YEARS",  "Restricted"),
    "abc":               ("Legal",          "10_YEARS",  "Restricted"),
    "ntp":               ("Legal",          "PERPETUAL", "Public"),
    "contract":          ("Legal",          "PERPETUAL", "Restricted"),
}

def calculate_expiry(policy: str, start_date: datetime):
    if policy == "PERPETUAL":
        return None
    years = int(policy.split('_')[0])
    return start_date + timedelta(days=years * 365)

def validate_file(file: UploadFile):
    """Validate file extension and content type."""
    filename = file.filename.lower()
    ext = filename.split('.')[-1] if '.' in filename else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    content_type = file.content_type or ''
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Content type '{content_type}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )
    
    return ext

@router.post("/upload")
async def upload_document(
    document_type: str = Form(...),
    target_model: str = Form(...),
    target_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Upload a document, calculate its SHA-256 fingerprint, and register it
    in the SystemDocument tracking table for status gating and FQA.
    """
    valid_models = ["ProjectRequest", "WorkOrder", "ProcurementRequest", "OBOInspection"]
    if target_model not in valid_models:
        raise HTTPException(status_code=400, detail="Invalid target model for document upload.")

    # Validate file type
    ext = validate_file(file)

    # Read the file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty.")
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")
    
    file_size = len(content)
    file_hash = generate_sha256(content)

    # Prevent uploading the exact duplicate (optional integrity check)
    existing_doc = db.query(SystemDocument).filter(
        SystemDocument.target_model == target_model,
        SystemDocument.target_id == target_id,
        SystemDocument.sha256_hash == file_hash
    ).first()

    if existing_doc:
        # If it already exists for this exact target, return success but don't duplicate
        return {
            "message": "File already exists with identical hash for this entity.",
            "document": {
                "id": existing_doc.id,
                "sha256_hash": existing_doc.sha256_hash,
                "document_type": existing_doc.document_type
            }
        }

    # Save format: {uuid}_{safe_filename}
    safe_filename = file.filename.replace(" ", "_").replace("/", "")
    unique_filename = f"{uuid.uuid4().hex}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Auto-assign Category & Retention based on type
    cat, policy, conf = RETENTION_MAP.get(document_type, ("Technical", "5_YEARS", "Restricted"))
    expiry = calculate_expiry(policy, datetime.now())

    # Register in DB
    new_doc = SystemDocument(
        document_type=document_type,
        file_path=file_path,
        file_name=safe_filename,
        file_size_bytes=file_size,
        sha256_hash=file_hash,
        category=cat,
        retention_policy=policy,
        confidentiality=conf,
        expiry_date=expiry,
        target_model=target_model,
        target_id=target_id,
        uploader_id=current_user.id
    )

    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {
        "message": "Document uploaded successfully.",
        "document": {
            "id": new_doc.id,
            "document_type": new_doc.document_type,
            "file_name": new_doc.file_name,
            "sha256_hash": new_doc.sha256_hash,
            "uploaded_at": new_doc.uploaded_at
        }
    }


@router.get("/get/{document_id}")
async def get_document_file(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Serves the physical file with strict session-based Gating.
    Enforces RBAC based on document confidentiality.
    """
    doc = db.query(SystemDocument).filter(SystemDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    role = current_user.role
    
    # PULSO Gating: Dynamic Role Capability Check
    if doc.confidentiality == "Confidential":
        # Only roles with records:view and executive/admin level should see confidential docs
        if not roles_service.has_permission(db, current_user, "records", "view"):
             raise HTTPException(status_code=403, detail="Access Denied: Missing Records capability.")
             
        # Additional layer: check if they are actually in the approved groups or have 'records:manage'
        if not roles_service.has_permission(db, current_user, "admin", "audit") and role not in ["city_engineer", "asst_city_engineer"]:
             # If not top-level executive, check if they have specific management rights
             if not roles_service.has_permission(db, current_user, "records", "manage"):
                 raise HTTPException(status_code=403, detail="Access Denied: Highly Confidential.")

    elif doc.confidentiality == "Restricted":
        # Check for fine-grained Records:View capability
        if not roles_service.has_permission(db, current_user, "records", "view"):
             # Residents specifically handled as before
             if role == "resident" and doc.target_model != "OBOInspection":
                 raise HTTPException(status_code=403, detail="Access Denied: Restricted Document.")
             elif role != "resident":
                 raise HTTPException(status_code=403, detail="Access Denied: Missing Records capability.")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File physical storage not found.")

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type='application/octet-stream'
    )


@router.get("/target/{model}/{target_id}")
def get_documents_by_target(
    model: str, 
    target_id: int, 
    db: Session = Depends(get_db), 
    current_user: Any = Depends(get_current_user)
):
    """
    Fetch all uploaded documents for a specific entity (e.g. ProjectRequest #12).
    """
    docs = db.query(SystemDocument).filter(
        SystemDocument.target_model == model,
        SystemDocument.target_id == target_id
    ).order_by(SystemDocument.uploaded_at.desc()).all()

    return docs


@router.get("/registry")
def get_document_registry(
    target_model: str = None,
    target_id: int = None,
    document_type: str = None,
    search: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Fetch all documents in the central registry with optional filters.
    Supports filtering by target_model, target_id, document_type, and search (by hash or filename).
    """
    # Gating: Registry visibility check
    # Only staff with records:view can browse the registry (as requested: Admin and Engineers)
    if current_user.role != "resident":
        if not roles_service.has_permission(db, current_user, "records", "view"):
             raise HTTPException(status_code=403, detail="Access Denied: Registry view requires Records capability.")

    query = db.query(SystemDocument)

    # Role-Based Visibility Filtering (Gating)
    # Convert role to lowercase for comparison and handle potential None
    role = str(current_user.role).lower() if current_user.role else "resident"
    
    if role not in ["chief", "admin", "city_engineer"]:
        # Non-admins cannot see 'Confidential' items
        query = query.filter(SystemDocument.confidentiality != "Confidential")
        
    if role == "resident":
        # Residents only see 'Public' documents in the general registry
        query = query.filter(SystemDocument.confidentiality == "Public")
    
    if target_model:
        query = query.filter(SystemDocument.target_model == target_model)
    if target_id:
        query = query.filter(SystemDocument.target_id == target_id)
    if document_type:
        query = query.filter(SystemDocument.document_type == document_type)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (SystemDocument.sha256_hash.ilike(search_term)) |
            (SystemDocument.file_name.ilike(search_term))
        )
    
    total = query.count()
    docs = query.order_by(SystemDocument.uploaded_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "documents": docs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/registry/counts")
def get_document_counts(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Get document counts by target_model for the registry dashboard.
    """
    counts = {}
    target_models = ["ProjectRequest", "WorkOrder", "ProcurementRequest", "OBOInspection"]
    for model in target_models:
        count = db.query(SystemDocument).filter(SystemDocument.target_model == model).count()
        counts[model] = count
    
    doc_type_counts = {}
    doc_types = db.query(SystemDocument.document_type).distinct().all()
    for (doc_type,) in doc_types:
        cnt = db.query(SystemDocument).filter(SystemDocument.document_type == doc_type).count()
        doc_type_counts[doc_type] = cnt
    
    return {
        "by_target_model": counts,
        "by_document_type": doc_type_counts
    }


@router.patch("/{document_id}/legal-hold")
def toggle_legal_hold(
    document_id: int,
    payload: dict, # {"legal_hold": bool}
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Toggle legal hold status. Only for Admin/Chief.
    """
    if current_user.role not in ["Admin", "Chief", "CityEngineer"]:
        raise HTTPException(status_code=403, detail="Unauthorized to modify legal hold.")
    
    doc = db.query(SystemDocument).filter(SystemDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.legal_hold = payload.get("legal_hold", False)
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Delete a document by ID. Removes the file from storage and database record.
    Blocked if legal_hold is active.
    """
    doc = db.query(SystemDocument).filter(SystemDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.legal_hold:
        raise HTTPException(status_code=403, detail="Cannot delete document under Legal Hold.")

    # Remove the file from storage if it exists
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except OSError as e:
            print(f"Failed to delete file {doc.file_path}: {e}")

    # Delete the database record
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully."}

