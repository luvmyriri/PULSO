# Resident administration and confirmation

Status: observed development implementation, 26 October 2026. Continues documents 16, 24–26. The full government-side objective is still active.

## Resident account work

Replaced the remaining legacy administration page with the shared Reports-style table, selected record, Details / Identity review / Activity sections, and centered decision dialogs. Search, filters, pagination and the selected resident stay in the URL. A selected record loads independently of the current list page. Server-authorized actions control the available account commands.

Names or email patterns containing “test” or “demo” no longer silently hide accounts. The list masks contact details, reports missing barangay/type/date values as missing, and does not invent last-login times, a national-ID type, an ID number or an ID photo. Report totals are limited to the administrator's report scope. Resident administration history matches a typed JSON resident identifier, not a partial name or email.

Account access decisions require a reason and expected version. The resident row is locked, administrative authority is rechecked, and account changes, audit and private in-app notification commit together. Access changes increment a session version; suspended/deactivated accounts are blocked and old sessions stay invalid after reactivation. The retained legacy account-status command delegates to the same implementation.

## Identity review and sign-in are distinct

The current account schema stores identity metadata, not ID document images or ID numbers. The old endpoint returned a fabricated masked number and `has_id_photo=true`; both claims are removed. Opening the Identity review section records a metadata-access event.

An authorized administrator can record an explicit accepted/not-accepted identity review with a required reference to evidence reviewed by the responsible office and a reason. Its reference, reviewer and time are saved. This records an external review; it does not constitute an in-app document verification service or an independently validated identity claim. Identity decisions do not confirm email/phone ownership, activate an account, or grant sign-in. Rejection clears the prior accepted-review date. The responsible LGU/privacy owner must confirm delegation and evidence custody before operational use.

## Real confirmation behavior

Removed the fabricated `CONF-...` link and false email-success response. The administrative action uses the existing email-code flow and actual SMTP sender. Success means the SMTP sender accepted the message; mailbox delivery is not claimed. Failure returns 503 and is recorded in account history. No external email was sent during implementation verification: tests replace the sender and the live browser did not submit this action.

New registration/confirmation codes use a secret-key HMAC, ten-minute expiry, five failed-attempt limit, one-minute reissue interval, and locked single-use redemption. Codes are not returned in administrative responses or written to audit history. Old unbounded plaintext confirmation codes must be reissued. The code is committed before SMTP so a code accepted by the email service remains redeemable after a lost HTTP response. Delivery is an external operation and is not presented as atomic with the database transaction. Confirmation codes do not change the ID-review status.

The additive migration `14a9cbe3e765` adds account/session versions, confirmation expiry/attempt timestamps and identity-review provenance. It was applied successfully to the disposable database and the configured local development database without resetting or seeding account data. Bootstrap/inventory guards now expect this head.

## Verification

- Combined disposable PostGIS run: **169 passed**, including 14 new resident checks, the 18 settings cases and the existing government/staff suites. The first focused run exposed a stale ORM value after a locked confirmation lookup; refreshing the locked row corrected concurrent double acceptance. Account mutation rollback, stale edits, permission/scope restrictions, identity/login separation, provider failure, expiry, attempts and single use are covered.
- Subsequent focused regression: **16 passed**, including the new retained resident account-status alias check and the existing district-scope regression. This follows the combined 169-check run; the full suite was not rerun after this small alias delegation change.
- Targeted frontend lint passes with no errors. Production build passes; the existing bundle-size warning remains. Removing the unused legacy administration composition reduced its generated JS/CSS contribution but does not resolve the full performance issue.
- Live dark desktop and 320 px identity-review form checked; page width remained 320 px, dialog width 288 px, keyboard input focus had a three-pixel outline, and Escape returned focus to Record identity review. The live browser did not submit a resident decision or confirmation message.
- After live navigation, the configured database still had ten residents, zero resident-administration audit events, zero settings and zero setting-history entries. The API restarted on `127.0.0.1:33159` at the new schema head. These are local development records, not verified City data.
- Reproducible route inventory: **218 selected-family routes**, no duplicate method/path registrations. Counts are coverage aids, not completion or security certification.

Evidence: [desktop record](../ui-ux-audit/government-completion-2026-10-26/resident-account-desktop-dark.png), [320 px review form](../ui-ux-audit/government-completion-2026-10-26/resident-review-mobile.png). New settings evidence is in document 26. No new Figma inspection or mutation is claimed. All-route keyboard, true 200% zoom, forced-colors, screen-reader and bilingual resident notification acceptance remain outstanding.

Staff sign-in cleanup also removes fictional directives/resource downloads and replaces “Internal Gateway” / “Initialize Session” with Staff sign in / Sign in. The existing sign-in layout and credential flow are retained. A browser render caught and corrected a removed icon import; [the final clean sign-in capture](../ui-ux-audit/government-completion-2026-10-26/staff-sign-in-desktop.png) shows the rendered page with empty fields. No credentials were submitted during this check. Login debug statements containing the identifier and password length were removed from the API.

## Remaining work

Project coordination, external-dependency handoffs and completion evidence still require implementation/reconciliation with the disclosure-only boundary. Staff invitations still use private manual delivery; public-update email/phone providers and their delivery preferences/retries remain separate work. Remaining legacy role/scope/PII paths, records lifecycle and end-to-end operational validation remain on the completion ledger. Existing resident registration/Google/OCR verification policy also needs a dedicated review; this pass does not certify those identity flows.

Implementation owner: repository work. Operational approvers: nominated LGU engineering, administration and privacy owners, still to be confirmed. Version: 1. Last validated: 26 October 2026. No commit or deployment is claimed.
