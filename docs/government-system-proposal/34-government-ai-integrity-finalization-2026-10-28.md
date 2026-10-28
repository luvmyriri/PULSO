# Government AI integrity implementation — 28 October 2026

**Status:** Implemented in repository; production approval and deployment verification remain separate. **Owner:** PULSO engineering. **Scope:** Government AI assistant, maintenance drafting, advisory drafting, and the legacy chat boundary. The model evaluation plan in `03-ai-model-selection-and-evaluation.md` remains proposed.

## Implemented contract

- Staff questions use `/api/gov/assistant/messages`: authenticated staff, server-scoped read-only evidence, bounded input, validated source IDs, explicit provider errors, and no model action tools. The government UI already calls this route.
- Legacy `/api/ai/assistant` and PulseAI message routes return `410` for officials. Resident-accessible PulseAI no longer offers staff queue, work-order, asset-risk, or predictive tools. Its fallback does not query staff records.
- `/api/gov/predictive/ai-plan` sends recorded asset fields and the last recorded maintenance date to Gemini. It returns an unreviewed inspection draft. Model-derived failure probabilities, cost, priority, and repair duration are not draft inputs or outputs; the compatibility fields for those values are `null`.
- `/api/advisories/generate/{report_id}` uses the authorized report's recorded category, description, and location. It remains an unpublished draft requiring staff review. Provider failure or malformed output returns `503` and leaves manual authoring available. The previous fallback that asserted engineers were on site was removed.
- `backend/verify_ai.py` is a read-only configuration check. `--live` makes one small provider request and does not authenticate as a staff member or create civic records.

## Verification

- `backend/.venv/Scripts/python.exe -m pytest -q tests/test_ai_integrity.py tests/test_government_assistant.py --disable-warnings`: **30 passed**.
- A local Vertex AI call to Gemini 2.5 Flash succeeded. Separate live calls with marked sample inputs returned valid advisory and maintenance drafts. No resident or operational record was sent in these checks.
- Python compilation and `git diff --check` passed.

## Release gates still open

1. Run the database-backed settings, permission, and workflow tests against an explicitly disposable PostGIS database. They were unavailable in the current environment because the required `PULSO_TEST_DATABASE=1` test database was not configured.
2. Verify the deployed government routes and provider configuration separately from this local checkout. A local SDK initialization or smoke call does not prove deployment health.
3. Obtain the LGU privacy owner's approval for sending report descriptions and locations to the configured provider, including purpose, retention, hosting, and access terms.
4. Complete the proposed local model evaluation and staff review of bilingual accuracy, unsupported factual additions, and failure behavior before treating AI drafts as production-validated. Humans retain publication, engineering, and lifecycle decisions.

No Figma artifact was changed: this pass repaired server behavior and preserved the existing government interface layout.
