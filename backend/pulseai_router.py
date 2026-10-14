"""
pulseai_router.py — Persistent Chat History & Conversations API for PULSEAI
Caloocan City Engineering Office — PULSO System

Endpoints:
  GET    /api/pulseai/conversations                  -> List current resident's conversations
  GET    /api/pulseai/conversations/{user_id}        -> List conversations for specific user (self or authorized staff)
  POST   /api/pulseai/conversations                  -> Create a new conversation session
  GET    /api/pulseai/conversations/{id}/messages    -> Get paginated message history for a conversation
  POST   /api/pulseai/conversations/{id}/messages    -> Send message, get grounded AI reply, record audit tools
  DELETE /api/pulseai/conversations/{id}             -> Delete a single conversation (privacy control)
  DELETE /api/pulseai/conversations                  -> Clear all conversations for resident (account privacy)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
from datetime import datetime
import re

import models
import gemini_service
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/pulseai", tags=["PulseAI"])


# ── Pydantic Request / Response Schemas ────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    query: str
    context: Optional[str] = None


# ── Helper: Generate clean title from resident query ───────────────────────────

def _generate_auto_title(query: str) -> str:
    """Generate a clean, readable conversation title from the first resident query."""
    clean = re.sub(r'[\r\n\t]+', ' ', query).strip()
    # Remove leading question formatting if present
    clean = re.sub(r'^(hi|hello|hey|good\s+(morning|afternoon|evening)|ask pulseai:?)\s*,?\s*', '', clean, flags=re.IGNORECASE).strip()
    if not clean:
        clean = query.strip()
    if len(clean) > 42:
        # Find nearest word break
        truncated = clean[:42]
        last_space = truncated.rfind(' ')
        if last_space > 20:
            truncated = truncated[:last_space]
        return f"{truncated}..."
    return clean[:45]


# ── 1. List Conversations ─────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    List past conversations for the authenticated resident account, most recent first.
    Returns id, title, timestamps, message count, and last message preview.
    """
    user_id = current_user.id

    convs = (
        db.query(models.ChatConversation)
        .filter(models.ChatConversation.user_id == user_id)
        .order_by(desc(models.ChatConversation.updated_at))
        .limit(limit)
        .all()
    )

    results = []
    for c in convs:
        last_msg = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.conversation_id == c.id)
            .order_by(desc(models.ChatMessage.created_at))
            .first()
        )
        msg_count = (
            db.query(func.count(models.ChatMessage.id))
            .filter(models.ChatMessage.conversation_id == c.id)
            .scalar() or 0
        )

        preview = ""
        if last_msg:
            # Clean markdown formatting from snippet preview
            clean_text = re.sub(r'[\*\_#`]', '', last_msg.content).strip()
            preview = clean_text[:80] + ("..." if len(clean_text) > 80 else "")

        results.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "message_count": msg_count,
            "last_message": preview,
            "last_role": last_msg.role if last_msg else None
        })

    return {"conversations": results, "count": len(results)}


