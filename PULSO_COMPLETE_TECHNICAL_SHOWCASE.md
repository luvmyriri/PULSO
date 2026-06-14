# PULSO: Technical API & High-Level Logic Catalog
## Caloocan City Engineering Office — Unified Command Center

This catalog provides the complete set of code snippets for every major API integration and high-level service within the **PULSO** (*Public Unified Lifecycle System for Operations*) environment.

---

## 1. AI & Intelligence Layer (Google Gemini)
Integrating **Gemini 2.5 Flash** for multi-modal situational awareness and technical analysis.

### A. Vision-Eye Incident Triage
Uses multi-modal analysis to "see" infrastructure hazards and determine severity.
```python
# backend/gemini_service.py -> analyze_report()
prompt = f"""You are the "Vision Eye" triage agent for PULSO Caloocan.
Analyze the following resident report and provide a structured technical assessment.
Report Description: "{description}"
{ "Examine the attached image for visible hazards." if image_data else "No image attached." }
Return ONLY JSON:
- category: Road Issue | Water/Drainage | Waste Management | Lighting | Public Safety
- urgency: Low | Medium | High | Critical
- severity_score: 0.0 - 10.0 (Technical guideline based on danger)
- is_inappropriate: boolean (Automated moderation filter)
"""
```

### B. ID Refinement & Structured Extraction
Corrects noisy OCR data from government IDs into schema-validated registration data.
```python
# backend/gemini_service.py -> extract_id_data()
prompt = f"""You are an expert at parsing noisy OCR text from Philippine Gov IDs.
Rules:
1. Fix OCR errors (0→O, 1→I where contextually appropriate).
2. Names must be Title Case.
3. dob format: YYYY-MM-DD.
4. barangay: number only (165-188 for North Caloocan).
5. Ignore letterheads and agency names.
"""
```

### C. Omni-Assistant (System Instruction)
Bilingual assistant for citizens and staff, trained on DPWH standards and City workflows.
```python
# backend/gemini_service.py -> get_ai_assistant_response()
system_ctx = """
Knowledge Domain:
- DPWH engineering standards (roads, drainage, structural)
- Philippine government ID verification (PhilSys, LTO, UMID)
- RA 9184 Government Procurement Law
- Caloocan City Engineering Office procedures
"""
```

---

## 2. Geospatial Platform (Google Maps & Geo-Logic)
Comprehensive mapping integration for dispatching and infrastructure tracking.

### A. Reverse & Forward Geocoding Proxy
Serverside proxy to keep Google API keys secure while providing location resolution.
```python
# backend/maps_service.py
async def reverse_geocode(lat: float, lng: float):
    # params: latlng, key, language, region=ph, result_type=street_address
    resp = await client.get(GEOCODING_URL, params=params)
    data = resp.json()
    # Returns a shortened, normalized address for Philippine context
```

### B. Directions & Routing Service
Retrieves encoded polylines and travel metrics for dispatcher navigation.
```python
# backend/maps_service.py -> get_directions()
params = {"origin": origin, "destination": destination, "mode": mode, "key": KEY, "region": "ph"}
resp = await client.get(DIRECTIONS_URL, params=params)
# Outputs: polyline, distance text, duration, and bounds for Map bounding
```

### C. DBSCAN Geo-Clustering (Internal High-Level Logic)
Used for automated incident deduplication by grouping GPS pulses within 10-meter radiuses.
```python
# backend/deduplication_service.py
def cluster_reports(reports, epsilon_meters=10.0):
    kms_per_radian = 6371.0
    epsilon_radians = (epsilon_meters / 1000.0) / kms_per_radian
    coords_rad = np.radians([[r['lat'], r['lng']] for r in reports])
    db = DBSCAN(eps=epsilon_radians, min_samples=1, metric='haversine').fit(coords_rad)
    # Result: Automatically assigned cluster_id for every pulse
```

---

## 3. Identity & OCR Lifecycle
Processing 9 major Philippine government ID types for residency verification.

### A. ID Preprocessing Pipeline
Normalizes, enhances, and prepares images for optimal OCR accuracy.
```python
# backend/ocr_service.py -> preprocess_image()
img = Image.open(io.BytesIO(image_bytes))
img = img.resize((800, h), Image.Resampling.BILINEAR) # Faster processing
img = ImageEnhance.Contrast(img).enhance(1.2)
# Saves as optimized JPEG quality 85 for Vision API overhead reduction
```

### B. Heuristic Barangay Extraction
Cross-references detected numbers with the North Caloocan Barangay set (165–188).
```python
# backend/ocr_service.py
def verify_north_caloocan_residency(address_text, brgy_num):
    # Regex search for common misspellings (KALOOKAN, CALOOCAN)
    # Range check on brgy_num: 165 <= brgy_int <= 188
    # Returns verified status + verification_message
```

---

## 4. Government Workflow State Machine (RA 9184)
Complex internal logic for managing the Pulse of the city's infrastructure.

### A. Phase-Based Project Advancement
Automates the lifecycle of civil works through role-locked approval gates.
```python
# backend/gov_router.py -> advance_project_phase()
# Phases 1-12 workflow:
# Survey (Division Chief) -> Design (Engineer) -> BoQ (Estimator) 
# -> Budget (Admin) -> Dispatch (City Engineer) -> Milestone (Inspector)
```

### B. Procurement & Bill of Quantities (BoQ)
Managed API for lifting infrastructure projects into the procurement cycle.
```python
# backend/gov_router.py -> update_procurement_status()
# Workflow: draft → submitted → validated → sent_to_procurement → procured
# Synchronized with Audit Logs for compliance transparency.
```

### C. Unified Process Timeline
A high-level reactive audit log that tracks the pulse of every report and project.
```python
# backend/gov_crud.py -> list_all_timelines()
# Unified query across: Report Events, Work Order Status, and Project Milestones
# Enrichment: Attaches staff name and role to every lifecycle event.
```

---

## 5. Security & Communications
Enterprise-grade authentication and secure personnel communications.

### A. Role-Based Access Control (RBAC) Dependency
Dependency injection for role enforcement across all API routes.
```python
# backend/main.py -> require_role()
def require_role(*roles):
    def _check(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
             # Logic for inherited roles (e.g. City Engineer has all Dispatcher rights)
             raise HTTPException(403, "Unauthorized. Requires clearance.")
```

### B. Security Protocol (SMTP Integration)
Automated professional HTML email templates for credential recovery.
```python
# backend/main.py -> forgot_password()
# Generates recovery link with 1-hour expiry
# SMTP_SSL('smtp.gmail.com', 465)
# Renders 'PULSO Security' branded HTML template with Protocol IDs.
```

---

## 6. Frontend Integration Layer (React Hooks)
High-level state orchestration for the Unified Command Center.

### A. Live Map & Routing Hook
Reactive hook for managing the Dispatcher's map state and route calculations.
```javascript
// frontend/src/hooks/useDispatcherMap.js
const calculateRoute = async (origin, destination) => {
  setIsRouting(true);
  const data = await api.get(`/maps/directions?origin=${origin}&destination=${destination}`);
  setRouteData(data); // Polyline decoding + duration stats
  setIsRouting(false);
};
```
