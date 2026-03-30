import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# --- Design Configuration ---
COLOR_BG = RGBColor(12, 17, 30)      # Midnight Blue
COLOR_CARD = RGBColor(22, 28, 45)    # Card Gray Blue
COLOR_ACCENT = RGBColor(0, 255, 255) # Electric Cyan
COLOR_BRAND = RGBColor(249, 115, 22)  # Orange
COLOR_TEXT = RGBColor(255, 255, 255) 
COLOR_SUBTEXT = RGBColor(180, 180, 220)

SLIDE_WIDTH = Inches(10)
SLIDE_HEIGHT = Inches(5.625)
MARGIN = Inches(0.4)

# --- Design Helpers ---

def apply_dynamic_base(slide, index):
    # Background
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = COLOR_BG
    
    # Slanted Accent Shapes (Asymmetrical Design)
    if index % 2 == 0:
        # Top-right triangle
        shp = slide.shapes.add_shape(MSO_SHAPE.RIGHT_TRIANGLE, SLIDE_WIDTH - Inches(4), 0, Inches(4), Inches(2))
        shp.fill.solid(); shp.fill.fore_color.rgb = COLOR_CARD; shp.line.fill.background(); shp.rotation = 90
    else:
        # Bottom-left triangle
        shp = slide.shapes.add_shape(MSO_SHAPE.RIGHT_TRIANGLE, 0, SLIDE_HEIGHT - Inches(2), Inches(3), Inches(2))
        shp.fill.solid(); shp.fill.fore_color.rgb = COLOR_CARD; shp.line.fill.background()

    # Thin Top-Bottom bars for aesthetic balance
    bar_t = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_WIDTH, Inches(0.04))
    bar_t.fill.solid(); bar_t.fill.fore_color.rgb = COLOR_ACCENT; bar_t.line.fill.background()
    
    bar_b = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, SLIDE_HEIGHT - Inches(0.04), SLIDE_WIDTH, Inches(0.04))
    bar_b.fill.solid(); bar_b.fill.fore_color.rgb = COLOR_BRAND; bar_b.line.fill.background()

def add_hero_header(slide, title, subtitle=None):
    title_box = slide.shapes.add_textbox(MARGIN, MARGIN + Inches(0.2), SLIDE_WIDTH - 2*MARGIN, Inches(1))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = title.upper()
    p.font.size = Pt(40) # LARGER TYPOGRAPHY
    p.font.bold = True
    p.font.color.rgb = COLOR_ACCENT
    p.font.name = "Impact" if title == "PULSO" else "Trebuchet MS"
    p.alignment = PP_ALIGN.LEFT
    
    if subtitle:
        st_box = slide.shapes.add_textbox(MARGIN, MARGIN + Inches(0.85), SLIDE_WIDTH - 2*MARGIN, Inches(0.4))
        stf = st_box.text_frame
        sp = stf.paragraphs[0]
        sp.text = subtitle
        sp.font.size = Pt(20) # LARGER TYPOGRAPHY
        sp.font.color.rgb = COLOR_SUBTEXT
        sp.font.name = "Trebuchet MS"

def create_hero_card(slide, left, top, width, height, icon, title, content):
    # Card Shadow (Outer Glow simulation)
    outer = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left - Inches(0.02), top - Inches(0.02), width + Inches(0.04), height + Inches(0.04))
    outer.fill.solid(); outer.fill.fore_color.rgb = COLOR_ACCENT; outer.line.fill.background()
    
    # Main Card
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid(); card.fill.fore_color.rgb = COLOR_CARD; card.line.fill.background()
    
    # Title/Icon Header
    h_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.1), width - Inches(0.4), Inches(0.6))
    htf = h_box.text_frame
    p = htf.paragraphs[0]; p.text = f"{icon} {title}"; p.font.size = Pt(22); p.font.bold = True; p.font.color.rgb = COLOR_TEXT
    
    # Content body
    c_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.8), width - Inches(0.4), height - Inches(0.9))
    ctf = c_box.text_frame; ctf.word_wrap = True
    for line in content:
        p = ctf.add_paragraph(); p.text = "► " + line; p.font.size = Pt(14); p.font.color.rgb = COLOR_SUBTEXT; p.space_after = Pt(8)

