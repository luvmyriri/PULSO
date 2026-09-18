from pathlib import Path
import html, json, math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import Paragraph, Flowable, Image, KeepTogether, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdfium2 as pdfium
from PIL import Image as PILImage
from flow_specs import DATA, ACTORS

ROOT=Path('C:/Users/Val/Desktop/PULSO')
ASSETS=ROOT/'output/pdf/PULSO_Submission_Figures'
ASSETS.mkdir(parents=True,exist_ok=True)
for name,f in [('Arial','arial.ttf'),('ArialB','arialbd.ttf'),('ArialI','ariali.ttf')]:
    if name not in pdfmetrics.getRegisteredFontNames():pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+f))

def text(c,t,x,top,w,h,size=9.2,bold=False,center=True):
    st=ParagraphStyle('d',fontName='ArialB' if bold else 'Arial',fontSize=size,leading=size*1.14,alignment=TA_CENTER if center else 0)
    p=Paragraph(html.escape(t),st); pw,ph=p.wrap(w,h)
    if ph>h+1:raise ValueError(f'Diagram text does not fit: {t} {ph}>{h}')
    c.setFillColor(black);p.drawOn(c,x,540-top-(h+ph)/2)

def rect(c,cx,cy,w,h,label,kind='process'):
    x=cx-w/2; y=540-cy-h/2
    c.setStrokeColor(HexColor('#253A45'));c.setLineWidth(.8)
    c.setFillColor(HexColor('#F2F4F4') if kind=='recovery' else white)
    if kind=='end':c.roundRect(x,y,w,h,12,fill=1,stroke=1)
    elif kind=='input':
        p=c.beginPath();p.moveTo(x+9,y+h);p.lineTo(x+w,y+h);p.lineTo(x+w-9,y);p.lineTo(x,y);p.close();c.drawPath(p,fill=1,stroke=1)
    elif kind=='decision':
        p=c.beginPath();p.moveTo(cx,540-cy+h/2);p.lineTo(cx+w/2,540-cy);p.lineTo(cx,540-cy-h/2);p.lineTo(cx-w/2,540-cy);p.close();c.drawPath(p,fill=1,stroke=1)
    elif kind=='data':
        c.rect(x,y+7,w,h-14,fill=1,stroke=0);c.line(x,y+7,x,y+h-7);c.line(x+w,y+7,x+w,y+h-7)
        c.ellipse(x,y,w+x,y+14,fill=1,stroke=1);c.rect(x+.5,y+7,w-1,h-14,fill=1,stroke=0);c.ellipse(x,y+h-14,x+w,y+h,fill=1,stroke=1)
    else:c.roundRect(x,y,w,h,3,fill=1,stroke=1)
    inner=w-16 if kind!='decision' else w*.70
    innerh=h-12 if kind!='decision' else h*.68
    text(c,label,cx-inner/2,cy-innerh/2,inner,innerh,size=9 if kind!='end' else 9.3,bold=kind=='decision')

def arrow(c,points,label='',lx=None,ly=None,dashed=False):
    c.saveState();c.setLineWidth(.8);c.setStrokeColor(HexColor('#253A45'));c.setFillColor(HexColor('#253A45'))
    if dashed:c.setDash(3,2)
    for (x1,y1),(x2,y2) in zip(points,points[1:]):c.line(x1,540-y1,x2,540-y2)
    c.setDash(); x,y=points[-1];xp,yp=points[-2];a=math.atan2(y-yp,x-xp);size=4
    p=c.beginPath();p.moveTo(x,540-y)
    for b in [a+2.6,a-2.6]:p.lineTo(x+size*math.cos(b),540-y-size*math.sin(b))
    p.close();c.drawPath(p,fill=1,stroke=0)
    if label:
        c.setFont('ArialB',7.5); tw=pdfmetrics.stringWidth(label,'ArialB',7.5);c.setFillColor(white);c.rect(lx-2,540-ly-2,tw+4,10,fill=1,stroke=0);c.setFillColor(black);c.drawString(lx,540-ly,label)
    c.restoreState()

