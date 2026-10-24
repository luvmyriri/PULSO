"""
address_splitter.py
Deterministic Philippine address component splitter for PULSO ID Verification.
Follows strict token non-overlapping and division rules:
- Divide, never copy: Each token/word in the raw address text belongs to at most one component.
- Block and lot: Recognizes long forms ("BLK 9", "BLOCK 9", "LOT 30", "PHASE 1") and short forms ("B-9", "L-30", "B9", "L30").
- Never copies block and lot into subdivision, village, or building_village.
- Street: Accepted only if non-empty, contains street keyword, does not match barangay or area names without keyword.
- Unassigned words are placed in notes, never stuffed into fields.
- Confidences: "high", "medium", "low", or "not_read" for empty components.
"""

import re
from typing import Dict, Any, Optional, List

BUILDING_KEYWORDS = ['BLDG.', 'BLDG', 'BUILDING', 'BLD.', 'BLD', 'BLG.', 'BLG', 'BLDNG']
STOP_WORDS = {'UNIT', 'RM', 'ROOM', 'FLOOR', 'FLR', 'FL', 'LOT', 'BLK', 'BLOCK', 'PHASE', 'PH', '#'}
VILLAGE_KEYWORDS = [
    'VILLAGE', 'SUBDIVISION', 'SUBD', 'HOMES', 'RESIDENCES', 'RESIDENCE',
    'HEIGHTS', 'ESTATES', 'ESTATE', 'PARK', 'HILLS', 'TOWNHOMES', 'TOWNHOUSE',
    'CONDOMINIUM', 'CONDO', 'TOWER', 'TOWERS', 'COMPOUND', 'GARDENS', 'GARDEN',
    'PLACE', 'VISTA', 'COURT', 'VILLE'
]
STREET_KEYWORDS = [
    'STREET', 'ST.', 'ST', 'ROAD', 'RD.', 'RD', 'AVENUE', 'AVE.', 'AVE',
    'BOULEVARD', 'BLVD.', 'BLVD', 'DRIVE', 'DR.', 'DR', 'LANE', 'LN.', 'LN',
    'EXTENSION', 'EXT.', 'EXT', 'HIGHWAY', 'HWY.', 'HWY', 'ALLEY', 'CIRCLE', 'CIR', 'LOOP', 'WAY',
    'NATIONAL ROAD', 'MAHARLIKA HIGHWAY'
]
CALOOCAN_AREA_NAMES = {
    'CAMARIN', 'BAGONG SILANG', 'DEPARO', 'BIGNAY', 'SAMPAGUITA', 'TALA',
    'LLANO', 'KIKO', 'PANGARAP', 'BAGUMBONG', 'AMPARO', 'BANKERS', 'VILLAS',
    'GRACE PARK', 'MONUMENTO', 'MORNING BREEZE', 'MAYPAJO', 'DAGAT-DAGATAN', 'NOVALICHES'
}

CALOOCAN_BRGY_NAME_MAP = {
    'BAGUMBONG': '171',
    'BAGOMBONG': '171',
    'BAGBAGUIN': '165',
    'CAYBIGA': '166',
    'LLANO': '167',
    'DEPARO': '168',
    'CAMARIN': '174',
    'BAGONG SILANG': '176',
    'AMPARO': '179',
    'TALIPAPA': '160',
    'TULLAHAN': '162',
}

def clean_for_comparison(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'[\s.,\-_/]', '', text).upper()

