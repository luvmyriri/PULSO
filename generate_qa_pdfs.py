"""
PULSO QA & SDLC Documentation Stylized PDF Generator
Generates publication-grade, beautifully stylized PDF documents for Codex QA deliverables.
"""

import os
import re
import subprocess
import markdown
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.formatters import HtmlFormatter

WORKSPACE_DIR = r"c:\Users\Val\Desktop\PULSO"
DOCS_DIR = os.path.join(WORKSPACE_DIR, "docs", "ui-ux-audit")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "docs", "pdf_exports")
os.makedirs(OUTPUT_DIR, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# Custom Badge Replacements for Tables and Text
STATUS_BADGES = {
    r'\bImplemented\b': '<span class="badge badge-implemented">Implemented</span>',
    r'\bProposed\b': '<span class="badge badge-proposed">Proposed</span>',
    r'\bBroken\b': '<span class="badge badge-broken">Broken</span>',
    r'\bObserved risk\b': '<span class="badge badge-risk">Observed risk</span>',
    r'\bUI-contract gap\b': '<span class="badge badge-gap">UI-contract gap</span>',
    r'\bDecision required\b': '<span class="badge badge-decision">Decision required</span>',
    r'\bBackend-only\b': '<span class="badge badge-backend">Backend-only</span>',
    r'\bLive route\b': '<span class="badge badge-live">Live route</span>',
    r'\bPublic\b': '<span class="badge badge-public">Public</span>',
    r'\bBearer\b': '<span class="badge badge-bearer">Bearer</span>',
    r'\bResident/owner\b': '<span class="badge badge-owner">Resident/owner</span>',
    r'\bGovernment role\b': '<span class="badge badge-gov">Government role</span>',
    r'\bDynamic capability\b': '<span class="badge badge-capability">Dynamic capability</span>',
    r'\bP0\b': '<span class="badge badge-p0">P0</span>',
    r'\bP1\b': '<span class="badge badge-p1">P1</span>',
    r'\bP2\b': '<span class="badge badge-p2">P2</span>',
}

CSS_STYLES = """
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@400;500;600&display=swap');

@page {
    size: A4 portrait;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-center {
        content: counter(page);
    }
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
}

/* Document Header & Cover */
.doc-cover {
    page-break-after: always;
    padding: 40px 20px 20px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 90vh;
    border-bottom: 2px solid #e2e8f0;
}

.cover-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 30px;
}

.pulse-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border: 2px solid #f97316;
    border-radius: 10px;
    color: #f97316;
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.5px;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
}

.brand-text {
    display: flex;
    flex-direction: column;
}

.brand-title {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 2px;
    color: #0f172a;
    text-transform: uppercase;
}

.brand-sub {
    font-size: 8.5pt;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.cover-main {
    margin: 40px 0;
}

.cover-badge {
    display: inline-block;
    padding: 5px 14px;
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #ffedd5;
    border-radius: 20px;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
}

.cover-title {
    font-size: 26pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 0 0 16px 0;
    letter-spacing: -0.5px;
}

.cover-subtitle {
    font-size: 12pt;
    font-weight: 400;
    color: #475569;
    line-height: 1.6;
    max-width: 650px;
    margin-bottom: 30px;
}

.meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px;
    margin-top: 24px;
}

.meta-item {
    display: flex;
    flex-direction: column;
}

.meta-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 3px;
}

.meta-value {
    font-size: 9.5pt;
    font-weight: 600;
    color: #0f172a;
}

.cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #64748b;
}

/* Headings */
h1 {
    font-size: 17pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 28px;
    margin-bottom: 14px;
    letter-spacing: -0.3px;
    page-break-after: avoid;
    break-after: avoid;
}

h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 22px;
    margin-bottom: 10px;
    border-left: 3.5px solid #f97316;
    padding-left: 10px;
    letter-spacing: -0.2px;
    page-break-after: avoid;
    break-after: avoid;
}

h3 {
    font-size: 10.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
}

h4, h5, h6 {
    font-size: 9.5pt;
    font-weight: 700;
    color: #475569;
    margin-top: 12px;
    margin-bottom: 6px;
    page-break-after: avoid;
    break-after: avoid;
}

p {
    margin: 0 0 10px 0;
}

/* Lists */
ul, ol {
    margin: 0 0 12px 0;
    padding-left: 22px;
}

li {
    margin-bottom: 4px;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
}

thead {
    display: table-header-group;
}

tr {
    page-break-inside: avoid;
    break-inside: avoid;
}

th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #1e293b;
    letter-spacing: 0.2px;
}

td {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    color: #334155;
}

tbody tr:nth-child(even) {
    background-color: #f8fafc;
}

tbody tr:hover {
    background-color: #f1f5f9;
}

/* Blockquotes / Callouts */
blockquote {
    margin: 14px 0;
    padding: 10px 16px;
    background-color: #f8fafc;
    border-left: 4px solid #3b82f6;
    border-radius: 0 6px 6px 0;
    color: #334155;
    font-size: 9pt;
    page-break-inside: avoid;
    break-inside: avoid;
}

blockquote p:last-child {
    margin-bottom: 0;
}

/* Code & Preformatted */
code {
    font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
    font-size: 8.2pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
}

pre {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 8pt;
    line-height: 1.45;
    margin: 12px 0 16px 0;
    border: 1px solid #334155;
    page-break-inside: avoid;
    break-inside: avoid;
}

pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
}

/* Badges */
.badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    line-height: 1.2;
    white-space: nowrap;
}

.badge-implemented {
    background-color: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.badge-proposed {
    background-color: #eff6ff;
    color: #1e40af;
    border: 1px solid #bfdbfe;
}

.badge-broken {
    background-color: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
}

.badge-risk {
    background-color: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
}

.badge-gap {
    background-color: #faf5ff;
    color: #6b21a8;
    border: 1px solid #e9d5ff;
}

.badge-decision {
    background-color: #fff1f2;
    color: #9f1239;
    border: 1px solid #fecdd3;
}

.badge-backend {
    background-color: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
}

.badge-live {
    background-color: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
}

.badge-public {
    background-color: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
}

.badge-bearer {
    background-color: #f5f3ff;
    color: #5b21b6;
    border: 1px solid #ddd6fe;
}

.badge-owner {
    background-color: #fdf2f8;
    color: #9d174d;
    border: 1px solid #fbcfe8;
}

.badge-gov {
    background-color: #f0fdfa;
    color: #115e59;
    border: 1px solid #99f6e4;
}

.badge-capability {
    background-color: #fff7ed;
    color: #9a3412;
    border: 1px solid #fed7aa;
}

.badge-p0 {
    background-color: #dc2626;
    color: #ffffff;
    font-weight: 800;
}

.badge-p1 {
    background-color: #ea580c;
    color: #ffffff;
    font-weight: 800;
}

.badge-p2 {
    background-color: #64748b;
    color: #ffffff;
    font-weight: 700;
}

/* Print Utilities */
.page-break {
    page-break-before: always;
}

.no-break {
    page-break-inside: avoid;
    break-inside: avoid;
}

hr {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 20px 0;
}

/* User Story Cards */
.story-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 16px;
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.story-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
    margin-bottom: 10px;
}

.story-id {
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
}
"""

def extract_meta_table(md_text):
    """Extract metadata key-value table at the top of the markdown if present."""
    meta = {}
    lines = md_text.splitlines()
    table_lines = []
    in_table = False
    for line in lines:
        if line.strip().startswith("| Field | Value |") or (line.strip().startswith("|") and "Field" in line):
            in_table = True
            table_lines.append(line)
            continue
        if in_table:
            if line.strip().startswith("|"):
                table_lines.append(line)
                parts = [p.strip() for p in line.strip().split('|')[1:-1]]
                if len(parts) >= 2 and parts[0] != "---" and not parts[0].startswith(":-"):
                    meta[parts[0]] = parts[1]
            else:
                break
    return meta

def build_cover_html(title, subtitle, meta_dict, doc_badge="QA & SDLC SPECIFICATION"):
    meta_items_html = ""
    for k, v in meta_dict.items():
        meta_items_html += f"""
        <div class="meta-item">
            <span class="meta-label">{k}</span>
            <span class="meta-value">{v}</span>
        </div>
        """
    if not meta_items_html:
        meta_items_html = f"""
        <div class="meta-item"><span class="meta-label">Classification</span><span class="meta-value">Engineering & QA Standard</span></div>
        <div class="meta-item"><span class="meta-label">System</span><span class="meta-value">PULSO Civic Operations Platform</span></div>
        <div class="meta-item"><span class="meta-label">Version</span><span class="meta-value">1.0 Production QA</span></div>
        <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">August 2026</span></div>
        """

    return f"""
    <div class="doc-cover">
        <div class="cover-brand">
            <div class="pulse-logo">P</div>
            <div class="brand-text">
                <span class="brand-title">PULSO PLATFORM</span>
                <span class="brand-sub">Civic Operations & Engineering</span>
            </div>
        </div>
        <div class="cover-main">
            <span class="cover-badge">{doc_badge}</span>
            <h1 class="cover-title">{title}</h1>
            <div class="cover-subtitle">{subtitle}</div>
            <div class="meta-grid">
                {meta_items_html}
            </div>
        </div>
        <div class="cover-footer">
            <span>City Government of Caloocan &bull; Engineering & Resident Operations</span>
            <span>CONFIDENTIAL &bull; STYLIZED QA SPECIFICATION</span>
        </div>
    </div>
    """

def apply_badges(html_text):
    """Replace plain text status terms inside tables with styled badge pills."""
    for pattern, badge in STATUS_BADGES.items():
        # Replace only inside <td> tags or exact occurrences
        html_text = re.sub(rf'(<td>\s*){pattern}(\s*</td>)', rf'\1{badge}\2', html_text)
        html_text = re.sub(rf'(<li>\s*){pattern}(\s*[:\-])', rf'\1{badge}\2', html_text)
        # Also replace bold occurrences like **Implemented** or **Broken**
        html_text = re.sub(rf'<strong>\s*{pattern}\s*</strong>', badge, html_text)
    return html_text

def convert_md_to_html(md_path, custom_title=None, custom_sub=None, badge_text="QA & SDLC SPECIFICATION"):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    meta = extract_meta_table(content)

    # Determine title
    lines = content.splitlines()
    first_h1 = "PULSO Quality Assurance Specification"
    for line in lines:
        if line.startswith("# "):
            first_h1 = line[2:].strip()
            break

    title = custom_title or first_h1
    subtitle = custom_sub or meta.get("Document type", "Systematic Quality Assurance, User Story Acceptance, and Delivery Lifecycle")

    # Remove the top metadata table from rendered body to avoid duplicate display
    body_md = re.sub(r'\| Field \| Value \|[\s\S]*?\n\n', '', content)
    # Remove the initial h1 since it's in the cover
    body_md = re.sub(r'^# .*\n', '', body_md.lstrip())

    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'nl2br', 'sane_lists'])
    body_html = md.convert(body_md)
    body_html = apply_badges(body_html)

    cover_html = build_cover_html(title, subtitle, meta, badge_text)

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        {CSS_STYLES}
    </style>
