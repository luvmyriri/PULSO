"""Optional, idempotent local staff seed. Never use for production accounts."""

import secrets

from database import SessionLocal
from models import Official, SystemRole
from auth import get_password_hash


ROLE_NAME = "field_worker"
STAFF_EMAIL = "dev.staff@example.invalid"
# Every entry below corresponds to an explicit has_permission/assert_permission
# check in the application. No administrative or write capability is granted.
ROLE_CAPABILITIES = {
    "analytics": ["view"],
    "records": ["view"],
    "reports": ["detail"],
}


def main() -> None:
    db = SessionLocal()
    password = None
    try:
        role = db.query(SystemRole).filter(SystemRole.name == ROLE_NAME).one_or_none()
        if role is None:
            role = SystemRole(
                name=ROLE_NAME,
                label="Synthetic local field worker",
                capabilities=ROLE_CAPABILITIES,
                access_level="staff",
                is_template=False,
            )
            db.add(role)
            db.flush()

        official = db.query(Official).filter(Official.email == STAFF_EMAIL).one_or_none()
        if official is None:
            password = secrets.token_urlsafe(24)
            db.add(
                Official(
                    full_name="Synthetic Local Staff",
                    email=STAFF_EMAIL,
                    password_hash=get_password_hash(password),
                    role=ROLE_NAME,
                    role_id=role.id,
                    account_type="staff",
                    is_active=True,
                    is_suspended=False,
                )
            )

        db.commit()
        if password is None:
            print("Synthetic local staff already exists; no password or data changed.")
        else:
            # Deliberately emit only after commit. Never persist the raw password.
            print(f"Synthetic local staff: {STAFF_EMAIL}")
            print(f"Generated password (shown once): {password}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
