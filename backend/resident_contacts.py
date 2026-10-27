"""Shared resident contact uniqueness across registration and staff administration."""
from fastapi import HTTPException
from sqlalchemy import func, or_, case, and_
import models
from utils.contact_normalizer import normalize_email, normalize_phone_number


def conflicts(db, email=None, phone=None, exclude_id=None):
    confirmed = db.query(models.Resident).filter(models.Resident.is_verified.is_(True))
    if exclude_id is not None:
        confirmed = confirmed.filter(models.Resident.id != exclude_id)
    normalized_email = normalize_email(email) if email else None
    normalized_phone = normalize_phone_number(phone) if phone else None
    clean_email = func.lower(func.trim(models.Resident.email))
    domain = func.split_part(clean_email, '@', 2)
    email_identity = case((domain.in_(['gmail.com', 'googlemail.com']),
        func.replace(func.split_part(func.split_part(clean_email, '@', 1), '+', 1), '.', '') + '@gmail.com'), else_=clean_email)
    phone_digits = func.regexp_replace(models.Resident.phone_number, '[^0-9]', '', 'g')
    digits = normalized_phone.lstrip('+') if normalized_phone else ''
    phone_forms = [digits, '0' + digits[2:], digits[2:]] if digits.startswith('639') else [digits]
    email_taken = bool(normalized_email and confirmed.filter(or_(
        models.Resident.normalized_email == normalized_email,
        and_(models.Resident.normalized_email.is_(None), email_identity == normalized_email),
        func.lower(models.Resident.email) == email.strip().lower())).first())
    phone_taken = bool(normalized_phone and confirmed.filter(or_(
        models.Resident.normalized_phone_number == normalized_phone,
        and_(models.Resident.normalized_phone_number.is_(None), phone_digits.in_(phone_forms)),
        models.Resident.phone_number == phone.strip(),
        models.Resident.phone_number == normalized_phone)).first())
    # Staff sign-in remains a distinct account namespace, but cannot be shadowed by registration.
    if normalized_email:
        email_taken = email_taken or bool(db.query(models.Official).filter(
            func.lower(models.Official.email).in_([normalized_email, email.strip().lower()])).first())
    if normalized_phone:
        phone_taken = phone_taken or bool(db.query(models.Official).filter(
            models.Official.phone_number.in_([normalized_phone, phone.strip()])).first())
    return email_taken, phone_taken


def ensure_available(db, email, phone=None, exclude_id=None):
    email_taken, phone_taken = conflicts(db, email, phone, exclude_id)
    if email_taken:
        raise HTTPException(409, "This email is already registered. Try logging in, or use a different email.")
    if phone_taken:
        raise HTTPException(409, "This mobile number is already registered. Try logging in, or use a different number.")


def normalize_resident(resident):
    resident.normalized_email = normalize_email(resident.email) or None
    resident.normalized_phone_number = normalize_phone_number(resident.phone_number) or None
