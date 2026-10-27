"""Deterministic referral letter layout; no signatures, inferred findings or PII."""
from html import escape
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable


def letter_pdf(packet, approved=False):
    output = BytesIO()
    styles = getSampleStyleSheet()
    body = ParagraphStyle('ReferralBody', parent=styles['BodyText'], fontSize=10.5, leading=15, spaceAfter=9)
    meta = ParagraphStyle('ReferralMeta', parent=body, fontSize=9, leading=12.5, textColor=colors.HexColor('#475569'))
    title = ParagraphStyle('ReferralTitle', parent=styles['Heading1'], fontSize=18, leading=23, spaceAfter=16)
    def paragraph(value, style=body):
        return Paragraph(escape(str(value)).replace('\n', '<br/>'), style)
    document = SimpleDocTemplate(output, pagesize=A4, rightMargin=50, leftMargin=50,
                                 topMargin=44, bottomMargin=48, title=packet['reference'], author='PULSO / City Engineering Department')
    blocks = [paragraph('CITY OF CALOOCAN', meta), paragraph('City Engineering Department', styles['Heading2']),
              HRFlowable(width='100%', thickness=1, color=colors.HexColor('#cbd5e1')), Spacer(1, 16),
              paragraph('Request for coordination / referral', title),
              paragraph(f"{'APPROVED FOR DISPATCH' if approved else 'DRAFT — NOT APPROVED OR SENT'}\nReference: {packet['reference']}\nPrepared: {packet['prepared_date']}", meta),
              paragraph(f"To: {packet['recipient_name']}\nEmail: {packet['recipient_email'] or 'No verified email — manual handoff required'}\nContact: {packet.get('recipient_phone') or 'Not recorded'}"),
              paragraph(f"Subject: Referral of report {packet['ticket_id']}"),
              paragraph('Dear Receiving Office:'),
              paragraph('The City Engineering Department requests your review and appropriate action on the concern described below.'),
              paragraph('Recorded location', styles['Heading3']), paragraph(packet['location']),
              paragraph('Concern and reviewed facts', styles['Heading3']), paragraph(packet['summary']),
              paragraph('Reason for referral', styles['Heading3']), paragraph(packet['reason']),
              paragraph('Requested action', styles['Heading3']), paragraph(packet['requested_action']),
              paragraph('Please acknowledge receipt and advise whether your office accepts responsibility. Kindly quote the referral reference in your response and provide your own reference number, assigned contact, and any next steps.'),
              paragraph(f"CED coordination owner: {packet['owner_name']}\nCED follow-up scheduled: {packet['follow_up_label']}\nReply to: {packet['reply_to'] or 'To be configured before dispatch'}", meta),
              paragraph(f"Prepared by: {packet['prepared_by']}\n" + (f"Approved for dispatch by: {packet['approver_name']}" if approved else 'Approval: pending'), meta),
              paragraph('Approval is recorded in PULSO. This document does not contain a reproduced signature, certification of repair, or confirmation of acceptance by the receiving office.', meta),
              paragraph('Enclosures: this referral letter only. Resident identity, contact details, and original evidence are not attached automatically.', meta)]
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#475569'))
        canvas.drawString(50, 28, packet['reference'])
        canvas.drawRightString(A4[0]-50, 28, f'Page {doc.page}')
        canvas.restoreState()
    document.build(blocks, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