def generate_flow(id):
    fields=DATA[id].split('|');assert len(fields)==10,id
    request,validation,d1,f1,process,d2,f2,result,record,mode=fields
    dst=ASSETS/f'{id}_process_flow.pdf';c=canvas.Canvas(str(dst),pagesize=(440,540))
    c.setTitle(f'PULSO {id} proposed process flow')
    c.setFillColor(white);c.rect(0,0,440,540,fill=1,stroke=0)
    c.setStrokeColor(HexColor('#CAD2D6'));c.setLineWidth(.5)
    for x in [134,302]:c.line(x,27,x,516)
    text(c,ACTORS[id],3,2,128,25,8.8,True)
    text(c,'PULSO workflow and gates',138,2,160,25,8.8,True)
    text(c,'Recovery / alternate path',305,2,131,25,8.4,True)
    c.line(2,513,438,513)
    rect(c,65,52,112,29,'Start','end')
    rect(c,65,115,124,72,request,'input')
    rect(c,218,115,148,72,validation)
    rect(c,218,213,152,86,d1,'decision')
    rect(c,369,213,126,78,f1,'recovery')
    rect(c,218,310,148,72,process)
    rect(c,218,405,152,86,d2,'decision')
    rect(c,369,405,126,84,f2,'recovery')
    rect(c,218,493,148,60,result,'end')
    arrow(c,[(65,66.5),(65,79)])
    arrow(c,[(127,115),(144,115)])
    arrow(c,[(218,151),(218,170)])
    arrow(c,[(294,213),(306,213)],'No',294,205)
    arrow(c,[(218,256),(218,274)],'Yes',222,268)
    arrow(c,[(218,346),(218,362)])
    arrow(c,[(294,405),(306,405)],'No',294,397)
    arrow(c,[(218,448),(218,463)],'Yes',222,459)
    if mode=='read':
        rect(c,65,310,120,72,record,'data');arrow(c,[(125,310),(144,310)],'read',125,300,True)
    else:
        rect(c,65,493,120,60,record,'data');arrow(c,[(144,493),(125,493)],'save',126,484,True)
    c.setFont('ArialI',7.2);c.setFillColor(HexColor('#40515B'));c.drawString(5,3,'Proposed contract. Recovery pauses this attempt; retry rechecks authorization and prerequisites.')
    c.showPage();c.save()
    d=pdfium.PdfDocument(str(dst));d[0].render(scale=3).to_pil().save(ASSETS/f'{id}_process_flow.png');d.close()
    return ASSETS/f'{id}_process_flow.png'

def generate_fulfillment():
    dst=ASSETS/'PULSO_fulfillment_branches.pdf';c=canvas.Canvas(str(dst),pagesize=(440,540));c.setFillColor(white);c.rect(0,0,440,540,fill=1,stroke=0)
    text(c,'PULSO report fulfillment and resident closeout',5,4,430,22,11,True)
    rect(c,220,63,212,48,'Resident report received with durable ticket','end')
    rect(c,220,133,212,48,'Dispatcher triages evidence and confirms jurisdiction')
    rect(c,220,216,176,92,'Which authorized fulfillment branch?','decision')
    for x,label in [(70,'Work order'),(220,'Project / procurement'),(370,'OBO inspection')]:
        rect(c,x,323,128,80,{'Work order':'Assign eligible crew; execute repair; submit completion proof','Project / procurement':'Survey and design; BoQ and funding; BAC / NTP; field quality review','OBO inspection':'Assigned technical reviews; notice / appeal / reinspection; clearance gates'}[label])
        text(c,label,x-68,263,136,26,9,True)
    rect(c,220,416,238,49,'Authorized reviewer validates branch-specific completion evidence')
    rect(c,220,490,238,51,'Resident sees resolved proof and confirms or requests governed follow-up','end')
    arrow(c,[(220,87),(220,109)])
    arrow(c,[(220,157),(220,170)])
    arrow(c,[(132,216),(70,216),(70,283)])
    arrow(c,[(220,262),(220,283)])
    arrow(c,[(308,216),(370,216),(370,283)])
    arrow(c,[(70,363),(70,378),(220,378),(220,391.5)])
    arrow(c,[(220,363),(220,391.5)])
    arrow(c,[(370,363),(370,378),(220,378),(220,391.5)])
    arrow(c,[(220,440.5),(220,464.5)])
    # Keep branch labels legible where their vertical connectors pass.
    for x,label in [(70,'Work order'),(220,'Project / procurement'),(370,'OBO inspection')]:
        c.setFillColor(white);c.rect(x-69,540-281,138,19,fill=1,stroke=0)
        text(c,label,x-68,263,136,17,9,True)
    c.setFont('ArialI',7.5);c.drawString(5,5,'Proposed branch contract: each decision preserves case history, authorization and notification records.')
    c.showPage();c.save();d=pdfium.PdfDocument(str(dst));d[0].render(scale=3).to_pil().save(ASSETS/'PULSO_fulfillment_branches.png');d.close()