</head>
<body>
    {cover_html}
    <div class="content-body">
        {body_html}
    </div>
</body>
</html>
"""
    return full_html, title

def render_html_to_pdf(html_path, pdf_path):
    cmd = [
        EDGE_PATH,
        '--headless',
        '--disable-gpu',
        '--run-all-compositor-stages-before-draw',
        '--no-pdf-header-footer',
        '--print-to-pdf=' + os.path.abspath(pdf_path),
        os.path.abspath(html_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error rendering {pdf_path}: {res.stderr}")
        return False
    print(f"[SUCCESS] Generated: {pdf_path} ({os.path.getsize(pdf_path):,} bytes)")
    return True

def generate_individual_pdfs():
    qa_docs = [
        {
            "md": os.path.join(DOCS_DIR, "12-resident-user-stories-and-sdlc.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Resident_QA_and_SDLC.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Resident_QA_and_SDLC.pdf"),
            "title": "Resident-Side User Stories, QA Contract & SDLC",
            "sub": "Comprehensive acceptance criteria, identity tier gates, reporting lifecycle, and automated test matrix for resident surfaces.",
            "badge": "RESIDENT QA & SDLC SPECIFICATION"
        },
        {
            "md": os.path.join(DOCS_DIR, "13-government-user-stories-and-sdlc.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Government_QA_and_SDLC.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Government_QA_and_SDLC.pdf"),
            "title": "Government-Side User Stories, QA Contract & SDLC",
            "sub": "Capability-based government workflows, operational lifecycles, project stages, BoQ/procurement, and field execution test matrices.",
            "badge": "GOVERNMENT QA & SDLC SPECIFICATION"
        },
        {
            "md": os.path.join(DOCS_DIR, "14-end-to-end-system-lifecycle-and-api-contract.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_End_to_End_System_Lifecycle_and_API_QA.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_End_to_End_System_Lifecycle_and_API_QA.pdf"),
            "title": "End-to-End System Lifecycle & API QA Contract",
            "sub": "Cross-system service blueprint, complete 154-operation endpoint catalog, data lineage, idempotency rules, and integration quality gates.",
            "badge": "SYSTEM LIFECYCLE & API CONTRACT"
        },
        {
            "md": os.path.join(DOCS_DIR, "08-traceability-matrix.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Traceability_Matrix_and_Quality_Gates.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Traceability_Matrix_and_Quality_Gates.pdf"),
            "title": "Audit & Implementation Traceability Matrix",
            "sub": "P0-P2 defect finding registry, architectural risk mappings, branch routing, and accountable QA gate owners.",
            "badge": "TRACEABILITY & DEFECT REGISTER"
        }
    ]

    for item in qa_docs:
        if os.path.exists(item["md"]):
            print(f"Processing {item['title']}...")
            html_content, _ = convert_md_to_html(item["md"], item["title"], item["sub"], item["badge"])
            with open(item["html"], 'w', encoding='utf-8') as f:
                f.write(html_content)
            render_html_to_pdf(item["html"], item["pdf"])
        else:
            print(f"Warning: {item['md']} not found!")

def generate_master_dossier():
    """Compiles all core QA specifications into one unified, master executive QA dossier PDF."""
    print("\nCompiling Master QA & SDLC Dossier...")
    
    sections = [
        ("08-traceability-matrix.md", "Section 1: Traceability & Defect Registry"),
        ("12-resident-user-stories-and-sdlc.md", "Section 2: Resident User Stories & Acceptance Criteria"),
        ("13-government-user-stories-and-sdlc.md", "Section 3: Government User Stories & Operational QA"),
        ("14-end-to-end-system-lifecycle-and-api-contract.md", "Section 4: Whole-System Lifecycle & API Contract"),
        ("06-implementation-plan.md", "Section 5: Implementation Phases & Quality Gates"),
        ("07-research-and-validation-plan.md", "Section 6: Field Research & Usability Validation")
    ]

    combined_html_body = ""
    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'nl2br', 'sane_lists'])

    for filename, sec_title in sections:
        filepath = os.path.join(DOCS_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Clean metadata and top title
            body_md = re.sub(r'\| Field \| Value \|[\s\S]*?\n\n', '', content)
            body_md = re.sub(r'^# .*\n', '', body_md.lstrip())

            rendered_sec = md.convert(body_md)
            rendered_sec = apply_badges(rendered_sec)

            combined_html_body += f"""
            <div class="page-break"></div>
            <div class="section-divider">
                <span class="cover-badge" style="margin-top:20px;">PULSO QA DOSSIER</span>
                <h1 style="color: #0f172a; font-size: 20pt; border-bottom: 3px solid #f97316; margin-bottom: 20px;">{sec_title}</h1>
            </div>
            {rendered_sec}
            """
            md.reset()

    meta_master = {
        "Document Type": "Unified Master QA, SDLC & Service Lifecycle Dossier",
        "System Version": "PULSO v1.0 Production Baseline",
        "Authority": "Backend API, UX Rework Contract, City Engineering Specifications",
        "Scope": "Resident Web/Mobile, Command Center, Field Operations, API & Database",
        "Classification": "LGU Technical & Quality Assurance Benchmark",
        "Validated Date": "23 August 2026"
    }

    cover_html = build_cover_html(
        "PULSO Master QA & Quality Assurance Dossier",
        "The definitive end-to-end quality assurance specification, user stories, endpoint contracts, defect traceability, and delivery governance model for the PULSO civic platform.",
        meta_master,
        "MASTER QUALITY ASSURANCE SPECIFICATION"
    )

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PULSO Master QA & SDLC Dossier</title>
    <style>
        {CSS_STYLES}
    </style>
</head>
<body>
    {cover_html}
    <div class="content-body">
        {combined_html_body}
    </div>
</body>
</html>
"""
    master_html_path = os.path.join(OUTPUT_DIR, "PULSO_Master_QA_Dossier.html")
    master_pdf_path = os.path.join(OUTPUT_DIR, "PULSO_Master_QA_Dossier.pdf")

    with open(master_html_path, 'w', encoding='utf-8') as f:
        f.write(full_html)

    render_html_to_pdf(master_html_path, master_pdf_path)

if __name__ == "__main__":
    generate_individual_pdfs()
    generate_master_dossier()
    print("\nAll PDF generations complete! PDFs are stored in:", OUTPUT_DIR)
