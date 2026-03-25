import re
from typing import List

class MockBase:
    def _extract_barangay(self, upper: str) -> str:
        patterns = [
            r'BARANGAY\s+(\d{1,3}[A-Z]?)',
            r'BRGY\.?\s*(\d{1,3}[A-Z]?)',
            r'BGY\.?\s*(\d{1,3}[A-Z]?)',
            r'BRY\.?\s*(\d{1,3}[A-Z]?)',
            r'BR\.\s*(\d{1,3}[A-Z]?)',
        ]
        for pat in patterns:
            m = re.search(pat, upper)
            if m:
                return m.group(1).strip()

        # Fallback: bare 3-digit number near CALOOCAN
        for city_kw in ('CALOOCAN', 'KALOOCAN', 'KALOOKAN'):
            idx = upper.find(city_kw)
            if idx != -1:
                window = upper[max(0, idx - 300): idx + 300]
                print(f"Window: '{window}'")
                for m in re.finditer(r'\b(\d{3})\b', window):
                    n = int(m.group(1))
                    print(f"Found digit: {n}")
                    if 100 <= n <= 200:
                        return m.group(1)
        return ''

sample_text = """
REPUBLIC OF THE PHILIPPINES
DEPARTMENT OF TRANSPORTATION
LAND TRANSPORTATION OFFICE
DRIVER'S LICENSE
Last Name, First Name, Middle Name
TABIOS, GENE GANGE
Nationality Sex Date of Birth Weight (kg) Height (m)
PHL M 2005/06/13 60 1.65
Address
BLK 9 LOT 30, RUBY ST CELINA HOMES 3 BAGUMBONG,
BARANGAY 171, CALOOCAN CITY, NCR, THIRD DISTRICT, 1421
License No. Expiration Date Agency Code
C08-25-006312 2029/06/13 C08
Blood Type Eyes Color
O+ BLACK
DL Codes Conditions
B NONE
"""

parser = MockBase()
res = parser._extract_barangay(sample_text.upper())
print(f"Extracted Barangay: '{res}'")
