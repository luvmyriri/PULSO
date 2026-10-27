# Resident information requests

Observed implementation on `FinalIntegratedPulso`, validated 27 October 2026.

The resident's job is to open a government request from Notifications, understand
what is missing, and return a clarification to the existing government Reports
workspace. No separate referral screen or new staff capability is introduced.

## Navigation and data

- `/dashboard?tab=reports&reportId=<id>` selects My reports and opens that exact
  report through the owner-authorized `/api/reports/{id}` endpoint. It does not
  depend on the first 50 records in the resident's queue.
- React Router owns the selected tab and report. Notification clicks on an already
  mounted dashboard, refresh, browser history, and switching tabs use the same URL
  state. Returning to My reports removes the selected report ID.
- Opening a notification closes its menu and navigates immediately; marking the
  notification read cannot delay opening the report.
- Request text and time come from the latest `needs_information` event in the
  resident-authorized public timeline. Internal staff notes are excluded by the
  server. Request text is rendered as text, never HTML.

## Reply and states

The existing `/api/reports/information-reply` endpoint accepts a 10–2,000 character
clarification from the authenticated owner or a valid tracking-token holder. The
dashboard sends the authenticated resident's ticket and text. It does not request
or expose a tracking token. Backend ownership, lifecycle eligibility, rate limits,
and duplicate rejection remain authoritative.

The request and labeled reply form precede the submitted evidence. Loading and
failed request details do not show a reply form. The form preserves text after
an unsuccessful send, prevents concurrent submission, offers status refresh on
failure, and announces confirmed success. Ownership/session errors, changed
status, rate limiting, and an uncertain network response have explicit messages.
A confirmed reply returns the report to `pending`, records the clarification
privately in government Activity and audit history, and notifies the requesting
official. Only a generic receipt appears in the resident's public timeline.

New copy has English/Filipino parity. Controls use native form semantics, an
associated label/hint/error, a visible 3 px keyboard focus treatment, 44 px action
targets, wrapping text and a flexible-width textarea. The existing light/dark
report-detail composition and evidence presentation are retained. Focus enters
the report heading when a different report opens.

## Validation and limitations

- Disposable PostGIS: 12 cross-portal integration tests passed, covering the
  government request, durable notification, owned detail/timeline, reply,
  government Activity, private audit, duplicate rejection and nonowner denial.
- Node: nine routing and rendered-component checks passed, including reordered
  query parameters, tab switching, unsafe destinations, request states, escaping
  and Filipino controls.
- Frontend production build passed. Targeted ESLint found no errors; the large
  resident dashboard retains pre-existing warnings and bundle-size warnings.
- Live browser, keyboard, 320 px/200% zoom and visual theme verification could
  not be completed: local browser control is disabled in Work settings.
- No Figma write is claimed. This is a functional correction within the existing
  report-detail design; the shared file is unchanged. Reconcile the request/reply
  state annotations with the resident report template when Figma editing is
  available. These checks do not certify unrelated end-to-end report workflows.
