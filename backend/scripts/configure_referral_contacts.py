"""Import the project owner's supplied contacts with source provenance; never send.

Existing directory entries are left untouched. Imported verification has no
staff actor: it is a sourced system import, not a claim that an official signed.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from referral_models import ReferralRecipient
from external_referrals import now
import gov_models as gm

CONTACTS = [
    dict(name='Caloocan CEMD (City Environmental Management Department)', email=None, phone='(02) 8288-8811 local 2275',
         verification_reference='Project-owner supplied contact; official City directory confirms local 2275. Checked 2026-10-27: https://caloocancity.gov.ph/about-us/directory/ . No verified departmental email; manual handoff only.'),
    dict(name='Meralco', email='customercare@meralco.com.ph', phone='(02) 16211',
         verification_reference='Project-owner supplied; official public customer-care channel confirmed 2026-10-27: https://www.meralco.com.ph/residential/help-support/contact-information . Human review must confirm responsibility for each case.'),
    dict(name='Maynilad', email='customer.helpdesk@mayniladwater.com.ph', phone='1626',
         verification_reference='Project-owner supplied; email corroborated in MWSS-hosted Maynilad business plan, chapter 5, p.5-15: https://ro.mwss.gov.ph/wp-content/uploads/2023/11/Final-Business-Plan-for-the-6th-RR-Period-2023-2037_23Mar23.pdf . Hotline confirmed on https://www.mayniladwater.com.ph/contact-us/ . Imported 2026-10-27; confirm suitability of the customer-care channel for each referral.'),
]


def configure():
    with SessionLocal() as db:
        for data in CONTACTS:
            if db.query(ReferralRecipient.id).filter_by(name=data['name']).first(): continue
            item = ReferralRecipient(**data, active=True, version=1, verified_by_id=None, verified_at=now())
            db.add(item)
            db.flush()
            db.add(gm.AuditLog(trigger_type='referral_directory', actor_role='system',
                action='Project-owner supplied contact imported with published source', details=data['verification_reference']))
        db.commit()
    print('Referral contact import complete. Existing entries preserved; no messages sent.')


if __name__ == '__main__':
    if sys.argv[1:] != ['--apply']: raise SystemExit('Use --apply to import the supplied referral contacts.')
    configure()
