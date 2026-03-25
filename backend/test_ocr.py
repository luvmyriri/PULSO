"""
test_ocr.py — Comprehensive Philippine ID OCR Test Suite
Tests all 9 major PH government IDs against the extract_id_details()
and detect_id_type() functions using synthetic OCR text.

Run:
    cd c:\\Apache24\\htdocs\\PULSO\\backend
    python test_ocr.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ocr_service import extract_id_details, detect_id_type, parse_date, extract_barangay

# Plain output (Windows console compatible)
PASS   = '[PASS]'
FAIL   = '[FAIL]'
GREEN  = ''
RED    = ''
YELLOW = ''
RESET  = ''
BOLD   = ''
SEP    = '-' * 60
SEP2   = '=' * 60

passed = 0
failed = 0

def check(label, expected, actual, partial=False):
    global passed, failed
    exp_u = str(expected).upper().strip()
    act_u = str(actual).upper().strip()
    ok = (exp_u in act_u) if partial else (exp_u == act_u)
    if ok:
        passed += 1
        print(f"  {PASS} {label}: {actual!r}")
    else:
        failed += 1
        print(f"  {FAIL} {label}: expected {expected!r}, got {actual!r}")

def test(name, ocr_text, expected: dict):
    print(f"\n{SEP}")
    print(name)
    print(SEP)

    id_type = detect_id_type(ocr_text)
    data = extract_id_details(ocr_text)

    if 'id_type' in expected:
        check('ID Type', expected['id_type'], id_type)

    if 'first_name' in expected:
        check('First Name', expected['first_name'], data.get('first_name', ''), partial=True)

    if 'last_name' in expected:
        check('Last Name', expected['last_name'], data.get('last_name', ''), partial=True)

    if 'dob' in expected:
        check('Date of Birth', expected['dob'], data.get('dob', ''))

    if 'sex' in expected:
        check('Sex', expected['sex'], data.get('sex', ''))

    if 'barangay' in expected:
        check('Barangay', expected['barangay'], data.get('barangay', ''))

    if 'is_nc' in expected:
        check('Is North Caloocan', expected['is_nc'], data.get('is_north_caloocan', False))

# ─── TEST CASES ───────────────────────────────────────────────────────────────

# 1. Philippine National ID (PhilSys / PhilID)
test("1. PhilSys / PhilID", """
REPUBLIC OF THE PHILIPPINES
PHILIPPINE IDENTIFICATION SYSTEM

Last Name
DELA CRUZ
First Name
MARIA ELENA
Middle Name
SANTOS
Date of Birth
01 JANUARY 1990
Sex                 Blood Type
FEMALE              O+

Date of Issue: 2021-03-15
Place of Birth: Caloocan City

Address
BLK 5 LOT 12 GREENVILLE HOMES BRGY 174 CALOOCAN CITY METRO MANILA

PCN: 1234-5678-9012-3456
""", {
    'id_type': 'philid',
    'first_name': 'Maria',
    'last_name': 'Dela Cruz',
    'dob': '1990-01-01',
    'sex': 'Female',
    'barangay': '174',
    'is_nc': True,
})

# 2. SSS UMID Card
test("2. SSS UMID Card", """
SOCIAL SECURITY SYSTEM
UNIFIED MULTI-PURPOSE ID

REYES
JOSE ANTONIO
BAUTISTA

SS NUMBER: 34-5678901-2
DATE OF BIRTH: 15-MAR-1985
SEX: M

ADDRESS: PHASE 2 BLK 8 LOT 3 NORTH CALOOCAN HEIGHTS
BARANGAY 176 CALOOCAN CITY
""", {
    'id_type': 'umid',
    'last_name': 'Reyes',
    'first_name': 'Jose',
    'dob': '1985-03-15',
    'sex': 'Male',
    'barangay': '176',
    'is_nc': True,
})

# 3. LTO Driver's License
test("3. LTO Driver's License", """
REPUBLIC OF THE PHILIPPINES
LAND TRANSPORTATION OFFICE

GARCIA
ANTONIO JOSE

