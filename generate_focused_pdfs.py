"""
PULSO Focused Specification PDF Generator
Generates 4 distinct, stylized, executive PDF documents:
1. Resident Side - User Stories (PULSO_Resident_User_Stories.pdf)
2. Resident Side - SDLC (PULSO_Resident_SDLC.pdf)
3. Government Side - User Stories (PULSO_Government_User_Stories.pdf)
4. Government Side - SDLC (PULSO_Government_SDLC.pdf)
"""

import os
import re
import subprocess
import markdown

WORKSPACE_DIR = r"c:\Users\Val\Desktop\PULSO"
SPECS_DIR = os.path.join(WORKSPACE_DIR, "docs", "focused_specs")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "docs", "focused_pdf_exports")
os.makedirs(OUTPUT_DIR, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

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
    line-height: 1.6;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
}

/* Document Header & Cover */
.doc-cover {
    page-break-after: always;
    padding: 30px 10px 10px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 88vh;
    border-bottom: 2px solid #e2e8f0;
}

.cover-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
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
    font-size: 15pt;
    font-weight: 800;
    letter-spacing: 2px;
    color: #0f172a;
    text-transform: uppercase;
}

.brand-sub {
    font-size: 8pt;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.cover-main {
    margin: 30px 0;
}

.cover-badge {
    display: inline-block;
    padding: 5px 14px;
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #ffedd5;
    border-radius: 20px;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 16px;
}

.cover-title {
    font-size: 24pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;
    margin: 0 0 16px 0;
    letter-spacing: -0.5px;
}

.cover-subtitle {
    font-size: 11.5pt;
    font-weight: 400;
    color: #475569;
    line-height: 1.6;
    max-width: 650px;
    margin-bottom: 24px;
}

.meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-top: 20px;
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
    font-size: 9pt;
    font-weight: 600;
    color: #0f172a;
}

.cover-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #64748b;
}

/* Headings */
h1 {
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 28px;
    margin-bottom: 12px;
    letter-spacing: -0.3px;
    page-break-after: avoid;
    break-after: avoid;
}

h2 {
    font-size: 12.5pt;
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
    color: #0f172a;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
    break-after: avoid;
}

h4 {
    font-size: 9.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
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

/* Blockquotes / Callouts */
blockquote {
    margin: 14px 0;
    padding: 10px 16px;
    background-color: #f8fafc;
    border-left: 4px solid #f97316;
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

hr {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 20px 0;
}

/* Scenario Highlighting */
strong {
    color: #0f172a;
}
"""

def extract_meta_table(md_text):
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

def build_cover_html(title, subtitle, meta_dict, doc_badge):
    meta_items_html = ""
    for k, v in meta_dict.items():
        meta_items_html += f"""
        <div class="meta-item">
            <span class="meta-label">{k}</span>
            <span class="meta-value">{v}</span>
        </div>
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
            <span>OFFICIAL PRODUCT & ENGINEERING SPECIFICATION</span>
        </div>
    </div>
    """

def convert_md_to_html(md_path, custom_title, custom_sub, badge_text):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    meta = extract_meta_table(content)

    # Remove the top metadata table from rendered body
    body_md = re.sub(r'\| Field \| Value \|[\s\S]*?\n\n', '', content)
    body_md = re.sub(r'^# .*\n', '', body_md.lstrip())

    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'toc', 'nl2br', 'sane_lists'])
    body_html = md.convert(body_md)

    cover_html = build_cover_html(custom_title, custom_sub, meta, badge_text)

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{custom_title}</title>
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
    return full_html

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

def generate_all_focused_docs():
    docs_to_generate = [
        {
            "md": os.path.join(SPECS_DIR, "01_resident_user_stories.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Resident_User_Stories.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Resident_User_Stories.pdf"),
            "title": "Resident Portal & Mobile App: User Stories Specification",
            "sub": "Exhaustive citizen user stories, PhilSys verification flows, multimodal reporting mechanics, real-time lifecycle tracking, and bilingual acceptance criteria.",
            "badge": "RESIDENT USER STORIES SPECIFICATION"
        },
        {
            "md": os.path.join(SPECS_DIR, "02_resident_sdlc.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Resident_SDLC.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Resident_SDLC.pdf"),
            "title": "Resident Portal & Mobile App: SDLC Specification",
            "sub": "Agile dual-track engineering methodology, 7-phase lifecycle framework, Flutter & React branching strategy, DoR/DoD governance, and App Store release protocols.",
            "badge": "RESIDENT SDLC SPECIFICATION"
        },
        {
            "md": os.path.join(SPECS_DIR, "03_government_user_stories.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Government_User_Stories.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Government_User_Stories.pdf"),
            "title": "Government Command Center: User Stories Specification",
            "sub": "Operational user stories across confirmed Caloocan City Engineering Plantilla positions, incident dispatch, 13-stage project lifecycle, BoQ/RA 9184 procurement, and OBO inspection tracks.",
            "badge": "GOVERNMENT USER STORIES SPECIFICATION"
        },
        {
            "md": os.path.join(SPECS_DIR, "04_government_sdlc.md"),
            "html": os.path.join(OUTPUT_DIR, "PULSO_Government_SDLC.html"),
            "pdf": os.path.join(OUTPUT_DIR, "PULSO_Government_SDLC.pdf"),
            "title": "Government Command Center: SDLC Specification",
            "sub": "Enterprise Stage-Gate delivery governance, statutory alignment (RA 9184 & RA 10173), canonical state machines, staging UAT sign-off, and Gov-Cloud deployment protocols.",
            "badge": "GOVERNMENT SDLC SPECIFICATION"
        }
    ]

    for item in docs_to_generate:
        print(f"Converting & Rendering: {item['title']}...")
        html_content = convert_md_to_html(item["md"], item["title"], item["sub"], item["badge"])
        with open(item["html"], 'w', encoding='utf-8') as f:
            f.write(html_content)
        render_html_to_pdf(item["html"], item["pdf"])

if __name__ == "__main__":
    generate_all_focused_docs()
    print("\nAll 4 focused specifications have been generated in:", OUTPUT_DIR)
