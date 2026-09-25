import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Mock notification logging (for phase where actual SMS/Push hardware is not yet linked)
def log_notification(to_type: str, to_id: str, message: str, template: str):
    """Logs the notification to a specialized audit file for later analysis."""
    log_path = "logs/notifications.txt"
    os.makedirs("logs", exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    with open(log_path, "a") as f:
        f.write(f"[{timestamp}] [{template.upper()}] To {to_type}:{to_id} -> {message}\n")
    print(f"[{template.upper()}] Sent to {to_id}: {message}")

def send_gov_email(to_email: str, subject: str, html_content: str):
    """
    Sends a high-fidelity government notification email.
    Uses SMTP credentials from .env.
    """
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    
    if not SMTP_USER or not SMTP_PASS:
        print(f"[MAIL ERROR] SMTP credentials missing. Cannot email {to_email}")
        return False
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"【PULSO Official】 {subject}"
        msg['From'] = f"PULSO Procurement <{SMTP_USER}>"
        msg['To'] = to_email
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Use SSL for secure delivery
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_USER, SMTP_PASS.replace(" ", ""))
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[MAIL ERROR] {e}")
        return False

# --- Specific Templates ---

def notify_funds_certified(asset_id: str, project_name: str, amount: float, obr_no: str, target_user_id: str):
    """Triggered when Budget Office uploads the ObR."""
    message = (
        f"[PULSO ALERT]: Funds Certified for Project ID: {asset_id}.\n"
        f"Project Name: {project_name}\n"
        f"ABC Amount: ₱{amount:,.2f}\n"
        f"ObR No: {obr_no}\n"
        f"Status: You may now proceed to the Pre-Procurement phase.\n"
        "View details on your Engineering Dashboard."
    )
    log_notification("mobile", target_user_id, message, "funds_certified")
    # In a real setup, we'd also call a Push/SMS API here.

def send_ready_for_bidding_notice(email: str, data: Dict[str, Any]):
    """Triggered when both Budget and Treasurer clear the project."""
    subject = f"ACTION REQUIRED: Project {data['asset_id']} Ready for Procurement"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; background: #fff;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #1a365d;">Official Notice of Fiscal Clearance</h2>
        <p>Dear City Engineer,</p>
        <p>This is an automated notice from the PULSO System. The following infrastructure project has cleared all fiscal gates:</p>
        <ul style="line-height: 1.8;">
            <li><b>Project Name:</b> {data['project_name']}</li>
            <li><b>Location:</b> {data['location']}</li>
            <li><b>Certified Budget:</b> ₱{data['amount']:,.2f}</li>
            <li><b>Funding Source:</b> {data['funding_source']}</li>
            <li><b>Clearing Date:</b> {datetime.now().strftime("%B %d, %Y")}</li>
        </ul>
        <div style="background: #f7fafc; padding: 15px; border-left: 4px solid #3182ce; margin: 20px 0;">
            <b>Next Step:</b> You are now authorized to convene the Bids and Awards Committee (BAC) to finalize the procurement schedule.
        </div>
        <p style="font-size: 12px; color: #718096;">Generated via PULSO System Audit Logic (RA 9184 Compliance Engine).</p>
    </div>
    """
    return send_gov_email(email, subject, html)

def send_budget_deficiency_notice(email: str, data: Dict[str, Any]):
    """Triggered by a 'Reject' or manual budget flag."""
    subject = f"ACTION REQUIRED: Re-Estimation or Resource Realignment for {data['asset_id']}"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; background: #fff;">
        <h2 style="color: #9b2c2c; border-bottom: 2px solid #9b2c2c;">Budget Deficiency Advisory</h2>
        <p>This is to notify you that the funding request for <b>{data['project_name']}</b> has been flagged for a deficiency.</p>
        <p style="background: #fff5f5; padding: 10px; color: #c53030;">
            <b>Reason:</b> {data['reason']}
        </p>
        <p><b>Adjuster:</b> {data['adjuster_name']}</p>
        <p><b>Next Step:</b> Please re-evaluate the Program of Works (POW) or coordinate with the Budget Office to resolve the variance.</p>
        <p style="font-size: 12px; color: #718096;">Generated via PULSO Compliance Monitor.</p>
    </div>
    """
    return send_gov_email(email, subject, html)
