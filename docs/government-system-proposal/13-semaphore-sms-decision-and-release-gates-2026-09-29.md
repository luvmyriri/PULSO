# Semaphore SMS decision and release gates

**Status:** Proposed; provider account and runtime delivery not verified. **Date:** 29 September 2026. **Scope:** Government and resident notifications; documentation only.

**Later implementation update, 29 September 2026:** The user selected PhilSMS for a funded pilot. The backend now supports either provider through `SMS_PROVIDER`; see [SMS provider testing](../../backend/SMS_PROVIDER_TESTING.md). The initial Semaphore recommendation below remains the dated research conclusion, not the current test-provider selection. One controlled PhilSMS message was reported `Delivered` by the provider; handset receipt has not been independently confirmed.

## Recommendation

Use **Semaphore as PULSO's proposed Philippine SMS provider** for the first release, subject to account activation, an approved sender name, a funded account, a controlled real-device test, and the security fixes below. Keep the provider behind a small SMS adapter so a later replacement does not alter case records or notification policy. Globe Labs is not the recommended initial path: its published flow requires subscriber authorization and its public samples/docs were last committed in 2019. The Globe Labs dashboard screenshot shows a wallet balance, but no created app or proven delivery.

This is a technical recommendation, not LGU procurement or production approval. No provider account was accessed or configured and no SMS was sent.

## What the current Semaphore documentation supports

| Need | Published capability | PULSO decision |
|---|---|---|
| Routine private case updates | `POST /api/v4/messages`; API response includes a message ID and status | Send only to a verified phone with an applicable notification preference. Store each recipient's provider ID and response. |
| Resident sign-in OTP | Dedicated `POST /api/v4/otp` endpoint, including caller-supplied code | Use only for OTP. Generate the code securely in PULSO, store a hash with expiration and attempt limits, and send the code through this endpoint. Never return or log it. |
| Time-sensitive staff notice | `POST /api/v4/priority` | Use only for LGU-approved urgent classes and cost policy. An SMS is an aid to dispatch, not proof that a staff member acknowledged an incident. |
| Approved public announcement | Bulk messages can take up to 1,000 numbers for the same content | Use only for a defined, authorized audience, with review, count preview, cost estimate, quiet-hour policy, and per-recipient audit. The canonical notice remains the website record. |
| Delivery evidence | `GET /api/v4/messages/{id}`; published statuses include queued, pending, sent to network, failed, and refunded | Poll/reconcile with rate limits. Label `sent` as **accepted by mobile network**, not delivered to handset or read. Treat unknown as unknown. |
| Budget | Account balance endpoint; standard, priority and OTP routes have different credit use | Alert before low balance. Verify today's rate and credit rules in the active account before budgeting. |

The public API documentation does not describe a delivery webhook. Design around message-ID polling unless Semaphore confirms an authenticated callback for this account. Its advisory says API message history is limited to 30 days; PULSO must retain its own minimum necessary delivery record under an LGU-approved retention policy.

## Release blockers visible in the current repository

1. [backend/main.py](../../backend/main.py) phone OTP response includes `dev_code`; the verification endpoint accepts a hard-coded `123456` bypass with no production guard. The code is generated with `random.randint`, and the send result is not used before claiming success. This is an authentication blocker independent of SMS provider.
2. [backend/sms_utils.py](../../backend/sms_utils.py) defaults to a mock key that reports success. On the real OTP path it also returns `True` after non-200 responses or exceptions, and logs the OTP and message content. Fail closed, remove sensitive logging, and distinguish accepted/failed/unknown outcomes.
3. [backend/announcements_router.py](../../backend/announcements_router.py) marks SMS and email announcement deliveries as `delivered` with invented recipient counts; no provider call occurs. Replace estimated counts with actual audience snapshots and per-recipient delivery records before enabling these channels.
4. [backend/gov_crud.py](../../backend/gov_crud.py) sends emergency SMS synchronously inside a role notification path and ignores its result. Move provider calls to a durable outbox/worker and expose failed or unknown status to the duty team. Define the actual emergency policy; the current “Level 100” text is code behavior, not an approved protocol.

Do not publish phone sign-in or SMS announcement features until the corresponding blocker is resolved and tested. No code change is authorized by this document.

## Implementation sequence and proof

1. **Policy and account:** LGU names an SMS owner, approves sender identity, purpose, audience, templates, urgent classes, spending ceiling, and phone/consent rules. Confirm account activation, sender-name status, current costs and balance using provider read-only account endpoints.
2. **Authentication first:** remove the bypass and `dev_code`, use a cryptographically secure OTP, store only a hash, enforce expiration, attempt and resend limits, and return a neutral response on delivery failure. Test the full request-to-login path with a controlled phone number.
3. **Provider adapter:** one server-side interface returns `accepted`, `rejected`, or `unknown` plus provider message ID and redacted error. Store the API key in a secret manager; never expose it to the browser or logs. Set timeouts and retry only when safe from duplicate sends.
4. **Durable notifications:** commit case/announcement event and an outbox job together; workers choose template, language, recipient and route. Use an idempotency key and audit each attempt. Reconcile provider status by message ID within documented API limits. Preserve the 30-day provider-history constraint in local retention planning.
5. **Controlled launch:** test standard, OTP and approved priority routes on Globe, Smart and DITO test devices where available; record provider ID, latency, status progression, credits and actual reception. Simulate no balance, bad sender, invalid number, rate limit, timeout, duplicate retry and provider outage. Start with staff or a small consenting pilot before public campaigns.

## Operational boundaries

- SMS is a short prompt to open the private case page. Do not place evidence, exact residential addresses, sensitive classifications, or one-time codes in ordinary case notifications.
- Public announcement approval and publication are separate from SMS delivery. An SMS failure must not create a false website-publication failure, and a published web notice does not imply any phone received it.
- Interdepartmental referrals in the government proposal remain controlled **email** handoffs with acknowledgement tracking. Semaphore does not replace that workflow.
- The product should show `queued`, `provider accepted`, `sent to network`, `failed`, `unknown`, or `not attempted` using evidence available for that message. Never call `sent to network` “delivered to resident.”

## Sources and limits

- [Semaphore API documentation](https://www.semaphore.co/docs): endpoints, request limits, sender names, statuses, OTP, priority, bulk, message lookup, account balance.
- [Semaphore advisories](https://api.semaphore.co/advisories): 30-day API message-history limit and sender-name changes.
- [Semaphore terms](https://semaphore.co/terms): account activation, credit and service terms; confirm live rates and government procurement fit directly.
- [Globe Labs published API documentation](https://github.com/globelabs/gl-docs) and [Globe Labs Python sample](https://github.com/glabsdev/python): subscriber authorization and older implementation examples. Documentation age does not prove the service is unavailable; actual account testing was outside this assessment.

**Next decision:** The LGU product/technical owners should approve Semaphore as the pilot provider after the account and real-device checks. This document does not approve production messaging or spending.
