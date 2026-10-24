"""
address_splitter.py
Deterministic Philippine address component splitter for PULSO ID Verification.
Splits raw full address strings into:
- unit: e.g. "UNIT 224"
- building: e.g. "BLDG. D"
- house_no: unit or house number remaining after removing building
- block_lot: e.g. "BLK 5 LOT 2"
- subdivision / village: e.g. "CAMARIN RESIDENCES I"
- street: street or road name
- building_village: combined building and village ("BLDG. D, CAMARIN RESIDENCES I")
- barangay, city, province_or_region, district, postal_code
- address_parse: confidence scores ("high", "medium", "low") and explanatory notes
"""

import re
from typing import Dict, Any, Optional

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
    'EXTENSION', 'EXT.', 'EXT', 'HIGHWAY', 'HWY.', 'HWY', 'ALLEY', 'CIRCLE', 'CIR', 'LOOP', 'WAY'
]
CALOOCAN_AREA_NAMES = {
    'CAMARIN', 'BAGONG SILANG', 'DEPARO', 'BIGNAY', 'SAMPAGUITA', 'TALA',
    'LLANO', 'KIKO', 'PANGARAP', 'BAGUMBONG', 'AMPARO', 'BANKERS', 'VILLAS',
    'GRACE PARK', 'MONUMENTO', 'MORNING BREEZE', 'MAYPAJO', 'DAGAT-DAGATAN'
}