G='docs/ui-ux-audit/runtime-government-2026-08-28/'
R='docs/ui-ux-audit/runtime-resident-2026-08-29/'
L='docs/ui-ux-audit/runtime-resident-lift-2026-08-30/'
N='docs/ui-ux-audit/'
# Source files are embedded unchanged. Optional crops are document viewports, not retouched UI.
UI = {
'RES-US-001':[(R+'01-public-home.png','Public service entry screen','Register Now and View Portal Guide are visible. The observed entry choices do not yet match all target reporting/tracking requirements.')],
'RES-US-002':[(R+'03-resident-registration.png','Identity verification component','Front/back file inputs, camera choices, agreement checkbox and Scan Document control. This captures the first registration stage only.')],
'RES-US-005':[(R+'05-resident-login.png','Resident sign-in form','Email, password, CAPTCHA and recovery link. Local test configuration was used; the capture does not establish production authentication security.')],
'RES-US-007':[(R+'15-resident-profile.png','Resident profile component','Synthetic test-resident identity, email and phone controls. The visible verification badge is observed UI, not proof of verified personal identity.'),(R+'16-resident-settings.png','Password change component','Current password, new password, confirmation and Update Password controls. This is a settings screen, not a completed recovery transaction.')],
'GOV-US-001':[(G+'01-government-login.png','Government sign-in form','Government email and password inputs and staff-session entry. The figure is an observed local interface, not a passed authorization test.')],
'RES-US-009':[(L+'02-report-evidence-mobile.png','Mobile evidence capture step','Real mobile capture with Take a photo or choose an image, Continue without photo, Continue and draft exit controls. The image area is an empty input, not submitted evidence.')],
'RES-US-010':[(R+'08-report-form-english.png','Quick Report location and description inputs','Historical capture: the location is labeled Verified while using a default center. The proposed flow requires explicit confirmation and does not treat this label as verification.')],
'RES-US-011':[(R+'09-report-ai-analysis.png','AI-assisted report form','Historical capture using an unrelated test illustration. Its GPS watermark and accepted AI classification were documented defects; the target requires true evidence and human-review recovery.')],
'RES-US-012':[(R+'09-report-ai-analysis.png','Existing report submission control','Detail of the observed Finalize and Submit Report control and Cancel alternative. No successful submission or durable receipt was captured in this run.',(170,613,1258,704))],
'RES-US-013':[(R+'10-my-reports-empty.png','My Reports filters and empty state','The seeded resident has no owned reports. Status filters and Submit a Report are present; this is not a loaded report-detail or resolution screen.'),(R+'11-nearby-hazard-map.png','Nearby issue map view','Observed map with sample issue markers. Any Live or Verified wording in the captured interface is not a validation of freshness or location.'),(R+'12-nearby-hazards-list.png','Nearby issue list alternative','Observed list alternative with category filters, status and barangay context. Records in the local capture are demonstration data.')],
'RES-US-016':[(R+'14-notification-history-empty.png','Notification history dialog','Actual All Notifications dialog and Mark all as read control in an empty state. Delivery, read-state persistence and deep links were not proven by this screenshot.',(294,226,986,496))],
'GOV-US-012':[(L+'04-resident-updates-mobile.png','Resident advisory and update surface','Mobile Updates view with notification and city-advisory sections. The publishing/editor approval interface was not captured; the displayed content is local demonstration data.')],
'GOV-US-002':[(N+'runtime-government-2026-08-30-sidebar-light.png','Government queue and persistent navigation','Observed citizen-report table with search, filters, statuses and row actions. Role scope and server action eligibility remain subject to the acceptance tests.')],
'GOV-US-003':[(N+'runtime-government-2026-08-30-citizen-reports-light.png','Citizen report queue and selected docket','Search/filter controls, selected report, evidence region, location and history. The sample selected record has no evidence image.'),(G+'13-command-center-selected-report.png','Triage decision controls','Historical selected-report panel with AI review, location, proof and decision controls. The absence of evidence in this sample is visible and must not be treated as valid completion.',(916,72,1294,902))],
'GOV-US-004':[(G+'14-command-center-approval-queue-empty.png','Approval queue mode','An observed empty approval queue with map context. The capture does not show a completed approval or dispatch; retained map selection was a documented continuity defect.')],
'GOV-US-005':[(G+'15-command-center-fleet-manager.png','Fleet operations and dispatch context','The observed fleet view shows team cards and an empty dispatch queue. It is related operational UI, not evidence of a completed work order.')],
'GOV-US-007':[(G+'10-projects-queue.png','Infrastructure project queue','Project search, status filter, project row and View action. Project records are sample local data; the screenshot does not prove sequential phase gating.')],
'GOV-US-008':[(G+'21-procurement-pipeline.png','Procurement budget handshake','Observed Validation, ObR, Cash Availability, BAC and NTP progression above the request list.'),(G+'22-procurement-detail-gates.png','Procurement prerequisite controls','Enlarged existing request dialog showing statutory gate controls. Visible disabled controls do not establish server-side enforcement.',(380,118,914,796))],
'GOV-US-009':[(G+'24-obo-five-point-review.png','OBO technical review component','Architectural, Civil/Structural, Electrical, Sanitary/Plumbing and Mechanical review controls. The captured immediate Approve buttons lack the complete proposed review and confirmation context.',(380,230,914,682))],
'GOV-US-010':[(G+'19-document-registry.png','Document Registry and Archive','Observed classification, target, retention/restriction information and document actions. Authorization, legal hold and disposition still require execution testing.')],
'GOV-US-011':[(G+'04-process-timeline.png','Case and project process timeline','Observed chronological status changes. The separate audit screen below was empty, so the timeline alone cannot prove audit-ledger reconciliation.'),(G+'20-audit-logs-empty.png','Audit log empty state','Actual filter controls and No audit logs found state from the same local audit. This illustrates the observed gap rather than a populated immutable ledger.')],
'GOV-US-013':[(G+'17-executive-performance.png','Executive analytics components','Observed metric cards and chart regions with local sample values. Blank charts and real-time wording are not evidence of validated analytical output.')],
'GOV-US-014':[(G+'06-predictive-asset-health.png','Predictive asset-health cards','Observed asset categories and health figures. Scores are demonstration/prototype output; the proposed process requires reproducible data, model provenance and human approval.')],
'GOV-US-015':[(G+'23-government-account-management.png','Government accounts and role controls','Observed search, role selectors, account status and suspend controls with seeded accounts. The proposed flow adds consequence, reason, confirmation and session checks.')],
'GOV-US-016':[(G+'18-records-registry-detail.png','Archived engineering record dialog','Actual finalized-record dialog with a sample record reference and project information. This thin view does not contain the complete proposed engineering docket.',(380,278,914,633))],
'RES-US-018':[(L+'03-resident-home-mobile.png','Resident mobile navigation and active-report object','Observed mobile Home, My reports, Report, Updates and Account navigation. No active reports is a local empty state; screenshot review does not certify accessibility.')],
'GOV-US-017':[(N+'runtime-government-2026-08-30-citizen-reports-light.png','Government selected report in light mode','Observed light-theme queue/detail at 1280 x 720.'),(N+'runtime-government-2026-08-30-citizen-reports-dark.png','Government selected report in dark mode','Observed dark-theme counterpart. Matching screenshots do not establish keyboard, screen-reader or contrast conformance.')],
}
RELATED = {
'RES-US-003':('RES-US-002','The captured registration screen shows the identity-evidence entry stage; account-details and account-created states were not captured.'),
'RES-US-004':('RES-US-005','The actual resident sign-in surface is shown in the referenced section. No OTP-entry or activation-result screenshot is available in the recorded run.'),
'RES-US-006':('RES-US-005','The sign-in capture contains the Forgot Password entry. The audit recorded a nonfunctional recovery entry, so no working reset sequence is illustrated as completed UI.'),
'RES-US-008':('RES-US-007','The profile capture shows a verification badge, not an optional KYC-upgrade journey. The upgrade screens remain an uncaptured target contract.'),
'RES-US-014':('RES-US-013','The available My Reports capture is empty; it contains no resident-owned record or eligible Retract control. The process image defines the proposed guarded action.'),
'RES-US-015':('RES-US-013','No resident-owned resolved record was available in the recorded run. Completion-proof and rating controls therefore have no verified screen capture.'),
'RES-US-017':('RES-US-009','The reporting screen provides task context, but no expanded assistant conversation was captured. The diagram specifies the assistance and privacy path without inventing a chat screen.'),
'GOV-US-006':('GOV-US-005','The fleet view provides related dispatch context. An authenticated assigned-worker mobile update screen was not captured, so it is not represented as observed UI.'),
}