def add_waterfall_node_v3(slide, left, top, width, height, index, label, desc):
    node = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    node.fill.solid(); node.fill.fore_color.rgb = COLOR_CARD; node.line.color.rgb = COLOR_ACCENT; node.line.width = Pt(1.5)
    
    idx_box = slide.shapes.add_textbox(left, top - Inches(0.35), width, Inches(0.3))
    itf = idx_box.text_frame; p = itf.paragraphs[0]; p.text = f"STEP {index+1}"; p.font.size = Pt(12); p.font.bold = True; p.font.color.rgb = COLOR_ACCENT; p.alignment = PP_ALIGN.CENTER
    
    l_box = slide.shapes.add_textbox(left + Inches(0.1), top + Inches(0.2), width - Inches(0.2), Inches(0.5))
    ltf = l_box.text_frame; p = ltf.paragraphs[0]; p.text = label; p.font.size = Pt(16); p.font.bold = True; p.font.color.rgb = COLOR_TEXT; p.alignment = PP_ALIGN.CENTER
    
    d_box = slide.shapes.add_textbox(left + Inches(0.1), top + (height/2), width - Inches(0.2), height/2)
    dtf = d_box.text_frame; dtf.word_wrap = True; p = dtf.paragraphs[0]; p.text = desc; p.font.size = Pt(11); p.font.color.rgb = COLOR_SUBTEXT; p.alignment = PP_ALIGN.CENTER

    if index < 5:
        arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left + width - Inches(0.1), top + (height/2) - Inches(0.1), Inches(0.25), Inches(0.2))
        arrow.fill.solid(); arrow.fill.fore_color.rgb = COLOR_BRAND; arrow.line.fill.background()

# --- Main Generator ---

