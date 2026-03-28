"""Robust test for modular ID parsers."""
import sys
import json
sys.path.insert(0, '.')

from id_parsers import get_parser

def test_id(label, id_type, raw_text):
    print(f"\n{'='*20} {label} {'='*20}")
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    parser = get_parser(id_type)
    result = parser.extract(raw_text, lines)
    # Print formatted JSON for clarity
    print(json.dumps(result, indent=2))

# 1. PhilID
test_id("PhilID / National ID", "philid", """
PHILIPPINE IDENTIFICATION SYSTEM
Last Name
NATIVIDAD
First Name
ARC ALEXIS
Middle Name
CRUZ
Date of Birth
01/05/2005
Sex
Male
BLK 40 LOT 3 NORTHVILLE 2B BAGUMBONG, BARANGAY 171, CITY OF CALOOCAN, NCR, THIRD DISTRICT, PHILIPPINES, 1421
""")

# 2. LTO
test_id("LTO Driver License", "lto", """
LAND TRANSPORTATION OFFICE
DELA CRUZ, JUAN PEDRO M.
Nationality: FILIPINO
Date of Birth: 05/15/1990
Sex: MALE
Address: 123 Sampaguita St., Brgy 172, Caloocan City
Expiry: 08/23/2027
""")

# 3. PRC
test_id("PRC Professional ID", "prc", """
PROFESSIONAL REGULATION COMMISSION
Last Name: SANTOS
First Name: MARIA ELENA
Date of Birth: 1985-03-21
Valid Until: 2027-12-31
""")

# 4. Passport
test_id("Philippine Passport (MRZ)", "passport", """
REPUBLIC OF THE PHILIPPINES
PASSPORT
P<PHLDELA CRUZ<<JUAN<PEDRO<<<<<<<<<<<<<<
XX1234567PHL8501011M2501011<<<<<<<<<<<<<<<4
""")

print("\nAll tests complete.")
