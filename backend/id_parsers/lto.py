"""
id_parsers/lto.py — LTO Driver's License

Card format:
  - "LAND TRANSPORTATION OFFICE" header
  - License No.
  - Name: "DELA CRUZ, JUAN PEDRO" (Last, First Middle format on single line)
     OR two-line format: "DELA CRUZ" / "JUAN PEDRO"
  - Nationality
  - Date of Birth
  - Sex
  - Restriction Code
  - Address (labeled "Address:")
  - Expiry Date (MUST NOT be confused with DOB)
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import Dict, List, Tuple


class LTOParser(BaseIDParser):
    ID_TYPE = 'lto'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'block_lot': '', 'street': '', 'subdivision': '',
            'city': '', 'province': '', 'postal_code': '',
        }

        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_lto_names(lines, upper)
        
        # LTO: strip expiry date before DOB parsing
        dob_text = re.sub(r'(EXPIR\w*|VALID\s+UNTIL)[\s\S]{0,40}', '', upper)
        result['dob']      = self._extract_dob(dob_text)
        result['sex']      = self._extract_sex(upper)
        
        # Structured Address Extraction
        addr_fields = self._extract_lto_address(lines, upper)
        result.update(addr_fields)
        
        # Fallback for generic 'address' field
        full_addr = result.get('address', '')
        if not full_addr and addr_fields.get('street'):
             parts: List[str] = [addr_fields[k] for k in ('block_lot', 'street', 'subdivision', 'barangay', 'city') if addr_fields.get(k)]  # type: ignore[misc]
             result['address'] = ', '.join(parts)

        # License Number Extraction (e.g. N02-14-012345)
        lic_match = re.search(r'\b([A-Z]\d{2}[-\s]?\d{2}[-\s]?\d{6})\b', upper)
        if lic_match:
            raw_lic = lic_match.group(1).replace(' ', '-')
            result['license_no'] = raw_lic
            result['id_number'] = raw_lic

        return result


    def _extract_lto_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """
        LTO name format: LASTNAME, FIRSTNAME MIDDLENAME
        Rule: Split on first comma.
        Falls back to generic label extraction if no comma found.
        """
        # Strategy 1: Look for a line containing a comma that isn't just a label
        for line in lines:
            ul = line.upper().strip()
            if ',' in ul:
                # If it's the "LAST NAME, FIRST NAME..." label line, strip the labels
                if all(x in ul for x in ('LAST', 'FIRST', 'MIDDLE')):
                    # Strip everything up to the last occurrence of 'NAME' or 'MIDDLE'
                    for label in ('MIDDLE NAME', 'MIDDLE', 'NAME'):
                        if label in ul:
                            ul = ul.split(label)[-1].strip()
                            break
                
                if ',' not in ul: continue

                # Split on FIRST comma
                parts = ul.split(',', 1)
                last_name_raw = parts[0].strip()
                
                # Further cleanup if government headers are in the same line
                for noise in ('REPUBLIC', 'DEPARTMENT', 'TRANSPORTATION', 'OFFICE', 'LICENSE'):
                    if noise in last_name_raw:
                        last_name_raw = last_name_raw.split(noise)[-1].strip()

                last_name = last_name_raw.title()
                
                fn_mn_raw = parts[1].strip()
                if fn_mn_raw:
                    # Strip downstream noise labels (DOB, SEX, etc.)
                    for noise in ('DOB', 'SEX', 'DATE OF BIRTH'):
                         if noise in fn_mn_raw.upper():
                             fn_mn_raw = fn_mn_raw.upper().split(noise)[0].strip()

                    words = fn_mn_raw.split()
                    if words:
                        first_name = words[0].title()
                        middle_name = ' '.join(words[1:]).title() if len(words) > 1 else ''
                        if last_name and first_name:
                            return first_name, last_name, middle_name

        # Strategy 2: Fallback to generic label-based extraction
        # Handles cases where OCR drops the comma or name is on separate lines
        fn, ln, mn = self._extract_names(lines, upper)
        if fn and ln:
            return fn, ln, mn

        return '', '', ''

    def _extract_lto_address(self, lines: List[str], upper: str) -> Dict[str, str]:
        """
        Structured Address Parsing for LTO:
        Structure: BLK/LOT info, STREET NAME, SUBDIVISION, BARANGAY
        """
        res = {
            'block_lot': '', 'street': '', 'subdivision': '', 
            'barangay': '', 'city': '', 'province': '', 'postal_code': ''
        }

        # 1. Collect Address block
        addr_lines = []
        found_label = False
        stop_keywords = ('LICENSE', 'EXPIR', 'VALID', 'AGENCY', 'BLOOD', 'EYE', 'WEIGHT', 'HEIGHT')

        for i, line in enumerate(lines):
            ul = line.upper().strip()
            # Allow OCR typos for ADDRESS
            if any(k in ul for k in ('ADDRESS', 'A0DRESS', 'ADDRES5', 'ADORESS')):
                found_label = True
                if len(ul) > 10:
                    addr_lines.append(ul.replace('ADDRESS', '').strip())
                continue
            
            if found_label:
                if any(k in ul for k in stop_keywords):
                    break
                if ul:
                    addr_lines.append(ul)
                if len(addr_lines) >= 4: # Safety limit
                    break
        
        if not addr_lines:
            # Fallback: look for lines containing CALOOCAN or BAGUMBONG if no label found
            for i, line in enumerate(lines):
                ul = line.upper().strip()
                if any(k in ul for k in ('CALOOCAN', 'BAGUMBONG', 'NCR', 'BARANGAY')):
                    addr_lines.append(ul)
                    # Try to get surrounding lines
                    if i > 0: addr_lines.insert(0, lines[i-1])
                    if i + 1 < len(lines): addr_lines.append(lines[i+1])
                    break

        addr_line = ' '.join(addr_lines)
        
        if not addr_line:
            return res

        # 0. Skip Government Header Noise
        noise = ('REPUBLIC OF THE PHILIPPINES', 'DEPARTMENT OF TRANSPORTATION', 'LAND TRANSPORTATION OFFICE')
        for n in noise:
            addr_line = addr_line.replace(n, '').strip()

        # 1. Postal Code (Last 4 numeric digits or common OCR misreads)
        postal_match = re.search(r'\b([I1lO0]{1}\d{3}|\d{4}|14[O0]{2})\b(?:$|\s)', addr_line, re.I)
        if postal_match:
            pc = postal_match.group(1).upper().replace('O', '0').replace('I', '1').replace('L', '1')
            res['postal_code'] = pc
            # Remove from line to avoid interference
            addr_line = addr_line.replace(postal_match.group(0), '').strip()

        # 2. Barangay (text after BARANGAY keyword)
        brgy_match = re.search(r'\b(?:BARANGAY|BRGY\.?)\s*(\d+[A-Z]?|(?:\w+\s*){1,2})', addr_line)
        if brgy_match:
            res['barangay'] = brgy_match.group(1).strip().strip(',')
            
        # 3. City & Province
        # Often: "CITY, NCR" or "CALOOCAN CITY"
        city_match = re.search(r'\b([\w\s]+)\s+CITY\b', addr_line)
        if city_match:
            res['city'] = city_match.group(1).strip() + " City"
        
        if 'NCR' in addr_line or 'METRO MANILA' in addr_line:
            res['province'] = 'Metro Manila'

        # 4. Block & Lot (text matching BLK # LOT #, handle typos like 8LK, L0T)
        blk_match = re.search(r'\b((?:BLK|8LK|B1K)\.?\s*[\dO]+\s*(?:[\w\s]*?)(?:LOT|L0T|L07)\.?\s*[\dO]+[\w\s]*?)\b', addr_line)
        if blk_match:
            # Normalize back to BLK and LOT
            normalized = blk_match.group(1).upper().replace('8LK', 'BLK').replace('B1K', 'BLK').replace('L0T', 'LOT').replace('L07', 'LOT')
            res['block_lot'] = normalized.strip()

        # 5. Street (word(s) ending in ST, AVE, RD, etc.)
        # 6. Subdivision (proper noun phrase after street)
        # We search for the street first
        street_match = re.search(r'\b([\w\d\s.#\-]+?\b(?:ST\.?|STREET|AVE\.?|AVENUE|RD\.?|ROAD|BLVD\.?|BOULEVARD|STREET))\b', addr_line)
        if street_match:
            res['street'] = street_match.group(1).strip().strip(',')
            
            # Subdiv is after street, before Barangay/City
            start_idx = addr_line.find(res['street']) + len(res['street'])
            remaining = addr_line[start_idx:].strip()
            
            # Stop subdiv at Barangay or City
            subdiv_end = len(remaining)
            for stop_key in ('BARANGAY', 'BRGY', 'CITY'):
                idx = remaining.upper().find(stop_key)
                if idx != -1:
                    subdiv_end = min(subdiv_end, idx)
            
            subdiv_raw = remaining[:subdiv_end].strip().strip(',')
            if subdiv_raw and len(subdiv_raw) > 2:
                res['subdivision'] = subdiv_raw

        # Final Cleanup
        for k in res:
            if isinstance(res[k], str):
                res[k] = res[k].strip(', .').title()
                if k == 'postal_code': res[k] = res[k].upper()
                if k == 'province' and res[k] == 'Metro Manila': res[k] = 'Metro Manila'

        return res
