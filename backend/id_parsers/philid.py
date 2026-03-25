"""
id_parsers/philid.py — Philippine National ID (PhilSys)

Card layout (front):
  - Card header: "PHILIPPINE IDENTIFICATION SYSTEM"
  - PCN (PhilSys Card Number) — 16-digit barcode / printed
  - Full Name: Last Name / First Name / Middle Name (labeled fields)
  - Date of Birth
  - Sex
  - Blood Type

Card layout (back):
  - Address: [BLK] [LOT] [SUBDIVISION] [STREET] BARANGAY [N] [CITY] NCR THIRD DISTRICT
  - Philippines, [ZIP]
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class PhilIDParser(BaseIDParser):
    ID_TYPE = 'philid'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'pcn': '',
        }

        # 1. Name: Natural Order (First, Middle, Last)
        # PhilID often labels: Last Name / First Name / Middle Name
        fn, ln, mn = self._extract_names(lines, upper)
        result['first_name'] = fn
        result['last_name'] = ln
        result['middle_name'] = mn

        # 2. 16-digit PCN (####-####-####-####)
        pcn_match = re.search(r'\b(\d{4}-\d{4}-\d{4}-\d{4})\b', upper)
        if not pcn_match:
            # Try unformatted 16-digit
            pcn_raw = re.search(r'\b(\d{16})\b', upper)
            if pcn_raw:
                p = pcn_raw.group(1)
                result['pcn'] = f"{p[:4]}-{p[4:8]}-{p[8:12]}-{p[12:16]}"
        else:
            result['pcn'] = pcn_match.group(1)

        # 3. DOB: YYYY-MM-DD
        result['dob'] = self._extract_dob(upper)
        
        # 4. Sex: M or F
        sex_raw = self._extract_sex(upper)
        if sex_raw == 'Male': result['sex'] = 'M'
        elif sex_raw == 'Female': result['sex'] = 'F'
        else: result['sex'] = sex_raw

        # 5. Address (Standard PH format ending in postal code)
        result['address'] = self._extract_philid_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)
        
        return result

    def _extract_philid_address(self, lines: List[str], upper: str) -> str:
        """
        PhilSys National ID address is on the BACK of the card in this format:
        BLK 40 LOT 3 NORTHVILLE 2B BAGUMBONG, BARANGAY 171,
        CITY OF CALOOCAN, NCR, THIRD DISTRICT, PHILIPPINES, 1421

        Strategy: Find the line containing BLK/LOT or BARANGAY, then reconstruct
        the physical street/subd portion only.
        """
        # Look for address block anchors
        addr_line = None
        for i, line in enumerate(lines):
            ul = line.upper()
            if re.search(r'\bBLK\b|\bLOT\b|\bNORTHVILLE\b|\bPHASE\b|\bSITIO\b|\bPURO?K\b', ul):
                addr_line = i
                break

        if addr_line is None:
            # Fallback: search for BARANGAY as anchor
            for i, line in enumerate(lines):
                if 'BARANGAY' in line.upper() or 'CALOOCAN' in line.upper():
                    addr_line = max(0, i - 1)
                    break

        if addr_line is None:
            return self._extract_address(lines, upper)  # generic fallback

        # Collect lines starting from the address anchor
        raw_parts = []
        stop_at = {'PHILIPPINE', 'REPUBLIC', 'NCR', 'THIRD', 'DATE', 'BLOOD', 'SEX', 'KASARIAN'}
        
        for j in range(addr_line, min(addr_line + 3, len(lines))):
            line_u = lines[j].upper().strip()
            
            # If the line contains a stop word, truncate it there and stop collecting
            found_stop = False
            for s in stop_at:
                if s in line_u:
                    # Capture everything BEFORE the stop word
                    idx = line_u.find(s)
                    if idx > 0:
                        raw_parts.append(line_u[:idx])
                    found_stop = True
                    break
            
            if found_stop:
                break
            
            raw_parts.append(line_u)

        raw = ' '.join(raw_parts)

        # Strip barangay + city suffix — those go into separate fields
        raw = re.sub(r',?\s*BARANGAY\s+\d+[A-Z]?\b.*', '', raw, flags=re.I)
        raw = re.sub(r',?\s*BRGY\.?\s*\d+[A-Z]?\b.*', '', raw, flags=re.I)
        raw = re.sub(r',?\s*(CITY OF\s+)?CALOOCAN\b.*', '', raw, flags=re.I)

        # Strip inline metadata bleed
        for noise in ('KASARIAN', 'SEX', 'PHILIPPINE', 'REPUBLIC'):
            idx = raw.upper().find(noise)
            if idx != -1:
                raw = raw[:idx]

        return re.sub(r'[,.\s]+$', '', raw.strip()).title()
