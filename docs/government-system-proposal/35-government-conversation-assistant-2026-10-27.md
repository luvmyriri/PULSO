# Government conversation assistant

**Superseded, 28 October 2026:** the user requested Gemini with scoped PostGIS and
LightGBM grounding and removal of the old About popup. The current observed
contract is [Government Gemini grounding](../integration/government-gemini-grounding.md).
The OpenAI/no-records descriptions below are retained as historical context.

Status: observed implementation at the user's explicit request; pilot access policy, operational rollout and shared Figma component remain proposed. Implementation is not approval of those policies. Owner: PULSO product/LGU decision owners. Version: 1.1. Last validated: 2026-10-27.

## Job and design contract

Staff can ask quick questions about workflow terms, interpret supplied KPIs, and prepare drafts without losing their workspace. This extends the observed government surface system: Field Blue, existing typography, light/dark semantic tokens and an inset composer. No resident interface changes.

On `/gov/overview`, the conversation is embedded beside the charts in a right column up to 380 px wide, with height clamped from 520 to 640 px. Below 1200 px it stacks after the charts; below 640 px it takes the available column width. There is no floating bubble on this route. A fallback slot keeps the conversation available while overview data is loading, incomplete or failed.

Other government pages, including My work at `/gov/dashboard`, retain the 56 px bottom-right launcher and desktop modeless panel, at most 408 × 640 px. The closed launcher fades to 72% opacity after five seconds idle, returns to full opacity on hover/focus, and stays opaque for a new answer. A native modal dialog contains focus below 640 px wide or at most 500 px high, with 8 px edge space. Desktop modeless use does not lock page scrolling. Navigation minimizes floating mode; a shared provider, callback host and React portal preserve the mounted conversation state, transcript and draft when moving between embedded and floating presentation.

The welcome prompt, rounded composer and editable starter chips share the same content in both presentations. Header `About this assistant` disclosure contains the advisory, no-live-records, OpenAI privacy and ephemeral-conversation notice. The composer grows with input up to 120 px. Conversation and composer scrollbars are visually hidden; wheel and keyboard scrolling remain available.

Keyboard: the floating launcher opens and focuses the question; Enter sends, Shift+Enter inserts a line, IME composition is respected. Escape/minimize in floating mode returns focus to the launcher. Conversation history is keyboard-scrollable. Focus is 3 px; controls are at least 44 px. Reduced motion disables fading transitions; forced colors restores full launcher opacity and system boundaries.

Shared table, pagination and form footers reserve 88 px of inline-end clearance only while floating mode is present. Descendants of native dialogs are excluded, so dialog actions retain their existing layout.

## Data, identity and privacy

