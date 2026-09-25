
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
import json

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    phone_number: Optional[str] = None
    is_active: bool = True
    is_verified: bool = True
    is_suspended: bool = False
    trust_score: int = 100
    created_at: datetime
    display_name: Optional[str] = None
    kyc_level: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class MockResident:
    def __init__(self):
        self.id = 2
        self.full_name = "Alexis Marc"
        self.email = "alexismarc066@gmail.com"
        self.phone_number = None
        self.is_active = True
        self.is_verified = True
        self.trust_score = 100
        self.kyc_level = "Bronze (Self-Signed)"
        self.created_at = datetime.now()
        self.barangay_id = 1
        self.district_id = 1
        self.barangay = "Barangay 1" # Assuming mapped

    @property
    def role(self): return "resident"

    @property
    def capabilities(self):
        return {"can_report": True}

try:
    mock = MockResident()
    resp = UserResponse.model_validate(mock)
    print("Resident Validation SUCCESS")
    print(resp.model_dump_json(indent=2))
except Exception as e:
    print(f"Resident Validation FAILED: {e}")

class MockOfficial:
    def __init__(self):
        self.id = 1
        self.full_name = "Admin 1"
        self.email = "admin@pulso.gov.ph"
        self.role = "admin" # column
        self.is_active = True
        self.is_suspended = False
        self.created_at = datetime.now()
        self.display_name = "System Admin"
        self.capabilities = {"admin": ["*"]} # property or column

try:
    mock_off = MockOfficial()
    resp_off = UserResponse.model_validate(mock_off)
    print("Official Validation SUCCESS")
except Exception as e:
    print(f"Official Validation FAILED: {e}")
