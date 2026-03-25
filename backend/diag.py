"""Quick diagnostic — runs only the field extraction logic, prints to a JSON file."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ocr_service import extract_id_details, detect_id_type, parse_date, extract_barangay

results = []

def run(name, text, checks):
    id_type = detect_id_type(text)
    data = extract_id_details(text)
    row = {'test': name, 'id_type': id_type, 'data': data, 'checks': {}}
    for key, expected in checks.items():
        if key == 'id_type':
            actual = id_type
        elif key == 'is_nc':
            actual = data.get('is_north_caloocan')
        else:
            actual = data.get(key, '')
        ok = str(expected).upper() in str(actual).upper()
        row['checks'][key] = {'expected': expected, 'actual': actual, 'ok': ok}
    results.append(row)

run("1_philid", """
PHILIPPINE IDENTIFICATION SYSTEM\nLast Name\nDELA CRUZ\nFirst Name\nMARIA ELENA\nDate of Birth\n01 JANUARY 1990\nSex: FEMALE\nAddress\nBRGY 174 CALOOCAN CITY\nPCN: 1234
""", {'id_type':'philid','first_name':'Maria','last_name':'Dela Cruz','dob':'1990-01-01','sex':'Female','barangay':'174','is_nc':True})

run("2_umid", """
SOCIAL SECURITY SYSTEM\nUNIFIED MULTI-PURPOSE ID\nREYES\nJOSE ANTONIO\nSS NUMBER: 34-5678901-2\nDATE OF BIRTH: 15-MAR-1985\nSEX: M\nBARANGAY 176 CALOOCAN CITY
""", {'id_type':'umid','last_name':'Reyes','first_name':'Jose','dob':'1985-03-15','sex':'Male','barangay':'176','is_nc':True})

run("3_lto", """
LAND TRANSPORTATION OFFICE\nGARCIA\nANTONIO JOSE\nLICENSE NO.: N01-12-345678\nDATE OF BIRTH: 06/15/1988\nSEX: M\nBRGY 180 CALOOCAN CITY
""", {'id_type':'lto','last_name':'Garcia','first_name':'Antonio','dob':'1988-06-15','sex':'Male','barangay':'180','is_nc':True})

run("4_prc", """
PROFESSIONAL REGULATION COMMISSION\nSANTOS\nANITA MARIE\nREGISTRATION NO.: 0123456\nVALID UNTIL: DECEMBER 31, 2027\nADDRESS: BRGY 167 CALOOCAN CITY
""", {'id_type':'prc','last_name':'Santos','first_name':'Anita','barangay':'167','is_nc':True})

run("5_philhealth", """
PHILIPPINE HEALTH INSURANCE CORPORATION\nSURNAME: MENDOZA\nGIVEN NAME: ROBERTO CARLOS\nDATE OF BIRTH: 1980-07-22\nSEX: MALE\nBRGY 177 CALOOCAN CITY
""", {'id_type':'philhealth','last_name':'Mendoza','first_name':'Roberto','dob':'1980-07-22','sex':'Male','barangay':'177','is_nc':True})

run("6_pagibig", """
HOME DEVELOPMENT MUTUAL FUND\nPAG-IBIG FUND\nLAST NAME: FLORES\nFIRST NAME: CECILIA ANN\nDATE OF BIRTH: August 30, 1992\nSEX: F\nBRGY 171 CALOOCAN
""", {'id_type':'pagibig','last_name':'Flores','first_name':'Cecilia','dob':'1992-08-30','sex':'Female','barangay':'171','is_nc':True})

run("7_postal", """
PHLPOST POSTAL ID\nLAST NAME: CRUZ\nFIRST NAME: MANUEL\nDATE OF BIRTH: 1975-12-05\nSEX: MALE\nBRGY. 168 CALOOCAN CITY
""", {'id_type':'postal','last_name':'Cruz','first_name':'Manuel','dob':'1975-12-05','sex':'Male','barangay':'168','is_nc':True})

run("8_comelec", """
COMMISSION ON ELECTIONS\nVOTER'S IDENTIFICATION CARD\nSURNAME: VILLANUEVA\nGIVEN NAME: GRACE MARIE\nDATE OF BIRTH: 22 SEPTEMBER 1993\nSEX: FEMALE\nBRGY 182 CALOOCAN CITY
""", {'id_type':'comelec','last_name':'Villanueva','first_name':'Grace','dob':'1993-09-22','sex':'Female','barangay':'182','is_nc':True})

run("9_passport", """
REPUBLIC OF THE PHILIPPINES\nDEPARTMENT OF FOREIGN AFFAIRS\nPASSPORT\nSurname: RAMOS\nGiven Names: FERDINAND JOSE\nDate of Birth: 14 FEB 1979\nSex: M\nBGY. 165 NORTH CALOOCAN CITY
""", {'id_type':'passport','last_name':'Ramos','first_name':'Ferdinand','dob':'1979-02-14','sex':'Male','barangay':'165','is_nc':True})

run("10_non_caloocan_fail", """
LAND TRANSPORTATION OFFICE\nAQUINO\nBENIGNO SIMEON\nDATE OF BIRTH: 02/08/1960\nSEX: M\nADDRESS: 123 AYALA AVE MAKATI CITY
""", {'is_nc':False})

run("11_south_caloocan_fail", """
UNIFIED MULTI-PURPOSE ID\nSSS\nREYES\nPEDRO\nDATE OF BIRTH: 1995-05-10\nSEX: M\nBRGY 100 CALOOCAN CITY
""", {'barangay':'100','is_nc':False})

# Date edge cases
date_tests = [
    ("YYYY-MM-DD",    "DOB: 1990-01-15",             "1990-01-15"),
    ("MM/DD/YYYY",    "DOB: 01/15/1990",             "1990-01-15"),
    ("DD Month YYYY", "DOB: 15 JANUARY 1990",        "1990-01-15"),
    ("Month DD YYYY", "DOB: JANUARY 15, 1990",       "1990-01-15"),
    ("DD-Mon-YYYY",   "DOB: 15-JAN-1990",            "1990-01-15"),
    ("Tagalog month", "DOB: 15 ENERO 1990",          "1990-01-15"),
    ("YYYY/MM/DD",    "DOB: 1990/01/15",             "1990-01-15"),
]
date_results = []
for label, text, expected in date_tests:
    actual = parse_date(text)
    date_results.append({'label': label, 'expected': expected, 'actual': actual, 'ok': actual == expected})

# Barangay edge cases
brgy_tests = [
    ("BARANGAY NNN",    "BARANGAY 174 CALOOCAN CITY",    "174"),
    ("BRGY. NNN",       "BRGY. 174, CALOOCAN",           "174"),
    ("BGY. NNN",        "BGY. 181 NORTH CALOOCAN",       "181"),
    ("BRGY NO. NNN",    "BRGY NO. 166 CALOOCAN",         "166"),
    ("ZONE + BRGY",     "ZONE 2 BRGY 173 CALOOCAN",      "173"),
    ("PUROK + BRGY",    "PUROK 5 BRGY 188 CALOOCAN",     "188"),
]
brgy_results = []
for label, text, expected in brgy_tests:
    actual = extract_barangay(text.upper())
    brgy_results.append({'label': label, 'expected': expected, 'actual': actual, 'ok': actual == expected})

out = {'id_tests': results, 'date_tests': date_results, 'brgy_tests': brgy_results}
with open('diag_out.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, default=str)
print("Wrote diag_out.json")