LICENSE NO.: N01-12-345678
DATE OF BIRTH: 06/15/1988
SEX: M
ADDRESS: 123 MAIN ST BRGY 180 CALOOCAN CITY
EXPIRY DATE: 2028-06-14
RESTRICTION: 1,2
""", {
    'id_type': 'lto',
    'last_name': 'Garcia',
    'first_name': 'Antonio',
    'dob': '1988-06-15',
    'sex': 'Male',
    'barangay': '180',
    'is_nc': True,
})

# 4. PRC Professional ID
test("4. PRC Professional ID", """
PROFESSIONAL REGULATION COMMISSION
REPUBLIC OF THE PHILIPPINES

SANTOS
ANITA MARIE

LICENSURE EXAMINATION FOR NURSES
REGISTRATION NO.: 0123456
DATE OF REGISTRATION: MARCH 15, 2018
VALID UNTIL: DECEMBER 31, 2027

ADDRESS: ZONE 3 BRGY 167 CALOOCAN CITY
""", {
    'id_type': 'prc',
    'last_name': 'Santos',
    'first_name': 'Anita',
    'barangay': '167',
    'is_nc': True,
})

# 5. PhilHealth ID
test("5. PhilHealth / PHIC ID", """
REPUBLIC OF THE PHILIPPINES
PHILIPPINE HEALTH INSURANCE CORPORATION

SURNAME: MENDOZA
GIVEN NAME: ROBERTO CARLOS
DATE OF BIRTH: 1980-07-22
SEX: MALE

PHILHEALTH ID NO: 19-987654321-7
ADDRESS: BLK 3 LOT 9 BAGONG SILANG BRGY 177 CALOOCAN CITY
""", {
    'id_type': 'philhealth',
    'last_name': 'Mendoza',
    'first_name': 'Roberto',
    'dob': '1980-07-22',
    'sex': 'Male',
    'barangay': '177',
    'is_nc': True,
})

# 6. Pag-IBIG / HDMF ID
test("6. Pag-IBIG / HDMF ID", """
REPUBLIC OF THE PHILIPPINES
HOME DEVELOPMENT MUTUAL FUND
PAG-IBIG FUND

LAST NAME: FLORES
FIRST NAME: CECILIA ANN
DATE OF BIRTH: August 30, 1992
SEX: F
MID NO: 121-2345678-9

ADDRESS: LOT 7 BLK 20 PANORAMA VILLAGE BRGY 171 CALOOCAN
""", {
    'id_type': 'pagibig',
    'last_name': 'Flores',
    'first_name': 'Cecilia',
    'dob': '1992-08-30',
    'sex': 'Female',
    'barangay': '171',
    'is_nc': True,
})

# 7. Postal ID
test("7. Philippine Postal ID", """
REPUBLIC OF THE PHILIPPINES
PHLPOST POSTAL ID

LAST NAME: CRUZ
FIRST NAME: MANUEL
DATE OF BIRTH: 1975-12-05
SEX: MALE

ADDRESS: #45 RIZAL STREET BRGY. 168 CALOOCAN CITY

QR CODE: xxxxxxxxxxxxxxx
""", {
    'id_type': 'postal',
    'last_name': 'Cruz',
    'first_name': 'Manuel',
    'dob': '1975-12-05',
    'sex': 'Male',
    'barangay': '168',
    'is_nc': True,
})

# 8. COMELEC Voter's ID
test("8. COMELEC Voter's ID", """
COMMISSION ON ELECTIONS
REPUBLIC OF THE PHILIPPINES

VOTER'S IDENTIFICATION CARD

SURNAME: VILLANUEVA
GIVEN NAME: GRACE MARIE
DATE OF BIRTH: 22 SEPTEMBER 1993
SEX: FEMALE
VIN: 1234-5678-ABCD

ADDRESS: ZONE 5 PUROK 2 BRGY 182 CALOOCAN CITY
""", {
    'id_type': 'comelec',
    'last_name': 'Villanueva',
    'first_name': 'Grace',
    'dob': '1993-09-22',
    'sex': 'Female',
    'barangay': '182',
    'is_nc': True,
})

# 9. Philippine Passport
test("9. Philippine Passport", """
REPUBLIC OF THE PHILIPPINES
DEPARTMENT OF FOREIGN AFFAIRS

PASSPORT

