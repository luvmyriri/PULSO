from pathlib import Path
import re, html, json
from test_inputs import INPUTS
from figures import add_figures
import pypdfium2 as pdfium
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black, HexColor

ROOT=Path('C:/Users/Val/Desktop/PULSO'); TMP=ROOT/'tmp/pulso-submission'; OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
REF=Path('C:/Users/Val/Downloads/TricyS_Elective_UserStorys.pdf')
for name,file in [('Arial','arial.ttf'),('ArialB','arialbd.ttf'),('ArialI','ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialB',italic='ArialI',boldItalic='ArialB')
ref=pdfium.PdfDocument(str(REF)); im=ref[0].render(scale=3).to_pil(); im.crop((180,165,1632,291)).save(TMP/'header.png')
def clean(t):
    t=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',t)
    return t.replace('**','').replace('`','').replace('→',' to ').replace('–','-').replace('—','-').replace('×',' x ').replace('“','"').replace('”','"').replace('’',"'")
def esc(t): return html.escape(clean(t))
styles={
'body':ParagraphStyle('body',fontName='Arial',fontSize=11,leading=20,alignment=TA_JUSTIFY,firstLineIndent=36,spaceAfter=10),
'head':ParagraphStyle('head',fontName='ArialB',fontSize=11,leading=16,spaceBefore=8,spaceAfter=10,keepWithNext=True),
'small':ParagraphStyle('small',fontName='ArialI',fontSize=9,leading=12,spaceAfter=9),
'meta':ParagraphStyle('meta',fontName='ArialI',fontSize=9,leading=12,spaceAfter=9,keepWithNext=True),
'cell':ParagraphStyle('cell',fontName='Arial',fontSize=10,leading=13,spaceAfter=0),
'boldcell':ParagraphStyle('boldcell',fontName='ArialB',fontSize=10,leading=13),
'tabletitle':ParagraphStyle('tabletitle',fontName='ArialB',fontSize=10,leading=13,alignment=TA_CENTER),
'cap':ParagraphStyle('cap',fontName='Arial',fontSize=10,leading=14,alignment=TA_CENTER,spaceAfter=12),
'ac':ParagraphStyle('ac',fontName='Arial',fontSize=11,leading=19,leftIndent=20,firstLineIndent=-12,spaceAfter=10),
}
def P(t,s='body'):return Paragraph(esc(t),styles[s])

# Scenarios and fixtures are synthetic test specifications, never execution results.
META={
'RES-US-001':('A first-time visitor opens the public home page, reads the service-area and privacy information, selects Filipino, and follows Track a report. The visitor checks the emergency guidance before choosing the appropriate service.', 'Public visitor; English and Filipino; first visit; unavailable app download', 'Home / service scope|Choose language|Report or track|Correct service'),
'RES-US-002':('An applicant selects a supported identity document, reviews the purpose notice, and uploads readable images. The applicant checks extracted details before continuing. When the image is unreadable or the camera is unavailable, the applicant uses file upload or requests manual review.', 'Synthetic identity images: readable, blurred, wrong jurisdiction; camera denied; OCR timeout', 'Explain data use|Submit evidence|Review extraction|Continue or review'),
'RES-US-003':('An applicant reviews identity and contact details and submits registration. The server saves one consistent account. If the response or verification email is delayed, the applicant resumes the existing account rather than creating another registration.', 'Synthetic applicant; resident.test@example.com; normalized barangay fixture; repeated operation ID', 'Review details|Validate fields|Create one account|Verify contact'),
'RES-US-004':('An unverified resident requests a verification code, pastes it into the verification form, and submits it before its configured expiry. The server activates the account once. A delayed or expired code leads to a controlled resend on the same account.', 'Unverified resident; valid, expired and superseded codes; resend at cooldown boundary', 'Request code|Enter code|Validate once|Permit sign-in'),
'RES-US-005':('A resident signs in and returns to the intended report page. The server checks current account status on protected requests. After logout or suspension, an earlier session cannot retrieve the same resident data.', 'Active, unverified and suspended resident fixtures; expired and revoked sessions', 'Enter credentials|Check account|Open own workspace|Recheck requests'),
'RES-US-006':('A resident selects password recovery, enters an identifier, verifies a recovery code, and sets a new password. The resident receives confirmation and signs in again. Expired codes or mail failure provide recovery without exposing whether another account exists.', 'Registered and unknown email; valid, wrong and expired recovery code; prior active session', 'Identify account|Verify recovery|Set password|Sign in again'),
'RES-US-007':('A resident reviews their own profile and changes a contact detail after any required recent authentication. An email change requires re-verification. A deliberately altered record identifier cannot update another resident or an official with the same numeric identifier.', 'Resident ID 42; official ID 42 in a separate namespace; new email; wrong current password', 'Open own profile|Authenticate change|Validate ownership|Save and audit'),
'RES-US-008':('A resident reviews the purpose and consequences of an optional verification upgrade. The resident may decline or submit evidence. An uncertain identity match is sent for correction or human review rather than silently reducing access to basic reporting.', 'Basic resident account; optional upgrade; mismatched OCR; declined consent', 'Explain upgrade|Choose or decline|Review evidence|Record outcome'),
'RES-US-009':('A resident photographs an infrastructure issue from a safe position and uploads the evidence. The server validates the actual file content. If the connection is interrupted, the resident resumes the draft and retries the upload without making the evidence public.', 'Synthetic road photo; disguised executable; oversized image; cancelled upload; offline draft', 'Explain safety|Capture or upload|Validate evidence|Retain safe draft'),
'RES-US-010':('A resident permits location capture, checks the reported accuracy, and confirms the issue location with a landmark description. When GPS or the address provider fails, the resident enters a location manually for staff review.', 'Approved boundary fixture; inside, outside and unknown points; GPS denied; provider timeout', 'Explain location|Locate or describe|Confirm position|Check jurisdiction'),
'RES-US-011':('A resident reviews an AI category suggestion and a possible related report. The resident corrects the category or requests staff review. If a duplicate is confirmed, the response provides a privacy-safe canonical ticket and preserves contributed evidence.', 'Road-image fixture; low-confidence suggestion; canonical ticket TEST-1001; AI outage', 'Review suggestion|Check related case|Correct or request review|Retain case link'),
'RES-US-012':('A resident reviews evidence, description, category and location, then submits the report. The connection drops after the server commits. The application reconciles the original operation and displays its durable ticket rather than creating a second report.', 'Complete report draft; operation ID submit-test-01; dropped response after commit', 'Review report|Submit operation|Commit once|Return durable ticket'),
'RES-US-013':('A resident opens My reports and reads the latest status and public history of an owned case. The resident compares a nearby public issue whose personal details are withheld. A failed refresh leaves the previous data marked stale instead of showing a false empty list.', 'Owned TEST-1001; other resident TEST-1002; restricted evidence; failed refresh', 'Open report list|Authorize case|Read latest history|Show next action'),
'RES-US-014':('A resident requests retraction of an eligible report and reviews the consequence before confirming. If a dispatcher assigns work at the same time, the server returns the latest state and does not erase the report or its history.', 'Eligible report; concurrently assigned version; repeated retraction operation', 'Check eligibility|Explain consequence|Confirm request|Commit or conflict'),
'RES-US-015':('A resident opens the completion evidence for an owned resolved report and submits a rating and comment. A repeated submission returns the existing response. If the resident says the issue remains, a governed follow-up is recorded.', 'Owned resolved case; rating 1, 5, 0 and 6; repeated response; Issue remains', 'Read completion proof|Confirm ownership|Submit response|Record follow-up'),
'RES-US-016':('A resident opens a case notification and follows its destination. Marking the notification as read persists across sessions. If dismissal fails, the notification is restored and the error explains the next action.', 'Unread case notification; advisory notification; dismissed item; failed update', 'Receive update|Open destination|Change read state|Persist or recover'),
'RES-US-017':('A resident asks for help completing a report. The assistant provides procedural guidance without receiving unnecessary personal information or changing the report. A provider failure falls back to local help and a human-support route.', 'Procedural query; unnecessary identity fields; AI timeout; attempted mutation request', 'Ask for help|Minimize context|Explain guidance|Local help or support'),
'RES-US-018':('A resident completes registration, reporting and tracking in Filipino using a narrow screen and keyboard or assistive technology. The resident changes theme and resumes a draft after losing connectivity without losing task meaning or saved input.', '320 CSS px; 200% zoom; keyboard and screen reader; Filipino; dark theme; offline', 'Choose preferences|Complete critical task|Handle interruption|Resume consistently'),
'GOV-US-001':('An active official signs in and opens an authorized case. The server checks capability, jurisdiction and assignment. Editing client-side role values or substituting a resident token cannot grant access to the case.', 'Active official; resident token; expired delegation; edited local role; out-of-scope record', 'Authenticate official|Load capabilities|Check record scope|Permit or deny'),
'GOV-US-002':('A staff member filters the work queue and opens a selected case. After reviewing the case and returning, the same scope and filters remain. A failed refresh is distinguished from a genuine queue with no matching work.', 'Filtered queue; multiple pages; selected TEST-WO-01; empty result; server error', 'Load scoped queue|Filter work|Open selected record|Return with context'),
'GOV-US-003':('A dispatcher opens a resident report, inspects evidence and location, and reviews the AI suggestion. The dispatcher records a classification or a reasoned alternative decision. A concurrent decision by another dispatcher produces a conflict for the stale version.', 'Resident report; related case; two dispatchers using one version; structured reason', 'Inspect evidence|Review classification|Record decision|Route and audit'),
'GOV-US-004':('An approver reviews an estimate and a dispatcher selects an eligible team and schedule. Confirmation identifies the work and its consequences. The server checks authority and eligibility before committing assignment and notification.', 'Approved estimate version; positive amount; invalid date; inactive assignee; authority limit', 'Review prerequisites|Select eligible team|Confirm dispatch|Record next owner'),
'GOV-US-005':('A dispatcher creates and assigns a work order. Assigned field staff record progress and upload completion proof. The authorized completion decision synchronizes the linked report and history; an alternate update route cannot bypass proof requirements.', 'Open and assigned work order; assigned worker; missing proof; repeated completion operation', 'Create work order|Assign and execute|Validate proof|Approve completion'),
'GOV-US-006':('An assigned field worker reads the work details on a phone, records a safety blocker or progress update, and attaches evidence. Offline updates remain visibly queued and reconcile against the current server version when connectivity returns.', 'Assigned worker; unassigned worker; offline update ID; safety blocker; GPS accuracy', 'Open assignment|Perform safe work|Queue field evidence|Reconcile update'),
'GOV-US-007':('A project team submits the required deliverables for its current phase and requests the next authorized transition. The server checks sign-offs and prerequisites. Missing documents prevent advancement and remain visible to the team.', 'Current project phase; missing deliverable; valid next state; skipped phase; repeated certificate request', 'Review current phase|Supply deliverables|Check sign-offs|Advance valid state'),
'GOV-US-008':('An estimator prepares quantities and costs, finance records authorized funding, and procurement staff record approved milestones. The server checks each prerequisite before an NTP decision. Invalid ownership or an unissued NTP cannot advance the project.', 'BoQ quantity and unit cost; foreign item ID; unique ObR; missing funding; ntp_issued=false', 'Validate estimate|Certify funding|Complete procurement gates|Authorize NTP'),
'GOV-US-009':('An assigned inspector records a technical result and supporting evidence. Failed findings lead to notice and reinspection under the approved procedure. Clearance remains blocked until all required reviews and payment conditions are satisfied.', 'Assigned inspector; failed review; missing required review; unpaid state; appeal evidence', 'Inspect and record|Review findings|Resolve deficiencies|Authorize clearance'),
'GOV-US-010':('A records officer classifies a document and checks access to its parent record before storing it. A legal hold is placed on the record. A later disposition request is rejected while the hold is active and the history remains intact.', 'Restricted document; unauthorized parent; unsafe file; legal hold; disposition request', 'Check record access|Validate and classify|Apply retention or hold|Govern retrieval'),
'GOV-US-011':('An auditor filters the event ledger for a case and reconstructs its previous and current states. Public history excludes internal notes. An attempted business-level deletion cannot remove the audit evidence.', 'Case history; prior state; internal note; concurrent event; attempted audit deletion', 'Filter event ledger|Read actor and changes|Compare public history|Export scoped evidence'),
'GOV-US-012':('An official prepares a bilingual advisory with its area, source and effective period. An authorized reviewer approves publication. A later correction preserves earlier versions and an expired notice is no longer shown as current.', 'Draft advisory; English and Filipino text; expiry boundary; AI draft; correction', 'Draft advisory|Review content|Approve publication|Correct or retire'),
'GOV-US-013':('An authorized planner selects an area and reporting period, reviews metric definitions and source records, and requests a permitted export. The export masks restricted information and neutralizes spreadsheet formula inputs.', 'Scoped metrics; missing data; restricted coordinates; CSV value beginning with equals sign', 'Choose analysis scope|Review definitions|Inspect source records|Export permitted data'),
'GOV-US-014':('An engineer reviews asset history and a maintenance forecast with its model version and uncertainty. Repeating the same approved inputs produces the same output. A proposed work order remains subject to human approval and the canonical creation process.', 'Fixed asset dataset and model version; repeat run; model outage; proposed work conversion', 'Inspect asset evidence|Evaluate prediction|Review uncertainty|Approve work proposal'),
'GOV-US-015':('An administrator reviews the before-and-after access impact of an account change and provides a reason. Suspension revokes existing sessions. A request that removes the last administrator or grants an unknown role is rejected.', 'Active official session; unknown role; last administrator; self-suspension; changed jurisdiction', 'Inspect current access|Propose change|Confirm consequence|Apply and revoke'),
'GOV-US-016':('A records user searches a departmental view and opens the canonical closed case. Filters and counts use the same source. An export checks current permission and records its purpose, while a retrieval error remains visibly distinct from no records.', 'Closed case; source view filter; pagination boundary; revoked export permission; server error', 'Search canonical records|Apply scope and filters|Open historical case|Export with authority'),
'GOV-US-017':('A staff member reviews a queue, opens a case, and confirms an authorized decision using a keyboard at increased zoom. Focus returns to the correct context. Switching theme or moving to a field device preserves status meaning and critical controls.', '1280 x 720 screen; 200% zoom; narrow device; keyboard; dark theme; confirmation cancel', 'Open accessible queue|Review case details|Confirm decision|Restore task context'),
}

groups=[('Identity, Access, and Security Foundations',['RES-US-002','RES-US-003','RES-US-004','RES-US-005','RES-US-006','RES-US-007','RES-US-008','GOV-US-001']),('Resident Service, Evidence, and Report Submission',['RES-US-001','RES-US-009','RES-US-010','RES-US-011','RES-US-012','RES-US-017']),('Report Tracking, Resident Feedback, and Public Updates',['RES-US-013','RES-US-014','RES-US-015','RES-US-016','GOV-US-012']),('Government Triage, Dispatch, and Field Operations',['GOV-US-002','GOV-US-003','GOV-US-004','GOV-US-005','GOV-US-006']),('Engineering Projects, Procurement, and Inspection',['GOV-US-007','GOV-US-008','GOV-US-009']),('Records, Accountability, Analytics, and Administration',['GOV-US-010','GOV-US-011','GOV-US-013','GOV-US-014','GOV-US-015','GOV-US-016']),('Accessibility, Localization, and Cross Device Quality',['RES-US-018','GOV-US-017'])]
catalog={}
for fn in ['12-resident-user-stories-and-sdlc.md','13-government-user-stories-and-sdlc.md']:
    text=(ROOT/'docs/ui-ux-audit'/fn).read_text(encoding='utf8')
    for match in re.finditer(r'^### ((?:RES|GOV)-US-\d+) [—-] ([^\n]+)\n(.*?)(?=^### |^## |\Z)',text,re.M|re.S):
        id,title,block=match.groups(); story=block.split('Acceptance criteria:')[0].strip()
        criteria=[clean(x) for x in re.findall(r'^- (.+)',block,re.M)]
        catalog[id]={'title':title,'story':clean(story),'criteria':criteria,'source':fn}

class Workflow(Flowable):
    def __init__(self,labels): Flowable.__init__(self); self.labels=labels.split('|'); self.width=440; self.height=112
    def draw(self):
        c=self.canv
        for i,label in enumerate(self.labels):
            x=i*112; c.setLineWidth(.8); c.rect(x,45,102,53)
            p=P(label,'cell'); w,h=p.wrap(86,45); p.drawOn(c,x+8,71-h/2)
            if i<3:
                c.line(x+102,71,x+111,71); c.line(x+108,74,x+111,71); c.line(x+108,68,x+111,71)
        p=P('At a failed gate, retain safe context and show a permitted retry, correction, or human-review action.','small'); p.wrap(438,30); p.drawOn(c,0,5)

def header(c,doc):
    c.saveState(); c.setStrokeColor(HexColor('#00B050')); c.setLineWidth(.65)
    for x in [60,544]: c.line(x,0,x,792)
    for y in [738,694,54]: c.line(0,y,612,y)
    c.drawImage(str(TMP/'header.png'),60,695,width=484,height=42,mask='auto')
    c.setFillColor(black); c.setFont('Arial',8); c.drawCentredString(302,39,str(doc.page)); c.restoreState()

def testdata(criterion, fixture):
    c=criterion.lower()
    rules=[
    (['otp','code','cooldown'],'Valid, expired and replayed code; resend immediately before and at the configured cooldown; attempt count at its approved limit.'),
    (['numeric','collision','namespace'],'Resident and official fixtures share numeric ID 42; request uses the resident subject against the official record.'),
    (['idempot','repeated','replay','transaction','atomically','atomic'],'Repeat one operation ID; drop the first response after commit; inspect entity, event and notification records.'),
    (['concurrent','racing','409','version changed'],'Two authorized sessions submit different updates against the same original record version.'),
    (['320','zoom','keyboard','screen-reader','wcag'],'Keyboard-only and screen-reader run at 320 CSS px and 200% zoom; check focus, names, errors and completion.'),
    (['filipino','language'],'Complete the same journey in English and Filipino; navigate, reload and compare actions, errors and document language.'),
    (['theme','light/dark','contrast'],'Repeat in light and dark themes, forced colors and reduced motion; compare evidence, status, focus and controls.'),
    (['upload','file','image','malware','filename','magic bytes'],'Valid synthetic file; wrong file signature; disallowed type; size beyond configured limit; interrupted upload.'),
    (['legal hold','retention','deletion','delete','tombstone'],'Record under active legal hold; retention-eligible record; unauthorized disposition request; audit history snapshot.'),
    (['permission','capabilit','authorized','access','ownership','owner check','protected','roles','role '],'Authorized and unauthorized accounts; in-scope and out-of-scope records; revoked session; direct request bypassing the UI.'),
    (['empty','stale','offline','failed','failure','timeout','outage','quota'],'Successful empty response, filtered empty response, cached stale data, network timeout and provider failure.'),
    (['budget','boq','quantity','monetary','funding','cost','ntp','obr'],'Valid estimate; zero or negative amount; wrong parent item; missing certification; false NTP flag; repeated reference.'),
    (['state','transition','phase','prerequisite','status'],'Eligible source state and required evidence; ineligible source state; missing prerequisite; repeat transition.'),
    (['export','csv','pagination','count'],'Multiple result pages; filtered source count; restricted fields; formula-like cell value; permission removed before export.'),
    (['privacy','personal','public','identity','sensitive','secret'],'Owner, authorized staff and public views of the same synthetic case; restricted identity and internal-note fields.'),
    (['ai','model','prediction','confidence','ocr'],'Fixed synthetic input and model version; low-confidence result; malformed result; provider unavailable.'),
    (['location','gps','boundary','jurisdiction'],'Approved inside/outside boundary fixtures; unknown accuracy; denied GPS; manual landmark; provider unavailable.'),
    (['audit','timeline','previous_status'],'Record with a known prior state; authorized mutation; public and internal events; attempted event modification.'),
    ]
    for keys,result in rules:
        if any(k in c for k in keys):return result
    return fixture+'. Exercise the stated condition and compare the saved result with the displayed result.'

def table(n,criterion,fixture,id):
    short=criterion
    given=re.search(r'Given (.*?)(?:,? when |,? then )',criterion,re.I)
    if given: short='Exercise '+given.group(1).rstrip(',')+'.'
    elif len(short)>145: short='Verify criterion '+str(n)+' using the stated fixture and its boundary or failure condition.'
    rows=[[P('Test Script','tabletitle'),'',''],[P('Acceptance Criteria '+str(n),'boldcell'),'',''],[P(x,'boldcell') for x in ['High Level Requirement','Test Data','Expected Scenario']],[P(short,'cell'),P(INPUTS[id][n-1],'cell'),P(criterion,'cell')]]
    t=Table(rows,colWidths=[137,140,163],hAlign='LEFT')
    t.setStyle(TableStyle([('SPAN',(0,0),(-1,0)),('SPAN',(0,1),(-1,1)),('GRID',(0,0),(-1,-1),1.2,black),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return KeepTogether([t,Spacer(1,15)])

flow=[]
def center(t,size=12,bold=False,after=12):
    st=ParagraphStyle('cover',fontName='ArialB' if bold else 'Arial',fontSize=size,leading=size*1.4,alignment=TA_CENTER,spaceAfter=after)
    flow.append(Paragraph(esc(t),st))
flow.append(Spacer(1,26));center('Capstone Project Agile Testing Concept Document',14,True,16);center('PULSO',14,True,8);center('City Engineering Department Management System',11,False,32)
center('A Compilation',12);center('Presented to Computer Studies',12);center('Department In Compliance to IS Elective 3',12,False,44)
center('Submitted by:',12,True); 
for name in ['Lamsen, Val Javez M.','Garcia, Marc Justine M.','Evangelista, Marc Alexis N.','Tabios, Gene G.']:center(name,12)
center('Bachelor of Science in Information Systems 4A',10,False,28)
center('Submitted to:',12,True);center('Professor Dominador Solayao Jr.',11,False,22);center('September 2026',12)
flow.append(PageBreak())
record=[]
number_map={id:f'{sprint}.{number}' for sprint,(_,ids) in enumerate(groups,1) for number,id in enumerate(ids,1)}
for sprint,(title,ids) in enumerate(groups,1):
    for number,id in enumerate(ids,1):
        s=catalog[id]; scenario,fixture,labels=META[id]; sid=f'{sprint}.{number}'
        if number==1:
            if sprint>1:flow.append(PageBreak())
            flow.append(P(f'Sprint {sprint}: {title}','head'))
        flow.append(P(f'{sid} {s["title"]}','head'))
        flow.append(P(f'{id} | Proposed acceptance specification | Test data are synthetic; tests are not execution results.','meta'))
        if sprint==1 and number==1:
            flow.append(P('Scope: PULSO connects resident reporting with government triage, field work, engineering, records and planning. Product commitments follow PRODUCT.md. Detailed workflows, lifecycle labels and role mappings remain proposed for product and LGU approval. Sprint groupings organize this submission; they do not claim completed development.','small'))
        flow.append(P('User Story','head'));flow.append(P(s['story']))
        flow.append(P('High-Level Requirement','head'))
        req='The system shall support this user outcome through the controls below. '+ ' '.join(s['criteria'][:2])
        req+=' The server remains authoritative for protected data, saved state and permitted actions. Success must identify the committed result; an unavailable service or an uncertain response must provide a truthful recovery path.'
        flow.append(P(req))
        flow.append(P('High-Level Scenario','head'));flow.append(P(scenario))
        figure_count=add_figures(flow,id,sid,s['title'],P,styles,number_map)
        for n,crit in enumerate(s['criteria'],1):
            flow.append(P('Acceptance Criteria '+str(n),'head'));flow.append(P('• '+crit,'ac'))
        assert len(INPUTS[id])==len(s['criteria']),id
        for n,crit in enumerate(s['criteria'],1):flow.append(table(n,crit,fixture,id))
        flow.append(P('Specification source: '+s['source']+'; '+id+'. Detailed policy values and lifecycle decisions require approval by the product owner and the responsible LGU process owner before execution.','small'))
        flow.append(Spacer(1,18)); record.append({'number':sid,'id':id,'criteria':len(s['criteria']),'figures':figure_count})
path=OUT/'PULSO_Project_User_Stories_Submission.pdf'
doc=SimpleDocTemplate(str(path),pagesize=(612,792),rightMargin=85.7,leftMargin=85.7,topMargin=111,bottomMargin=68,title='PULSO Capstone Project Agile Testing Concept Document',author='PULSO Project Team')
doc.build(flow,onFirstPage=header,onLaterPages=header)
(TMP/'coverage.json').write_text(json.dumps(record,indent=2))
print(path); print('Stories',len(record),'Criteria and test tables',sum(x['criteria'] for x in record))

