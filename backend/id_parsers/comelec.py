"""
id_parsers/comelec.py — COMELEC Voter's ID

Card format:
  - "COMMISSION ON ELECTIONS" header
  - VIN (Voter's Identification Number)
  - Name: "LAST NAME, FIRST NAME MIDDLE NAME" or stacked labels
  - Date of Birth
  - Sex: M / F
  - Precinct Number
  - Address (labeled "Address:" or positional)
  Note: Some versions show the barangay name textually instead of just a number
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List


class COMLECParser(BaseIDParser):
    ID_TYPE = 'comelec'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'vin': '', 'precinct_no': '', 'city': '', 'province': '',
        }

        # 1. Name: LASTNAME, FIRSTNAME MIDDLENAME
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_names(lines, upper)
            
        # 2. Voter ID Number (VIN)
        # Standard: ####-####[A-Z]-[A-Z]\d{6}[A-Z]{2,3}\d+
        vin_match = re.search(r'\b(\d{4}-\d{4}[A-Z]-[A-Z]\d+[A-Z]+\d+)\b', upper)
        if not vin_match:
             # Fallback for older or partial formats
             vin_match = re.search(r'\b(\d{4}-\d{4}[A-Z]-\d{5,}[A-Z]{2,}\d*)\b', upper)
             
        if vin_match:
            result['vin'] = vin_match.group(1)
        else:
            # partial VIN fallback
            vin_partial = re.search(r'\b(\d{4}-\d{4}[A-Z]-\d{5})\b', upper)
            if vin_partial:
                result['vin'] = vin_partial.group(1)

        # 3. Precinct Number
        # More resilient: look for PRECINCT/PRESINTO follow by optional label/colon + numbers/letters
        precinct_match = re.search(r'(?:PRECINCT|PRESINTO)[^0-9]*([0-9]{2,}[A-Z0-9\-]*)', upper)
        if precinct_match:
            result['precinct_no'] = precinct_match.group(1)

        # 4. DOB: MM/DD/YYYY
        dob_iso = self._extract_dob(upper)
        if dob_iso:
             y, m, d = dob_iso.split('-')
             result['dob'] = f"{m}/{d}/{y}"

        result['sex']      = self._extract_sex(upper)
        
        # 5. Split Address: Barangay, City, Province
        full_addr = self._extract_comelec_address(lines, upper)
        result['address'] = full_addr
        
        # COMELEC often formats address with commas
        parts = [p.strip() for p in full_addr.split(',') if p.strip()]
        if len(parts) >= 3:
             result['barangay'] = parts[0].replace('Barangay', '').replace('BARANGAY', '').strip()
             result['city'] = parts[1]
             result['province'] = parts[2]
        elif len(parts) == 1:
             # Look for CALOOCAN in text
             if 'CALOOCAN' in parts[0].upper():
                  result['city'] = 'Caloocan City'
                  # Strip BARANGAY keyword and CALOOCAN
                  brgy = re.sub(r'BARANGAY|CALOOCAN|CITY|METRO\s*MANILA', '', parts[0].upper()).strip().strip(',')
                  result['barangay'] = brgy.title()
        
        if not result['barangay']:
             result['barangay'] = self._extract_barangay(upper)

        return result

    def _extract_comelec_address(self, lines: List[str], upper: str) -> str:
        """
        COMELEC IDs sometimes print address before or after PRECINCT NO.
        We detect the PRECINCT line as a hard stop.
        """
        addr_start = None
        for i, line in enumerate(lines):
            ul = line.upper()
            if any(kw in ul for kw in ('ADDRESS', 'RESIDENCE', 'TIRAHAN')):
                addr_start = i
                break
            # Fallback: look for a line with BARANGAY or a city name
            if 'CALOOCAN' in ul or ('BARANGAY' in ul and addr_start is None):
                addr_start = max(0, i - 1)

        if addr_start is None:
            return ''

        stop_keys = {'PRECINCT', 'BLOOD', 'HEIGHT', 'WEIGHT', 'SIGNATURE',
                     'DATE OF', 'PHILIPPINE', 'KASARIAN'}
        raw_parts = []
        for j in range(addr_start, min(addr_start + 4, len(lines))):
            ul = lines[j].upper().strip()
            if any(s in ul for s in stop_keys):
                break
            if ul:
                raw_parts.append(ul)

        raw = ' '.join(raw_parts)
        raw = re.sub(r'^(ADDRESS|RESIDENCE|TIRAHAN)\s*:?\s*', '', raw, flags=re.I)

        # Strip trailing metadata
        for noise in ('KASARIAN', 'SEX', 'PHILIPPINE', 'PRECINCT'):
            idx = raw.upper().find(noise)
            if idx != -1:
                raw = raw[:idx]

        return re.sub(r'[,.\s]+$', '', raw.strip()).title()