class ScreenshotRegion(Flowable):
    """PDF image viewport: the original capture file remains unchanged."""
    def __init__(self,path,crop=None,maxw=440,maxh=370):
        Flowable.__init__(self);self.path=str(path)
        with PILImage.open(path) as im:self.iw,self.ih=im.size
        self.crop=crop or (0,0,self.iw,self.ih)
        x0,y0,x1,y1=self.crop
        assert 0<=x0<x1<=self.iw and 0<=y0<y1<=self.ih,(path,crop)
        self.scale=min(maxw/(x1-x0),maxh/(y1-y0));self.width=(x1-x0)*self.scale;self.height=(y1-y0)*self.scale
        self.hAlign='CENTER'
    def draw(self):
        c=self.canv; x0,y0,x1,y1=self.crop;s=self.scale;c.saveState();p=c.beginPath();p.rect(0,0,self.width,self.height);c.clipPath(p,stroke=0)
        c.drawImage(self.path,-x0*s,(y1-self.ih)*s,width=self.iw*s,height=self.ih*s,mask='auto')
        c.restoreState();c.setStrokeColor(HexColor('#ABB4B8'));c.setLineWidth(.4);c.rect(0,0,self.width,self.height)

def date_for(path):
    return '30 August 2026' if '2026-08-30' in path else ('29 August 2026' if '2026-08-29' in path else '28 August 2026')