def main():
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH; prs.slide_height = SLIDE_HEIGHT

    # 1. TITLE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 0)
    t = slide.shapes.add_textbox(Inches(0.5), Inches(1.2), Inches(9), Inches(2))
    p = t.text_frame.paragraphs[0]; p.text = "P U L S O"; p.font.size = Pt(120); p.font.bold = True; p.font.color.rgb = COLOR_ACCENT; p.alignment = PP_ALIGN.CENTER
    st = slide.shapes.add_textbox(Inches(0.5), Inches(3.0), Inches(9), Inches(1))
    sp = st.text_frame.paragraphs[0]; sp.text = "Unified Command & Predictive Urban Resilience Dashboard"; sp.font.size = Pt(26); sp.font.color.rgb = COLOR_TEXT; sp.alignment = PP_ALIGN.CENTER
    np = slide.shapes.add_textbox(Inches(0.5), Inches(4.3), Inches(9), Inches(0.6)).text_frame.paragraphs[0]
    np.text = "Evangelista | Garcia | Lamsen | Tabios — University of Caloocan City"; np.font.size = Pt(16); np.font.color.rgb = COLOR_SUBTEXT; np.alignment = PP_ALIGN.CENTER

    # 2. JUSTIFICATION
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 1); add_hero_header(slide, "Project Justification", "Transitioning from Reactive to Predictive Maintenance")
    create_hero_card(slide, MARGIN, Inches(1.5), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "🏗️", "The Vision & Imperative", [
        "A real-time, citizen-centric ecosystem for infrastructure 'health' visualization.",
        "Focus on North Caloocan: High density, irregular terrain, and flood vulnerability.",
        "Empowering citizens as 'Sensor Nodes' with high-precision GPS geo-tagging.",
        "Gemini AI Integration: Automated triage to eliminate administrative lag.",
        "Strategic Shift: From fragmented reports to professional GIS-based work orders."
    ])

    # 3. SOP OVERVIEW
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 2); add_hero_header(slide, "Statement of the Problem", "Systemic Operational Vulnerabilities")
    w = (SLIDE_WIDTH - 2*MARGIN - 0.5)/3
    create_hero_card(slide, MARGIN, Inches(1.6), w, Inches(3.4), "🏛️", "Silo Effect", ["Fragmented logs.", "Delayed responses.", "Disconnected data."])
    create_hero_card(slide, MARGIN + w + 0.25, Inches(1.6), w, Inches(3.4), "📊", "Redundancy", ["Duplicate reports.", "Help-desk noise.", "Inefficiency surge."])
    create_hero_card(slide, MARGIN + 2*(w+0.25), Inches(1.6), w, Inches(3.4), "📍", "Visibility Gap", ["Location ambiguity.", "Manual map lag.", "Algorithmic noise."])

    # 4. DATA INSIGHTS
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 3); add_hero_header(slide, "Accountability & Apathy", "Empirical Findings (North Caloocan Survey)")
    w = (SLIDE_WIDTH - 2*MARGIN - 0.4)/2
    create_hero_card(slide, MARGIN, Inches(1.6), w, Inches(3.4), "📉", "Reporting Friction", ["50% rely on Facebook noise.", "35% do not report at all.", "Apathy stems from opacities."])
    create_hero_card(slide, MARGIN + w + 0.4, Inches(1.6), w, Inches(3.4), "🛰️", "Location Bottleneck", ["85% fail at verbal location.", "40% find address markers 'Missing'.", "Validates: Auto-GPS metadata."])

    # 5. RESEARCH QUESTIONS
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 4); add_hero_header(slide, "Research Inquiries", "Defining System Key Success Indicators")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.4), "🧬", "Foundational Questions", [
        "Does the Visibility Gap impact real-time infrastructure status awareness?",
        "How can AI-driven triage improve hazard prioritization speeds?",
        "Can automated status feedback loops restore deep civic trust?",
        "Is structured geospatial data superior to the 'Social Media Governance Fallacy'?",
        "What are the consequences of lack of accountability on city delivery?"
    ])

    # 6. SOLUTION: ECOSYSTEM
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 5); add_hero_header(slide, "Proposed Solution: PULSO", "The Integrated GeoAI Command Ecosystem")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "🤖", "Technical Innovations", [
        "Gemini Vision Triage: Multimodal hazard categorization & Severity Scoring.",
        "DBSCAN Deduplication Engine: Density-based spatial clustering of proximal reports.",
        "Operational Heat Map: Color-coded GIS 'Pressure Zone' visualization.",
        "Automated Status Loop: Transparent notifications (Received → Dispatched → Resolved).",
        "EAM Framework: End-to-end Enterprise Asset Management lifecycle."
    ])

    # 7-8-9 SCOPE (CITIZEN / LGU / CREW)
    for i, (icon, title, details) in enumerate([
        ("📱", "Citizen Feedback Portal", ["Snap & Pin mechanism.", "Auto-GPS Extraction (≤5m).", "Offline Draft Sync.", "Real-time Push Alerts."]),
        ("🖥️", "LGU Command Dashboard", ["AI-Analytic Heat Maps.", "Gemini 1.5 Flash Triage.", "Work Order Life-cycle.", "Personnel Fleet Tracking."]),
        ("🛠️", "Field Crew Representative", ["Digital Job Tickets.", "GIS-Optimized Routing.", "Proof of Repair Upload.", "Asynchronous Updates."])
    ]):
        slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 6+i); add_hero_header(slide, "System Scope", title)
        create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.4), icon, title, details)

    # 10. LEGAL & COMPLIANCE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 9); add_hero_header(slide, "Compliance & Frameworks", "Statutory Standards and Legal Rigor")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "⚖️", "Institutional Alignment", [
        "RA 10173 (Data Privacy): Sanitizing personally identifiable information (PII).",
        "RA 12254 (E-Governance): Mandating digital transparency in urban delivery.",
        "RA 9184 (Procurement): Automated Program of Works based on historical clusters.",
        "ISO/IEC 25010: Software Quality Evaluation (DBSCAN 95% threshold target)."
    ])

    # 11-14 METHODOLOGY PHASES (WATERFALL)
    m_phases = [
        ("Phase 1: Requirements", "Community surveys & expert interviews (Google Forms)."),
        ("Phase 2: System Design", "ERD, DFD, and UI high-fidelity wireframing in React."),
        ("Phase 3: Development", "FastAPI Asynchronous Engine & Flutter Mobile Environment."),
        ("Phase 4: Testing", "UAT validation and 10,000 point geospatial stress tests."),
        ("Phase 5: Deployment", "Google Cloud Run & 90-Day Predictive Resilience Roadmap."),
        ("Phase 6: Maintenance", "AI Model Drift Mitigation & field-photo fine-tuning.")
    ]
    node_w = (SLIDE_WIDTH - 2*MARGIN - (5*Inches(0.1))) / 6
    for i in range(2): # 2 Slides for methodology
        slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 10+i); add_hero_header(slide, "Research Methodology", f"The Waterfall Roadmap (Steps {i*3+1}-{i*3+3})")
        for j in range(3):
            idx = i*3 + j
            add_waterfall_node_v3(slide, MARGIN + j*(node_w+0.15), Inches(2.2), node_w+0.05, Inches(2.2), idx, m_phases[idx][0], m_phases[idx][1])

    # 15. BACKEND ARCHITECTURE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 12); add_hero_header(slide, "Backend Engineering", "Asynchronous High-Concurrency Engine")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "⚡", "FastAPI Core", [
        "Specialized Services: OCR Identity, Gemini Triage, and Spatial Deduplication.",
        "Authentication: JWT Security with reCAPTCHA v2 verification.",
        "Database: SQLAlchemy ORM layer for spatial record persistence.",
        "Email Node: SMTP Identity Protocol for official city registries."
    ])

    # 16. FRONTEND ENGINEERING
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 13); add_hero_header(slide, "Frontend Engineering", "Reactive GIS & Omni-Assistant UI")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "🎨", "React + Google Maps", [
        "Visualization: GPU-accelerated HeatmapLayerF for pressure zone rendering.",
        "Animations: Framer Motion for premium modal transitions and state changes.",
        "AI Omni-Assistant: Integrated co-pilot for high-speed triage decisions.",
        "Custom SVG Pins: Dynamic marker generation based on hazard type/status."
    ])

    # 17. ALGORITHMS: HAVERSINE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 14); add_hero_header(slide, "The Science of Distance", "The Haversine Formula for Accurate Deduplication")
    box = slide.shapes.add_textbox(MARGIN, Inches(1.8), SLIDE_WIDTH-2*MARGIN, Inches(1.2))
    p = box.text_frame.paragraphs[0]; p.text = "d = 2R arcsin(√(sin²(Δφ/2) + cos φ₁ ⋅ cos φ₂ ⋅ sin²(Δλ/2)))"; p.font.size = Pt(36); p.font.bold = True; p.font.color.rgb = COLOR_TEXT; p.alignment = PP_ALIGN.CENTER
    create_hero_card(slide, MARGIN, Inches(3.2), SLIDE_WIDTH-2*MARGIN, Inches(1.8), "📐", "Mathematical Rigor", ["Precision geo-deduplication on Earth's ellipsoid.", "Prevents duplicate work orders for reports within a 50m radius."])

    # 18. ALGORITHMS: DBSCAN
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 15); add_hero_header(slide, "Spatial Clustering", "DBSCAN: Density-Based Spatial Clustering")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.4), "📊", "Algorithmic Logic", [
        "Proximity Grouping: Merges incidents into single actionable tickets.",
        "Noise Filtering: Eliminates outliers and isolated invalid reports.",
        "No Cluster Count (K) Required: Organically adapts to urban density.",
        "Scalability: Linear complexity via BallTree spatial search indexing."
    ])

    # 19. GEMINI VISION TRIAGE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 16); add_hero_header(slide, "Gemini AI Engine", "Gemini 1.5 Flash Multimodal Triage")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "👁️", "Machine Vision", [
        "Multimodal Input: Simultaneous analysis of hazard photos and descriptions.",
        "Classification Confidence: 75% threshold filter for manual review escalation.",
        "Semiautonomous Scoring: Severity 1-10 ranking based on detected hazards.",
        "Structued Output: Guaranteed JSON response for database-ready integration."
    ])

    # 20. ROADMAP
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 17); add_hero_header(slide, "Deployment Strategy", "90-Day Predictive Resilience Roadmap")
    w = (SLIDE_WIDTH-2*MARGIN-0.4)/3
    create_hero_card(slide, MARGIN, Inches(1.6), w, Inches(3.4), "📡", "M1: Digitize", ["Asset mapping.", "Staff training.", "Baseline data."])
    create_hero_card(slide, MARGIN + w + 0.2, Inches(1.6), w, Inches(3.4), "🔄", "M2: Transition", ["Citizen onboarding.", "AI cluster data.", "Early repair."])
    create_hero_card(slide, MARGIN + 2*(w+0.2), Inches(1.6), w, Inches(3.4), "🌟", "M3: Mastery", ["Predictive heat maps.", "Resilience KPI.", "RUL analysis."])

    # 21. MAINTENANCE
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 18); add_hero_header(slide, "System Longevity", "Model Drift Mitigation & Maintenance")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.5), "🛠️", "Continuous Fine-Tuning", [
        "Closed-Loop Learning: 'Proof of Repair' photos validate AI accuracy.",
        "Supervised Re-training: Feed local visual data back into Gemini pipeline.",
        "Local Adaptation: AI adapts to North Caloocan visual infrastructure cues.",
        "Security Audits: Constant updates to maintain Data Privacy compliance."
    ])

    # 22. KEY TAKEAWAYS
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 19); add_hero_header(slide, "Conclusion", "PULSO: The Future of Urban Management")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.4), "📍", "Project Impact", [
        "Efficiency: 40% reduction in LGU administrative triage time.",
        "Integrity: Validated spatial data prevents redundant city expenditures.",
        "Trust: Restoring the citizen-government feedback loop.",
        "Vision: Scalable architecture for future Smart City integrations."
    ])

    # 23. REFERENCES (Final)
    slide = prs.slides.add_slide(prs.slide_layouts[6]); apply_dynamic_base(slide, 20); add_hero_header(slide, "Academic Foundation", "Selected References & Works Cited")
    create_hero_card(slide, MARGIN, Inches(1.6), SLIDE_WIDTH - 2*MARGIN, Inches(3.4), "📚", "Key Sources", [
        "Republic Act No. 10173 (2012) - Data Privacy Act of the Philippines.",
        "Fang et al. (2025) - PASSED: Passenger Selection using Passive Data.",
        "Goodchild (2007) - Citizens as Sensors: Volunteered Geography.",
        "DOST-ASTI (2024) - SkAI-Pinas Program Reports.",
        "Google AI Blog (2025) - Gemini 1.5 Multimodal Architecture."
    ])

    prs.save("PULSO_Premium_Technical_Presentation.pptx")
    print("Premiun Extensive Typography presentation saved successfully.")

if __name__ == "__main__":
    main()