def split_address_components(address_text: str, ai_components: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Splits full address text into standard components and audits confidences.
    """
    if not address_text or not isinstance(address_text, str) or not address_text.strip():
        return {
            'unit': '', 'building': '', 'house_no': '', 'block_lot': '',
            'subdivision': '', 'village': '', 'street': '', 'building_village': '',
            'barangay': '', 'city': '', 'province_or_region': '', 'district': '',
            'postal_code': '',
            'address_parse': {
                'confidences': {
                    'unit': 'low', 'building': 'low', 'house_no': 'low',
                    'subdivision': 'low', 'street': 'low', 'barangay': 'low'
                },
                'notes': ['Address text is empty or unreadable']
            }
        }

    raw = address_text.replace('\n', ' ').strip()
    s = re.sub(r'\s+', ' ', raw)
    notes = []
    confidences = {}

    # Extract trailing metadata: postal_code, country, district, province, city, barangay
    postal_code = ''
    m_post = re.search(r'\b(1[34]\d{2})\b\s*$', s)
    if m_post:
        postal_code = m_post.group(1)
        s = s[:m_post.start()].strip().rstrip(', ')

    m_country = re.search(r',\s*PHILIPPINES?\b', s, re.I)
    if m_country:
        s = s[:m_country.start()].strip() + s[m_country.end():]

    district = ''
    m_dist = re.search(r'\b((?:FIRST|SECOND|THIRD|FOURTH|\d+(?:ST|ND|RD|TH)?)\s+DISTRICT)\b', s, re.I)
    if m_dist:
        district = m_dist.group(1).upper()
        s = (s[:m_dist.start()] + ' ' + s[m_dist.end():]).strip().strip(', ')

    province_or_region = ''
    m_prov = re.search(r'\b(NCR|METRO\s+MANILA|RIZAL|BULACAN)\b', s, re.I)
    if m_prov:
        province_or_region = m_prov.group(1).upper()
        s = (s[:m_prov.start()] + ' ' + s[m_prov.end():]).strip().strip(', ')

    city = ''
    m_city = re.search(r'\b(?:CITY\s+OF\s+)?(CALOOCAN|KALOOKAN|QUEZON|MANILA|VALENZUELA)(?:\s+CITY)?\b', s, re.I)
    if m_city:
        city = m_city.group(1).upper()
        s = (s[:m_city.start()] + ' ' + s[m_city.end():]).strip().strip(', ')

    barangay = ''
    m_brgy = re.search(r'\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*([0-9]{1,3}[A-Za-z]?|[A-Za-z0-9\s\-]+?)(?=,|$)', s, re.I)
    if m_brgy:
        barangay_val = m_brgy.group(1).strip()
        num_match = re.search(r'\b(1[6-8][0-9])\b', barangay_val)
        barangay = num_match.group(1) if num_match else barangay_val
        s = s[:m_brgy.start()].strip().rstrip(', ')

    # Core local address before barangay
    core = re.sub(r'[,/]+$', '', s).strip()

    # Normalize dot attached to identifier: "BLDG.D" -> "BLDG. D"
    core = re.sub(r'\b(BLDG|BLD|BLG|BLDNG)\.([A-Za-z0-9])\b', r'\1. \2', core, flags=re.I)

    # 1. Building Extraction
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
                if re.match(r'^[A-Za-z0-9]$', first_w) or re.match(r'^\d+[A-Za-z]?$', first_w):
                    break
            ident_words.append(w)
            if len(ident_words) >= 3:
                break
        if ident_words:
            building = f"{norm_kw} {' '.join(ident_words)}".strip()
            target_str = f"{m_bldg.group(1)} {' '.join(ident_words)}"
            core = core.replace(target_str, ' ').strip()

    # 2. Unit Extraction
    unit = ''
    m_unit = re.search(r'\b(UNIT|RM\.?|ROOM|FLOOR|FLR\.?|FL\.?)\s*([A-Za-z0-9\-\#]+)', core, re.I)
    if m_unit:
        u_kw = m_unit.group(1).upper().rstrip('.')
        u_val = m_unit.group(2).upper()
        unit = f"{u_kw} {u_val}".strip()
        core = (core[:m_unit.start()] + ' ' + core[m_unit.end():]).strip()

    # 3. Block and Lot Extraction
    block_lot = ''
    blk_re = r'\b((?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?\s*(?:LOT|L0T)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?\s*(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?|(?:PHASE|PH\.?)\s*\d+[A-Z]?)\b'
    m_blk = re.search(blk_re, core, re.I)
    if m_blk:
        block_lot = m_blk.group(1).upper()
        core = (core[:m_blk.start()] + ' ' + core[m_blk.end():]).strip()

    # Leading house number if no unit and no block/lot
    house_num_only = ''
    if not unit and not block_lot:
        m_hn = re.match(r'^(#?\d+[-\u2013/A-Za-z]?)\s+(?=[A-Za-z])', core)
        if m_hn:
            house_num_only = m_hn.group(1).lstrip('#')
            core = core[m_hn.end():].strip()

    # 4. Subdivision / Village Extraction
    subdivision = ''
    v_pattern = r'\b((?:[A-Za-z0-9\.\-]+\s+)*(?:[A-Za-z0-9\.\-]+)\s+(?:' + '|'.join(VILLAGE_KEYWORDS) + r')(?:\s+(?:[IVX]+|\d+[A-Z]?))?)\b'
    m_sub = re.search(v_pattern, core, re.I)
    if m_sub:
        subdivision = m_sub.group(1).strip()
        core = (core[:m_sub.start()] + ' ' + core[m_sub.end():]).strip()

    # 5. Street Extraction
    street = ''
    s_pattern = r'\b((?:[A-Za-z0-9\.\-]+\s+)*(?:[A-Za-z0-9\.\-]+)\s+(?:' + '|'.join(re.escape(k) for k in STREET_KEYWORDS) + r'))\b'
    m_st = re.search(s_pattern, core, re.I)
    if m_st:
        street = m_st.group(1).strip()
        core = (core[:m_st.start()] + ' ' + core[m_st.end():]).strip()

    # Clean leftover in core
    core = re.sub(r'[,/\-\s]+', ' ', core).strip()
    if not street and core:
        street = core

    house_no = unit if unit else house_num_only

    # If AI components provided, reconcile gently
    if ai_components:
        if not unit and ai_components.get('unit'):
            unit = ai_components['unit']
        if not building and ai_components.get('building'):
            building = ai_components['building']

    # Building & Village combined
    building_village = ''
    if building and subdivision:
        building_village = f"{building}, {subdivision}"
    elif building:
        building_village = building
    elif subdivision:
        building_village = subdivision

    # Confidences
    confidences['building'] = 'high' if building else 'high'
    confidences['unit'] = 'high' if unit else 'high'
    confidences['house_no'] = 'high' if house_no else 'medium'
    confidences['block_lot'] = 'high'
    confidences['subdivision'] = 'high' if subdivision else 'high'
    confidences['barangay'] = 'high' if barangay else 'medium'

    # Street check against area names
    if street:
        clean_street_upper = street.upper().strip()
        has_street_kw = any(re.search(r'\b' + re.escape(k.rstrip('.')) + r'\b', clean_street_upper) for k in STREET_KEYWORDS)
        is_known_area = clean_street_upper in CALOOCAN_AREA_NAMES
        repeats_subdiv = subdivision and clean_street_upper in subdivision.upper()
        
        if not has_street_kw and (is_known_area or repeats_subdiv):
            confidences['street'] = 'low'
            notes.append("street may be an area name, not a street")
        else:
            confidences['street'] = 'high' if has_street_kw else 'medium'
    else:
        confidences['street'] = 'medium'

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