@router.get("/conversations/{user_id_param}")
def list_conversations_by_param(
    user_id_param: str,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Allows route matching GET /api/pulseai/conversations/:userId.
    Enforces that residents may only query their own conversations.
    """
    try:
        target_uid = int(user_id_param)
    except ValueError:
        # Not an integer ID, return standard list for current user
        return list_conversations(limit=limit, db=db, current_user=current_user)

    is_staff = hasattr(current_user, 'role') and current_user.role in ['admin', 'city_engineer', 'dispatcher']
    if current_user.id != target_uid and not is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view chat conversations belonging to your own account."
        )

    convs = (
        db.query(models.ChatConversation)
        .filter(models.ChatConversation.user_id == target_uid)
        .order_by(desc(models.ChatConversation.updated_at))
        .limit(limit)
        .all()
    )

    results = []
    for c in convs:
        last_msg = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.conversation_id == c.id)
            .order_by(desc(models.ChatMessage.created_at))
            .first()
        )
        msg_count = (
            db.query(func.count(models.ChatMessage.id))
            .filter(models.ChatMessage.conversation_id == c.id)
            .scalar() or 0
        )
        preview = ""
        if last_msg:
            clean_text = re.sub(r'[\*\_#`]', '', last_msg.content).strip()
            preview = clean_text[:80] + ("..." if len(clean_text) > 80 else "")

        results.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "message_count": msg_count,
            "last_message": preview,
            "last_role": last_msg.role if last_msg else None
        })

    return {"conversations": results, "count": len(results)}


# ── 2. Create Conversation ────────────────────────────────────────────────────

@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(
    req: CreateConversationRequest = CreateConversationRequest(),
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Start a fresh PULSEAI conversation session for the resident.
    """
    title = (req.title or "").strip() or "New Conversation"
    conv = models.ChatConversation(
        user_id=current_user.id,
        title=title
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "messages": []
    }


# ── 3. Get Messages in a Conversation ──────────────────────────────────────────

@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Retrieve message history for a specific conversation.
    Supports pagination via `limit` and `before_id` for long conversations.
    """
    conv = db.query(models.ChatConversation).filter(models.ChatConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_staff = hasattr(current_user, 'role') and current_user.role in ['admin', 'city_engineer', 'dispatcher']
    if conv.user_id != current_user.id and not is_staff:
        raise HTTPException(status_code=403, detail="You do not have permission to view this conversation.")

    query = db.query(models.ChatMessage).filter(models.ChatMessage.conversation_id == conversation_id)
    if before_id:
        query = query.filter(models.ChatMessage.id < before_id)

    # Order asc for reading flow
    messages = query.order_by(models.ChatMessage.created_at.asc()).limit(limit).all()

    return {
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "tool_name": m.tool_name
            }
            for m in messages
        ],
        "count": len(messages)
    }


# ── 4. Append Message & Generate Grounded Response ────────────────────────────

@router.post("/conversations/{conversation_id}/messages")
def append_message_and_respond(
    conversation_id: int,
    req: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Appends a resident's message to an existing conversation, invokes PULSEAI
    with database tool-grounding, stores both user and assistant messages,
    and auto-titles the conversation if it still carries the default name.
    """
    conv = db.query(models.ChatConversation).filter(models.ChatConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_staff = hasattr(current_user, 'role') and current_user.role in ['admin', 'city_engineer', 'dispatcher']
    if conv.user_id != current_user.id and not is_staff:
        raise HTTPException(status_code=403, detail="You do not have permission to post to this conversation.")

    query_text = (req.query or "").strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query message cannot be empty.")

    # 1. Save resident user message
    user_msg = models.ChatMessage(
        conversation_id=conv.id,
        role="user",
        content=query_text
    )
    db.add(user_msg)

    # 2. Auto-generate title if default or first interaction
    if conv.title in ["New Conversation", "", None]:
        conv.title = _generate_auto_title(query_text)

    # 3. Call AI Assistant with full grounding & tool audit
    user_ctx = f"Resident: {current_user.full_name} (Barangay: {getattr(current_user, 'barangay', 'North Caloocan')}). {req.context or ''}"
    ai_result = gemini_service.get_ai_assistant_response(
        query=query_text,
        context=user_ctx,
        user=current_user,
        db=db
    )

    response_text = ai_result.get("response") or "I could not process your request at this time."
    tool_name = ai_result.get("tool_name")
    tool_data = ai_result.get("tool_data")

    # 4. Save assistant response
    assistant_msg = models.ChatMessage(
        conversation_id=conv.id,
        role="assistant",
        content=response_text,
        tool_name=tool_name,
        tool_data=tool_data
    )
    db.add(assistant_msg)

    # 5. Update conversation timestamp
    conv.updated_at = func.now()
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)
    db.refresh(conv)

    return {
        "response": response_text,
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None
        },
        "user_message": {
            "id": user_msg.id,
            "role": user_msg.role,
            "content": user_msg.content,
            "created_at": user_msg.created_at.isoformat() if user_msg.created_at else None
        },
        "assistant_message": {
            "id": assistant_msg.id,
            "role": assistant_msg.role,
            "content": assistant_msg.content,
            "created_at": assistant_msg.created_at.isoformat() if assistant_msg.created_at else None,
            "tool_name": assistant_msg.tool_name
        }
    }


# ── 5. Delete Single Conversation ─────────────────────────────────────────────

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Deletes an individual conversation and all its messages.
    Enforces resident ownership (RA 10173 Right to Erasure).
    """
    conv = db.query(models.ChatConversation).filter(models.ChatConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    is_staff = hasattr(current_user, 'role') and current_user.role in ['admin', 'city_engineer', 'dispatcher']
    if conv.user_id != current_user.id and not is_staff:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this conversation.")

    db.delete(conv)
    db.commit()

    return {"message": "Conversation deleted successfully.", "conversation_id": conversation_id}


# ── 6. Clear All Conversations (Account Privacy) ───────────────────────────────

@router.delete("/conversations")
def clear_all_conversations(
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(get_current_user)
):
    """
    Wipes all chat conversations and messages for the authenticated resident.
    Provides complete user control over conversational data history.
    """
    count = db.query(models.ChatConversation).filter(models.ChatConversation.user_id == current_user.id).delete()
    db.commit()

    return {"message": "All conversations deleted successfully.", "deleted_count": count}