Surname / Apelyido: RAMOS
Given Names / Ibinigay na Pangalan: FERDINAND JOSE
Date of Birth / Petsa ng Kapanganakan: 14 FEB 1979
Place of Birth: CALOOCAN CITY
Sex / Kasarian: M

PERMANENT ADDRESS: BLK 1 LOT 5 BGY. 165 NORTH CALOOCAN CITY

P<PHIRAMOS<<FERDINAND<JOSE<<<<<<<<<<<<<<<<<<<<<
AB1234567<8PHL7902145M3001145<<<<<<<<<<<<<<04
""", {
    'id_type': 'passport',
    'last_name': 'Ramos',
    'first_name': 'Ferdinand',
    'dob': '1979-02-14',
    'sex': 'Male',
    'barangay': '165',
    'is_nc': True,
})

# 10. Non-Caloocan address → Should FAIL residency
test("10. Non-Caloocan (Should Fail Residency)", """
LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE

AQUINO
BENIGNO SIMEON

LICENSE NO.: M08-12-000001
DATE OF BIRTH: 02/08/1960
SEX: M
ADDRESS: 123 AYALA AVE MAKATI CITY
RESTRICTION: 1
""", {
    'id_type': 'lto',
    'last_name': 'Aquino',
    'first_name': 'Benigno',
    'dob': '1960-02-08',
    'is_nc': False,
})

# 11. South Caloocan (Brgy < 165) → Should FAIL residency
test("11. South Caloocan Brgy 100 (Should Fail)", """
SOCIAL SECURITY SYSTEM
UNIFIED MULTI-PURPOSE ID

REYES
PEDRO JUAN
GOMEZ

SS NUMBER: 11-2222222-3
DATE OF BIRTH: 1995-05-10
SEX: M
ADDRESS: BLK 10 LOT 2 ZONE 4 BRGY 100 CALOOCAN CITY
""", {
    'id_type': 'umid',
    'barangay': '100',
    'is_nc': False,
})

# 12. Date parsing edge cases
print(f"\n{SEP}")
print(f"12. Date Parsing Edge Cases")
print(SEP)
date_cases = [
    ("YYYY-MM-DD",      "DATE OF BIRTH: 1990-01-15",                 "1990-01-15"),
    ("MM/DD/YYYY",      "DATE OF BIRTH: 01/15/1990",                 "1990-01-15"),
    ("DD Month YYYY",   "DATE OF BIRTH: 15 JANUARY 1990",            "1990-01-15"),
    ("Month DD, YYYY",  "DATE OF BIRTH: JANUARY 15, 1990",           "1990-01-15"),
    ("DD-Mon-YYYY",     "DATE OF BIRTH: 15-JAN-1990",                "1990-01-15"),
    ("Tagalog month",   "PETSA NG KAPANGANAKAN: 15 ENERO 1990",      "1990-01-15"),
    ("DD/MM/YYYY (alt)","DOB: 1990/01/15",                           "1990-01-15"),
]
for label, text, expected in date_cases:
    result = parse_date(text)
    check(label, expected, result)

# 13. Barangay extraction edge cases
print(f"\n{SEP}")
print(f"13. Barangay Extraction Edge Cases")
print(SEP)
brgy_cases = [
    ("BARANGAY NNN",    "BARANGAY 174 CALOOCAN CITY",        "174"),
    ("BRGY. NNN",       "BRGY. 174, CALOOCAN",               "174"),
    ("BGY. NNN",        "BGY. 181 NORTH CAlOOCAN",           "181"),
    ("BRGY NO. NNN",    "BRGY NO. 166 CALOOCAN",             "166"),
    ("ZONE + BRGY NNN", "ZONE 2 BRGY 173 CALOOCAN",          "173"),
    ("PUROK + BRGY",    "PUROK 5 BRGY 188 CALOOCAN",         "188"),
]
for label, text, expected in brgy_cases:
    result = extract_barangay(text.upper())
    check(label, expected, result)

# ─── Summary ──────────────────────────────────────────────────────────────────
total = passed + failed
print(f"\n{SEP2}")
status = 'ALL PASSED' if failed == 0 else f'{failed} FAILED'
print(f"Results: {passed}/{total} passed  [{status}]")
print(f"{SEP2}\n")

sys.exit(0 if failed == 0 else 1)
