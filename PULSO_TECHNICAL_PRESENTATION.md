# PULSO: Unified Infrastructure Management System
## Technical Architecture & Intelligence Showcase

This document provides a high-level overview of the professional-grade API and logic implementation behind **PULSO** (*Public Unified Lifecycle System for Operations*), a mission-critical platform for the Caloocan City Engineering Office.

---

### 1. AI-Driven Incident Intelligence
PULSO utilizes **Gemini 2.5 Flash** for multi-modal triage. This system performs real-time visual analysis of infrastructure hazards and automated safety filtering to prevent spam.

```python
# backend/gemini_service.py

def analyze_report(description: str, image_data: Optional[bytes] = None) -> Dict:
    """
    PULSO Vision Eye — Multi-modal triage agent for infrastructure reports.
    Determines severity, urgency, and technical category using Vision analysis.
    """
    prompt = f"""You are the "Vision Eye" triage agent for PULSO Caloocan.
    Analyze the following resident report and provide a structured technical assessment.
    
    Report Description: "{description}"
    { "Examine the attached image for structural damage or public safety risks." if image_data else "" }
    
    Return JSON: 
    - category: Road Issue | Water/Drainage | Lighting | Public Safety
    - urgency: Low | Medium | High | Critical
    - severity_score: 0.0 - 10.0
    - is_inappropriate: bool (Safety filter)
    """
    
    # Vision analysis (Multimodal) or Text-only fallback
    raw = _generate_multimodal(prompt, image_data) if image_data else _generate(prompt)
    return json.loads(raw) if raw else _local_safety_fallback(description)
```

---

### 2. Government ID OCR & LLM-Refined Parsing
The system supports 9+ Philippine government ID types. It uses a hybrid approach: **Google Cloud Vision** for raw OCR, followed by **Gemini-powered heuristic refinement** to correct OCR errors (e.g., O vs 0) and extract structured data.

```python
# backend/ocr_service.py

def extract_id_details(text: str) -> Dict[str, Any]:
    """
    Orchestrates the ID extraction logic.
    1. Detects ID type (PhilID, LTO, UMID, etc.)
    2. Routes to specialized modular parsers
    3. Refines output using Vertex AI for 'label bleed' correction
    """
    id_type = detect_id_type(text)
    parser = get_parser(id_type)
    parsed = parser.extract(text)

    # Vertex AI Refinement: Handles complex noisy text better than regex
    llm_extracted = gemini_service.extract_id_data(text, id_type=id_type)
    
    # Merge & Validate North Caloocan Residency (Brgy 165-188)
    is_nc, msg = verify_north_caloocan_residency(text, parsed.get('barangay'))
    
    return {**parsed, "is_north_caloocan": is_nc, "verification_message": msg}
```

---

### 3. Mission-Critical Infrastructure Workflows
PULSO manages the entire lifecycle of infrastructure projects (Phases 1-12), from initial citizen reports to Certificate of Completion issuance, governed by strict Role-Based Access Control (RBAC).

```python
# backend/gov_router.py

@router.patch("/projects/{proj_id}/advance", response_model=gov_schemas.ProjectRequestResponse)
def advance_project_phase(proj_id: int, payload: gov_schemas.ProjectRequestUpdate, db: Session = Depends(get_db)):
    """
    Advanced Phase State Machine (FR-14).
    Transitions projects through Survey -> Design -> BoQ -> Procurement -> Execution.
    Includes role-enforced approval gates for each phase.
    """
    _assert_role(current_user, *GOV_ROLES)
    
    proj = gov_crud.advance_project_phase(
        db, proj_id, payload.status,
        actor_id=current_user.id, actor_role=current_user.role
    )
    return gov_crud.enrich_project(proj, db)
```

---

### 4. Geospatial Intelligence & Geo-Clustering
To prevent redundant work, PULSO implements **DBSCAN-based clustering** for incidents and uses **Google Maps Directions API** for optimized dispatcher routing.

```python
# backend/main.py (Geo-Proxy)

@app.get("/api/maps/directions")
async def get_directions_proxy(origin: str, destination: str):
    """
    Backend proxy for Google Maps Directions.
    Keeps API keys secure server-side while providing live routing 
    information for the Dispatcher Command Center.
    """
    route = await maps_service.get_directions(origin, destination)
    if not route or route.get("status") != "OK":
        raise HTTPException(status_code=400, detail="Routing failed")
    return route
```

---

### 5. Unified Command Center UI
The frontend is built with **React 18** and **Lucide Icons**, featuring a premium "glassmorphism" design and real-time state synchronization with the FastAPI backend.

```javascript
// frontend/src/hooks/useIncidentTriage.js

export const useIncidentTriage = (incidentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTriage = async () => {
    try {
      // Fetches both the report and the AI-generated technical assessment
      const response = await api.get(`/reports/${incidentId}`);
      setData(response.data);
    } catch (err) {
      toast.error("Failed to sync with Command Center");
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refresh: fetchTriage };
};
```

---

### Technical Stack Summary
- **Backend**: FastAPI (Python 3.10+)
- **Database**: SQLAlchemy + PostgreSQL/SQLite
- **Intelligence**: Gemini 2.5 Flash, Google Cloud Vision
- **Maps**: Google Maps Platform (Geocoding, Directions, JavaScript API)
- **Frontend**: React + Vite, Tailwind CSS (Custom Theme)
- **Security**: OAuth2 with JWT, BCrypt Password Hashing, RBAC