- `GET /api/gov/assistant/status` remains a backend configuration endpoint, not a provider-availability guarantee. Version 1.1 makes no frontend preflight request and shows no standing configuration/status banner. Send is usable; actual service failures are reported after a message attempt.
- `POST /api/gov/assistant/messages` accepts bounded alternating user/assistant messages and one allowlisted general page label. Server authentication resolves the actual Official; residents cannot call either route. Existing active/suspended/session-version checks remain in the authentication dependency.
- An explicit role capability `assistant` overrides the staff pilot default; it must include `ask` or `*`. By default authenticated staff can ask advisory questions. This is a new pilot access policy, not an assertion of LGU production delegation.
- The assistant has no record, search, file, browser, tool or mutation access. It never receives page contents, filters, IDs, evidence, account profiles or database records automatically. It can only discuss user-provided information and the allowlisted page label. AI advice and drafts require human review.
- The OpenAI key is server-only. Use `OPENAI_API_KEY` in `backend/.env` and optional `OPENAI_MODEL` (default `gpt-4.1-mini`); restart the backend after configuring. `AI_DISABLED=true` disables the connection. There is no `VITE_` key and no browser-to-provider request.
- Each provider call uses the [OpenAI Responses API](https://developers.openai.com/api/reference/python/resources/responses/methods/create) with `store: false`. This setting does not claim zero provider retention; see [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).
- Conversation and drafts exist only in the mounted browser component's memory: across SPA navigation, but cleared on reload, sign-out or account/token replacement. They are not written to local storage or the PULSO database. Recent complete turns within the bounded context window are sent; older messages remain visible but may leave model context.
- Requests allow 21 messages, 28,000 characters total and 4,000 characters per question. The response budget is 1,200 output tokens. Per-account throttling allows 10 questions/minute per backend process; a multi-worker deployment needs a shared limiter for a cluster-wide quota. No automatic retries or provider calls occur on page navigation.

## States and recovery

| State | Behavior |
| --- | --- |
| First use | Three editable prompts: explain KPIs, review checklist, draft update |
| Unconfigured/disabled | Actual message request returns 503; concise unavailable error preserves the question with Try again and Edit question |
| Pending | Preparing an answer and Stop response; no duplicate submission |
| Success | Plain text/Markdown answer; raw HTML and remote images are not rendered |
| Provider/network/timeout failure | Explicit error; Try again resends the same turn, Edit question restores it |
| Rate limited | Recoverable message; no automatic charged retry |
| Cancelled | Browser request aborted; unanswered question restored for editing; provider work already started may still incur usage |
| Incomplete output | Partial answer labelled with a request to ask a follow-up |
| New conversation | Clears local transcript and draft; disabled during a pending request |
| Minimized while answering | Conversation remains mounted; floating launcher shows a new-answer indicator |
| Signed out/other portal | Assistant unmounted and transcript removed |

No emergency, approval, lifecycle, monetary or authorization action is delegated to the assistant. UI-only permissions do not authorize server access. English staff starter copy is initial scope; the assistant is instructed to match the employee's language. Resident bilingual contracts are unchanged.

## Validation and limitations

The isolated router tests use mock provider responses and no database writes or provider charges. Browser checks use intercepted sample API fixtures and a test-only identity in headless Chrome, not the user's signed-in session. No OpenAI key is configured in this checkout, so a paid live completion has not been validated. Configuration presence alone does not establish model access or available credits.

Observed verification on 2026-10-27, version 1.1:

- The final frontend production build passed (20.56 s); targeted ESLint passed and Impeccable detector returned `[]`.
- All 19 fixture-based browser checks passed without runtime exceptions: a 380 × 578 px panel beside charts, no overview bubble, embedded → floating → embedded transcript/draft continuity, bounded long-answer keyboard scrolling, no standing banner, on-demand 503 recovery, 320 px reflow without overflow, floating mobile modal containment, and light/dark changes through the actual theme control. Captures: `.impeccable/review/assistant-vertical/` (synthetic fixtures).
- Fresh independent review of version 1.1 is pending.

Historical version 1 evidence: all 21 isolated backend tests passed with mocked provider responses. Backend authentication and provider code are unchanged in version 1.1; these tests were not rerun for the presentation revision. The earlier 26-check browser matrix, native PageUp, 200%-equivalent viewport, forced-colors, reduced-motion and footer review passed before the revision; they are not a claim that every check was rerun on version 1.1. Historical captures remain at `.impeccable/review/assistant/`. The footer fix previously measured 33 px desktop launcher clearance and no 320 px page/footer overflow; version 1.1 limits that clearance rule to floating mode.

These bounded checks establish the observed local behavior, not a complete WCAG conformance or production rollout claim. Hidden scrollbar discoverability and the revised About disclosure remain part of the version 1.1 accessibility review.

Figma inspection through the current connector failed with `Unknown tool (figma.get_design_context)`. No Figma write or binding claim is made. Next Figma action: inspect the [shared file](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi), reconcile against reviewer-final government templates, and create reusable paired light/dark `Government/AssistantLauncher` and `Government/ConversationPanel` artifacts with embedded/floating presentation, responsive layout, About disclosure, idle, hover/focus, pending, unread and recoverable-error states. API/privacy annotations above must accompany them. This feature is locally reviewable, with shared Figma reconciliation outstanding.


## v1.1 — dashboard composition update

Later idle-visibility correction: closed floating launchers now use 65% opacity immediately, without the original five-second timer. Hover, keyboard focus and an open conversation restore full opacity; forced-colors mode remains fully opaque. This supersedes the original idle timing above. Targeted ESLint passed. The browser recheck launch was blocked by automatic tool policy, so this correction has no new browser verification claim.

Supersedes the initial floating-only layout and standing configuration notice above. At the user's request, `/gov/overview` embeds a vertical conversation alongside operational charts. Desktop workbench uses a flexible chart column and a 380 px conversation column; below 1200 px the panel stacks after the charts. There is no launcher on Operations overview. All other authenticated government pages, including My work, keep the fading bubble. A shared provider/portal host preserves the transcript and draft across these modes. If overview data cannot load, its standalone conversation host remains available.

The conversation uses a clean welcome, rounded composer, editable prompt chips, and About disclosure for no-live-records/privacy/ephemeral-history information. The persistent setup banner and frontend status preflight are removed. Missing-provider errors appear only after Send, with concise recovery and the unanswered question preserved. This does not establish an OpenAI connection; no key is configured. Conversation scrollbars are hidden visually while wheel, touch and keyboard scrolling remain available. The textarea grows to 120 px. Shared footer clearance applies only when the floating launcher exists.

Observed: production build, targeted ESLint and detector passed; 19 intercepted browser checks covered vertical 380 × 578 px composition, no overview bubble, conversation and draft retention in both navigation directions, long-answer PageUp scrolling, no setup banner, on-demand provider error, 320 px fit, theme parity and native mobile dialog behavior, with no runtime exceptions. Independent screenshot/source review passed this composition. Screenshots: `.impeccable/review/assistant-vertical/`. Figma and live-provider validation remain outstanding.


## User-supplied AI identity

On 27 October 2026 the user supplied the orange/white speech-pin logo and explicitly requested its use as the AI icon/logo. `frontend/public/pulso-ai-logo.png` is an unchanged copy of `codex-clipboard-5aa488d3-8b90-467b-94db-7b93b47487e5.png` from the user's attachment. Reusable `AiBrandMark` displays it with a circular CSS viewport; no generated substitute or raster edit was made. Government launcher/header and resident chat entry/header/message avatars now use it. Universal close/send/action icons retain their normal meaning. The existing 65% inactive launcher opacity, keyboard labels and focus behavior are preserved. Exact-image checksum verified; production build and targeted component lint are validation gates. No new live-browser validation is claimed for this asset replacement.