def split_address_components(address_text: str, ai_components: Optional[Dict[str, Any]] = None, id_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Deterministically splits raw full address into non-overlapping standard components.
    Rule 1: Divide, never copy.
    Rule 2: Short and long block/lot.
    Rule 3: Street validation and rejection of invented streets.
    Rule 4: Pure subdivision / village extraction without block/lot contamination.
    Rule 5: Facts-based confidences.
    """
    if not address_text or not isinstance(address_text, str) or not address_text.strip():
        return {
            'unit': '', 'building': '', 'house_no': '', 'block_lot': '',
            'subdivision': '', 'village': '', 'street': '', 'building_village': '',
            'barangay': '', 'city': '', 'province_or_region': '', 'district': '',
            'postal_code': '',
            'address_parse': {
                'confidences': {
                    'unit': 'not_read', 'building': 'not_read', 'house_no': 'not_read',
                    'block_lot': 'not_read', 'subdivision': 'not_read', 'village': 'not_read',
                    'building_village': 'not_read', 'street': 'not_read', 'barangay': 'not_read'
                },
                'notes': ['Address text is empty or unreadable']
            }
        }

    ai = ai_components or {}
    raw = address_text.replace('\n', ' ').strip()
    s = re.sub(r'\s+', ' ', raw)
    notes: List[str] = []
    confidences: Dict[str, str] = {}

    # 1. Postal code (4 digits at end of address string)
    postal_code = ''
    m_post = re.search(r'\b(1[34]\d{2}|\d{4})\b\s*$', s)
    if m_post:
        postal_code = m_post.group(1)
        s = (s[:m_post.start()] + ' ' + s[m_post.end():]).strip().rstrip(', ')

    # 2. Country words
    m_country = re.search(r'\b(?:PHILIPPINES?|REPUBLIKA\s+NG\s+PILIPINAS)\b', s, re.I)
    if m_country:
        s = (s[:m_country.start()] + ' ' + s[m_country.end():]).strip().strip(', ')

    # 3. District & Province/Region
    district = ''
    m_dist = re.search(r'\b((?:FIRST|SECOND|THIRD|FOURTH|\d+(?:ST|ND|RD|TH)?)\s+DISTRICT)\b', s, re.I)
    if m_dist:
        district = m_dist.group(1).upper()
        s = (s[:m_dist.start()] + ' ' + s[m_dist.end():]).strip().strip(', ')

    province_or_region = ''
    # Only match RIZAL or BULACAN if NOT followed by a street keyword like AVENUE/STREET/ROAD
    st_kw_neg = '|'.join(re.escape(k) for k in STREET_KEYWORDS)
    prov_pattern = r'\b(NCR|METRO\s+MANILA|NATIONAL\s+CAPITAL\s+REGION|(?:PROVINCE\s+OF\s+)?(?:RIZAL|BULACAN)(?!\s+(?:' + st_kw_neg + r')))\b'
    m_prov = re.search(prov_pattern, s, re.I)
    if m_prov:
        province_or_region = m_prov.group(1).upper()
        s = (s[:m_prov.start()] + ' ' + s[m_prov.end():]).strip().strip(', ')

    # 4. City phrase at end or near end (treat KALOOKAN same as CALOOCAN, keep as read)
    city = ''
    city_pattern = r'\b(?:CITY\s+OF\s+)?(CALOOCAN|KALOOKAN|QUEZON|MANILA|VALENZUELA)(?:\s+CITY)?\b'
    m_city = re.search(city_pattern, s, re.I)
    if m_city:
        city = m_city.group(0).strip().upper()
        s = (s[:m_city.start()] + ' ' + s[m_city.end():]).strip().strip(', ')

    # 5. Barangay extraction (Rule 1.4: use AI's barangay value to locate exact span, or standard keyword)
    barangay = ''
    ai_brgy = (ai.get('barangay') or '').strip()
    if ai_brgy:
        clean_ai_brgy = re.sub(r'^(?:BARANGAY|BRGY\.?|BGY\.?)\s*', '', ai_brgy, flags=re.I).strip()
        if clean_ai_brgy:
            # Find all occurrences of clean_ai_brgy, take the last one (closest to city) to avoid eating village name
            matches = list(re.finditer(r'\b(?:BARANGAY|BRGY\.?|BGY\.?)?\s*(' + re.escape(clean_ai_brgy) + r')\b', s, re.I))
            if matches:
                last_m = matches[-1]
                barangay = last_m.group(1).strip()
                s = (s[:last_m.start()] + ' ' + s[last_m.end():]).strip().strip(', ')
            else:
                barangay = clean_ai_brgy

    if not barangay:
        # Standard keyword with number or name
        m_brgy = re.search(r'\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*([0-9]{1,3}[A-Za-z]?|[A-Za-z0-9\s\-]+?)(?=,|$)', s, re.I)
        if m_brgy:
            b_val = m_brgy.group(1).strip()
            num_match = re.search(r'\b(1[6-8][0-9])\b', b_val)
            barangay = num_match.group(1) if num_match else b_val
            s = (s[:m_brgy.start()] + ' ' + s[m_brgy.end():]).strip().strip(', ')
        else:
            # Check for known Caloocan barangay names at the end of s before city
            known_brgy_pat = r'\b(' + '|'.join(sorted(CALOOCAN_BRGY_NAME_MAP.keys(), key=len, reverse=True)) + r')\s*$'
            m_known = re.search(known_brgy_pat, s, re.I)
            if m_known:
                barangay = m_known.group(1).strip()
                s = (s[:m_known.start()] + ' ' + s[m_known.end():]).strip().strip(', ')

    # Remove any leftover lone BARANGAY/BRGY keyword in s
    s = re.sub(r'\b(?:BARANGAY|BRGY\.?|BGY\.?)\b', ' ', s, flags=re.I).strip()

    # Core local address before barangay
    core = re.sub(r'[,/]+$', '', s).strip()
    # Normalize dot attached to identifier: "BLDG.D" -> "BLDG. D"
    core = re.sub(r'\b(BLDG|BLD|BLG|BLDNG)\.([A-Za-z0-9])\b', r'\1. \2', core, flags=re.I)

    # 6. Building extraction
    building = ''
    m_bldg = re.search(r'\b(BLDG\.?|BUILDING|BLD\.?|BLG\.?|BLDNG)\s+([A-Za-z0-9\-\#]+(?:\s+[A-Za-z0-9\-\#]+)*)', core, re.I)
    if m_bldg:
        kw = m_bldg.group(1).upper()
        norm_kw = 'BLDG.' if kw.startswith('BLD') or kw.startswith('BLG') else ('BUILDING' if 'BUILDING' in kw else kw)
        after_words = m_bldg.group(2).strip().split()
        ident_words = []
        for w in after_words:
            clean_w = w.upper().rstrip(',.')
            if clean_w in STOP_WORDS or clean_w.startswith('#'):
                break
            if len(ident_words) >= 1:
                first_w = ident_words[0]
                if re.match(r'^[A-Za-z0-9]$', first_w) or re.match(r'^\d+[A-Za-z]?$', first_w) or re.match(r'^[A-Za-z]-\d+$', first_w):
                    break
            ident_words.append(w)
            if len(ident_words) >= 3:
                break
        if ident_words:
            building = f"{norm_kw} {' '.join(ident_words)}".strip()
            target_str = f"{m_bldg.group(1)} {' '.join(ident_words)}"
            core = core.replace(target_str, ' ').strip()

    # 7. Unit extraction
    unit = ''
    m_unit = re.search(r'\b(UNIT|RM\.?|ROOM|FLOOR|FLR\.?|FL\.?)\s*([A-Za-z0-9\-\#]+)', core, re.I)
    if m_unit:
        u_kw = m_unit.group(1).upper().rstrip('.')
        u_val = m_unit.group(2).upper()
        unit = f"{u_kw} {u_val}".strip()
        core = (core[:m_unit.start()] + ' ' + core[m_unit.end():]).strip()

    # 8. Block and Lot Extraction (Rule 2 - short and long forms)
    block_lot = ''
    blk_lot_patterns = [
        # B-9 L-30 or B9 L30 or BLK 9 LOT 30 or B-9, L-30 with optional PHASE
        r'\b(?:BLK|BLOCK|B\.?LK|B)[-\s]*\d+[A-Z]?(?:[,\s]+(?:LOT|L0T|LT|L)[-\s]*\d+[A-Z]?)(?:[,\s]+(?:PHASE|PH)[-\s]*[A-Z0-9]+)?\b',
        # LOT 30 BLK 9 with optional PHASE
        r'\b(?:LOT|L0T|LT|L)[-\s]*\d+[A-Z]?(?:[,\s]+(?:BLK|BLOCK|B\.?LK|B)[-\s]*\d+[A-Z]?)(?:[,\s]+(?:PHASE|PH)[-\s]*[A-Z0-9]+)?\b',
        # Standalone BLK 9 / BLOCK 9
        r'\b(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?(?:[,\s]+(?:PHASE|PH)[-\s]*[A-Z0-9]+)?\b',
        # Standalone LOT 30
        r'\b(?:LOT|L0T|LT)\.?\s*\d+[A-Z]?(?:[,\s]+(?:PHASE|PH)[-\s]*[A-Z0-9]+)?\b',
        # Standalone PHASE 2 / PH 2 / PH-2
        r'\b(?:PHASE|PH)[-\s\.]+[A-Z0-9]+\b',
    ]

    for pat in blk_lot_patterns:
        m_blk = re.search(pat, core, re.I)
        if m_blk:
            start_pos = m_blk.start()
            prefix_check = core[:start_pos].strip()
            if prefix_check and any(prefix_check.upper().endswith(w) for w in ['HOMES', 'RESIDENCES', 'TOWER', 'BLDG', 'BUILDING']):
                continue
            block_lot = m_blk.group(0).strip()
            core = (core[:m_blk.start()] + ' ' + core[m_blk.end():]).strip()
            break

    # If AI provided block_lot and splitter didn't find in core, reconcile safely
    if not block_lot and ai.get('block_lot'):
        ai_bl = ai['block_lot'].strip()
        if re.search(r'\b' + re.escape(ai_bl) + r'\b', raw, re.I):
            block_lot = ai_bl
            core = re.sub(r'\b' + re.escape(ai_bl) + r'\b', ' ', core, flags=re.I).strip()

    # 9. Street extraction (Rule 3 - BEFORE village, matching Rule 1 sequence)
    street = ''
    house_num_only = ''

    street_kw_regex = '|'.join(re.escape(k) for k in STREET_KEYWORDS)
    # Optional leading house number followed by street name and street keyword
    s_pattern = r'\b(?:(#?\d+[-\u2013/A-Za-z]?)\s+)?((?:[A-Za-z0-9\.\-]+\s+)*?[A-Za-z0-9\.\-]+\s+(?:' + street_kw_regex + r'))\b'
    m_st = re.search(s_pattern, core, re.I)
    if m_st:
        h_cand = m_st.group(1)
        st_cand = m_st.group(2).strip()
        if h_cand and not unit:
            house_num_only = h_cand.lstrip('#')
        street = st_cand
        core = (core[:m_st.start()] + ' ' + core[m_st.end():]).strip()
    elif ai.get('street'):
        # AI provided street: validate strictly against Rule 3
        ai_st = str(ai['street']).strip()
        ai_conf = (ai.get('field_confidences') or {}).get('street', 'low')
        
        is_same_as_brgy = barangay and clean_for_comparison(ai_st) == clean_for_comparison(barangay)
        is_same_as_city = city and clean_for_comparison(ai_st) in clean_for_comparison(city)
        has_st_keyword = any(re.search(r'\b' + re.escape(k.rstrip('.')) + r'\b', ai_st.upper()) for k in STREET_KEYWORDS)
        is_area_name = ai_st.upper() in CALOOCAN_AREA_NAMES

        if is_same_as_brgy:
            notes.append("Dropped: same as barangay")
            confidences['street'] = 'low'
            street = ''
        elif is_same_as_city:
            notes.append("Dropped: same as city")
            confidences['street'] = 'low'
            street = ''
        elif is_area_name and not has_st_keyword and ai_conf != 'high':
            notes.append("Dropped: area name without a street keyword")
            confidences['street'] = 'low'
            street = ''
        elif re.search(r'\b' + re.escape(ai_st) + r'\b', raw, re.I):
            street = ai_st
            core = re.sub(r'\b' + re.escape(ai_st) + r'\b', ' ', core, flags=re.I).strip()
        else:
            notes.append("Street not found in address text")
            confidences['street'] = 'low'
            street = ''

    # 10. Subdivision / Village extraction (Rule 4 - words that remain in core)
    subdivision = ''
    v_pattern = r'\b((?:[A-Za-z0-9\.\-]+\s+)*(?:[A-Za-z0-9\.\-]+)\s+(?:' + '|'.join(VILLAGE_KEYWORDS) + r')(?:\s+(?:[IVX]+|\d+[A-Z]?))?)\b'
    m_sub = re.search(v_pattern, core, re.I)
    if m_sub:
        cand_sub = m_sub.group(1).strip()
        # Rule 4: Clean block_lot out of subdivision if matched
        if block_lot and clean_for_comparison(block_lot) in clean_for_comparison(cand_sub):
            cand_sub = re.sub(re.escape(block_lot), '', cand_sub, flags=re.I).strip()
        subdivision = cand_sub
        core = (core[:m_sub.start()] + ' ' + core[m_sub.end():]).strip()
    elif ai.get('subdivision'):
        ai_sub = ai['subdivision'].strip()
        if block_lot and clean_for_comparison(block_lot) in clean_for_comparison(ai_sub):
            ai_sub = re.sub(re.escape(block_lot), '', ai_sub, flags=re.I).strip()
        if re.search(r'\b' + re.escape(ai_sub) + r'\b', raw, re.I):
            subdivision = ai_sub
            core = re.sub(r'\b' + re.escape(ai_sub) + r'\b', ' ', core, flags=re.I).strip()

    # Rule 3b check: if street somehow matched subdivision name, clear street
    if street and subdivision and clean_for_comparison(street) == clean_for_comparison(subdivision):
        notes.append("Dropped: street same as subdivision")
        street = ''
        confidences['street'] = 'low'

    # Check for leading house number if still empty
    if not house_num_only and not unit and not block_lot:
        m_hn = re.match(r'^(#?\d+[-\u2013/A-Za-z]?)\s+(?=[A-Za-z])', core)
        if m_hn:
            house_num_only = m_hn.group(1).lstrip('#')
            core = core[m_hn.end():].strip()

    # Rule 3: NEVER create a street from leftover words in core!
    core_clean = re.sub(r'[,/\-\s]+', ' ', core).strip()
    if core_clean:
        if barangay and clean_for_comparison(core_clean) == clean_for_comparison(barangay):
            notes.append(f"Leftover barangay token ignored: {core_clean}")
        elif core_clean.upper() in CALOOCAN_AREA_NAMES:
            notes.append(f"Dropped: area name without a street keyword ({core_clean})")
        else:
            notes.append(f"Unassigned words: {core_clean}")

    # Set house_no
    house_no = unit if unit else house_num_only

    # Rule 4: building_village
    building_village = ''
    if building and subdivision:
        building_village = f"{building}, {subdivision}"
    elif building:
        building_village = building
    elif subdivision:
        building_village = subdivision

    # Confidences (Rule 5)
    confidences['building'] = 'high' if building else 'not_read'
    confidences['unit'] = 'high' if unit else 'not_read'
    confidences['house_no'] = 'high' if house_no else 'not_read'
    confidences['block_lot'] = 'high' if block_lot else 'not_read'
    confidences['subdivision'] = 'high' if subdivision else 'not_read'
    confidences['village'] = confidences['subdivision']
    confidences['building_village'] = 'high' if building_village else 'not_read'
    confidences['barangay'] = 'high' if barangay else 'not_read'

    if not street:
        if 'street' not in confidences:
            confidences['street'] = 'not_read'
            notes.append("Street not printed on the ID")
    else:
        has_st_keyword = any(re.search(r'\b' + re.escape(k.rstrip('.')) + r'\b', street.upper()) for k in STREET_KEYWORDS)
        confidences['street'] = 'high' if has_st_keyword else 'medium'

    return {
        'unit': unit,
        'building': building,
        'house_no': house_no,
        'block_lot': block_lot,
        'subdivision': subdivision,
        'village': subdivision,
        'street': street,
        'building_village': building_village,
        'barangay': barangay,
        'city': city,
        'province_or_region': province_or_region,
        'district': district,
        'postal_code': postal_code,
        'address_parse': {
            'confidences': confidences,
            'notes': notes
        }
    }
