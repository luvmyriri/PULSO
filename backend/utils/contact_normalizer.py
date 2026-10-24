import re

def normalize_email(email: str) -> str:
    """
    Normalizes an email address for duplicate checking.
    - Strips whitespace and lowercases.
    - For Gmail / Googlemail: strips dots in username and ignores everything after '+' tag.
    - For all other providers: only trims and lowercases.
    """
    if not email:
        return ""
    clean = email.strip().lower()
    if "@" not in clean:
        return clean
    
    user_part, domain_part = clean.split("@", 1)
    
    if domain_part in ("gmail.com", "googlemail.com"):
        # Normalize googlemail.com to gmail.com
        domain_part = "gmail.com"
        # Ignore everything after '+' in user part
        user_part = user_part.split("+")[0]
        # Remove dots in user part
        user_part = user_part.replace(".", "")
        
    return f"{user_part}@{domain_part}"


def normalize_phone_number(phone: str) -> str:
    """
    Normalizes Philippine mobile number into standard E.164 format (+639XXXXXXXXX).
    Handles:
    - 09171234567 -> +639171234567
    - 639171234567 -> +639171234567
    - +639171234567 -> +639171234567
    - 9171234567 -> +639171234567
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    
    if digits.startswith("639") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("09") and len(digits) == 11:
        return f"+63{digits[1:]}"
    if digits.startswith("9") and len(digits) == 10:
        return f"+63{digits}"
    if len(digits) >= 10:
        suffix_10 = digits[-10:]
        if suffix_10.startswith("9"):
            return f"+63{suffix_10}"
            
    return digits if digits else ""


def mask_email(email: str) -> str:
    """
    Masks an email for user-facing privacy display (e.g. a*****a@gmail.com).
    """
    if not email or "@" not in email:
        return email or ""
    user_part, domain_part = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "*" * 4
    else:
        masked_user = user_part[0] + "*" * 5 + user_part[-1]
    return f"{masked_user}@{domain_part}"


def mask_phone_number(phone: str) -> str:
    """
    Masks a phone number for user-facing privacy display (e.g. 0907 *** 0705).
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    # Convert to 09XXXXXXXXX format if needed
    if digits.startswith("639") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
        
    if len(digits) == 11:
        return f"{digits[:4]} *** {digits[-4:]}"
    if len(digits) >= 7:
        return f"{digits[:3]} *** {digits[-4:]}"
    return phone