def add_figures(flow,id,sid,title,P,styles,number_map):
    image_path=ASSETS/f'{id}_process_flow.png'
    diagram=Image(str(image_path),width=424,height=540*424/440)
    flow.append(KeepTogether([diagram, P(f'Figure {sid}.1 {title} - PULSO proposed process flow','cap')]))
    nextn=2
    if id=='GOV-US-004':
        flow.append(KeepTogether([Image(str(ASSETS/'PULSO_fulfillment_branches.png'),width=424,height=540*424/440),P(f'Figure {sid}.2 PULSO work-order, project/procurement and OBO fulfillment branches - proposed','cap')]))
        nextn=3
    for entry in UI.get(id,[]):
        source,label,observation=entry[:3];crop=entry[3] if len(entry)>3 else None
        maxh=400 if 'mobile' in source else 345
        if crop:maxh=345
        fig=ScreenshotRegion(ROOT/source,crop,maxh=maxh)
        flow.append(KeepTogether([fig,Spacer(1,7),P(f'Figure {sid}.{nextn} {label} - observed UI, {date_for(source)}','cap'),P(observation,'small'),P('Source: '+Path(source).name+(' (component detail from the original capture).' if crop else ' (original runtime capture).'),'small')]))
        nextn+=1
    if id in RELATED:
        target,note=RELATED[id]
        flow.append(P(f'UI evidence: See the real interface figure in Section {number_map[target]}. {note}','small'))
    return nextn-1

def generate_all():
    for id in DATA:generate_flow(id)
    generate_fulfillment()
    manifest={'process_diagrams':list(DATA),'additional_diagrams':['PULSO_fulfillment_branches'],'ui_sources':UI,'related_capture_limits':RELATED,'figma_inspection':{'file':'1qPgPj4o3smElv8B2B1REi','page':'3:2','foundation':'6:937','result':'Only foundations page exposed; screenshot export returned 1 x 1. No Figma component or screen image is claimed.'}}
    (ASSETS/'figure_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    print('Generated',len(DATA)+1,'process images;',sum(len(v) for v in UI.values()),'UI figure placements;',len(RELATED),'explicit related-screen references.')

if __name__=='__main__':generate_all()
