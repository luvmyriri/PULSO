import os
try:
    from docx import Document
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
except ImportError:
    print("Please install python-docx: pip install python-docx")
    exit(1)

def create_doc():
    doc = Document()
    
    # Title
    title = doc.add_heading('PULSO Capstone Project: Key Innovations', 0)
    title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    
    doc.add_paragraph(
        "The PULSO (Public Unified Lifecycle System for Operations) project incorporates "
        "several advanced technical innovations to create a robust, scalable, and intelligent "
        "platform for the Caloocan City Engineering Office. Below is an explanation of the core "
        "innovations and how they function."
    )
    
    # 1. AI & Intelligence Layer
    doc.add_heading('1. AI & Intelligence Layer (Google Gemini)', level=1)
    doc.add_paragraph(
        "PULSO integrates Google Gemini 2.5 Flash to provide multi-modal situational awareness "
        "and technical analysis. This layer acts as the cognitive engine for the platform."
    )
    doc.add_heading('Vision-Eye Incident Triage', level=2)
    doc.add_paragraph(
        "Function: Automatically assesses resident reports by analyzing both text descriptions and attached images. "
        "It determines the category of the issue (e.g., Road Issue, Drainage), assesses the urgency, assigns a "
        "technical severity score, and filters inappropriate content. This drastically reduces manual triage time."
    )
    doc.add_heading('ID Refinement & Structured Extraction', level=2)
    doc.add_paragraph(
        "Function: Corrects noisy Optical Character Recognition (OCR) data from uploaded government IDs. "
        "It uses intelligent context to fix errors (like confusing a '0' for an 'O'), standardizes name formats, "
        "and parses specific fields such as birthdates and barangay numbers to ensure data validity."
    )
    doc.add_heading('Omni-Assistant', level=2)
    doc.add_paragraph(
        "Function: A bilingual, context-aware AI assistant trained on specific domain knowledge including DPWH "
        "engineering standards, Philippine government ID verification, and RA 9184 (Government Procurement Law). "
        "It assists both citizens and staff by providing accurate procedural guidance."
    )

    # 2. Geospatial Platform
    doc.add_heading('2. Geospatial Platform (Google Maps & Geo-Logic)', level=1)
    doc.add_paragraph(
        "Comprehensive mapping integration provides the foundation for location tracking, dispatching, and infrastructure monitoring."
    )
    doc.add_heading('Reverse & Forward Geocoding Proxy', level=2)
    doc.add_paragraph(
        "Function: A secure server-side proxy that translates coordinates to human-readable addresses (and vice versa) "
        "while keeping Google API keys secure. It is specifically optimized for the Philippine address format."
    )
    doc.add_heading('Directions & Routing Service', level=2)
    doc.add_paragraph(
        "Function: Retrieves routing paths, travel times, and distance metrics for dispatchers. It allows the command center "
        "to navigate teams to incident locations efficiently."
    )
    doc.add_heading('DBSCAN Geo-Clustering', level=2)
    doc.add_paragraph(
        "Function: Uses density-based spatial clustering (DBSCAN) algorithms to automatically group overlapping reports "
        "within a tight geographic radius (e.g., 10 meters). This prevents duplicate work orders for the same infrastructure hazard."
    )

    # 3. Identity & OCR Lifecycle
    doc.add_heading('3. Identity & OCR Lifecycle', level=1)
    doc.add_paragraph(
        "A robust verification pipeline capable of processing major Philippine government ID types to establish trusted residency."
    )
    doc.add_heading('ID Preprocessing Pipeline', level=2)
    doc.add_paragraph(
        "Function: Prepares user-uploaded IDs by normalizing size and enhancing contrast before passing them to the OCR engine. "
        "This maximizes text extraction accuracy while reducing processing overhead."
    )
    doc.add_heading('Heuristic Barangay Extraction', level=2)
    doc.add_paragraph(
        "Function: Cross-references parsed OCR data against valid ranges for North Caloocan barangays (165–188) and "
        "corrects common spelling variations, allowing the system to automatically approve or flag residency status."
    )

    # 4. Government Workflow State Machine
    doc.add_heading('4. Government Workflow State Machine (RA 9184)', level=1)
    doc.add_paragraph(
        "PULSO incorporates the complex procedural logic required by Philippine government standards."
    )
    doc.add_heading('Phase-Based Project Advancement', level=2)
    doc.add_paragraph(
        "Function: Automates the lifecycle of public works through a multi-phase workflow. Projects move through "
        "stages such as Survey, Design, Budgeting, and Dispatch, with each phase gated by specific role approvals."
    )
    doc.add_heading('Unified Process Timeline', level=2)
    doc.add_paragraph(
        "Function: Provides a reactive audit log that tracks every report and project event. This ensures full transparency "
        "and compliance, attaching the acting personnel and their role to every status change."
    )

    # 5. Security & Communications
    doc.add_heading('5. Security & Communications', level=1)
    doc.add_paragraph(
        "Ensures data integrity and secure platform operations."
    )
    doc.add_heading('Role-Based Access Control (RBAC) Dependency', level=2)
    doc.add_paragraph(
        "Function: Uses a strict dependency injection system to enforce authorization across all backend routes. Users "
        "can only perform actions permitted by their specific operational role (e.g., Dispatcher, Engineer)."
    )

    # 6. Frontend Integration Layer
    doc.add_heading('6. Frontend Integration Layer', level=1)
    doc.add_paragraph(
        "The web client is built to maintain seamless synchronization with the backend intelligence."
    )
    doc.add_heading('Live Map & Routing Hook', level=2)
    doc.add_paragraph(
        "Function: A custom React hook that coordinates real-time mapping state, decoding server-side polylines and "
        "rendering interactive incident markers and dispatch routes directly on the Command Center interface."
    )

    doc.save('PULSO_Innovations.docx')
    print("Successfully created PULSO_Innovations.docx")

if __name__ == '__main__':
    create_doc()
