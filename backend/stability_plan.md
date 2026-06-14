# Backend Stability & AI Infrastructure Audit Implementation Plan

This plan addresses several critical inconsistencies and potential runtime errors identified during the system scan of the PULSO backend.

## 1. Authentication Flow Consolidation

The current `main.py` contains redundant and conflicting authentication routes. We will standardize on the high-fidelity, token-based flow as requested by the premium design requirements.

- **Action:** Remove the duplicate 6-digit code based `forgot-password` and `reset-password` routes.
- **Action:** Standardize on the `/api/auth/verify-token/{token}` and token-based `reset-password` logic.
- **Action:** Clean up duplicate Pydantic request models in `main.py`.

## 2. Timezone-Aware Datetime Corrections

Several components (Analytics, Auth, and Seeding) inconsistently mix naive and UTC-aware datetimes, which can cause `TypeError` or logical mismatches in report windows.

- **Action:** Replace `datetime.utcnow()` and `datetime.now()` with `datetime.now(timezone.utc)` across `main.py` and `analytics_service.py`.
- **Action:** Update `seed_universal.py` to use UTC-aware timestamps for consistent analytical testing.

## 3. AI Service Stabilization

The model identifier `gemini-2.5-flash` is invalid and will cause 404 errors from the Google GenAI SDK.

- **Action:** Standardize on `models/gemini-1.5-flash` in `gemini_service.py`. (Wait, let's check if `gemini-2.0-flash` is intended, but `1.5-flash` is the stable production model).
- **Action:** Verify safety settings in `gemini_service.py` to ensure the moderation filter correctly returns `is_inappropriate`.

## 4. Analytics Pipeline Refinement

- **Action:** Improve the `recurrence_score` calculation in `analytics_service.py` to check more than just the first anchor in a cluster group.
- **Action:** Ensure `_enrich_report` in `main.py` is used consistently across all GET report endpoints to avoid missing `reporter_name`.

## 5. Environment & Security

- **Action:** Move the hardcoded database password in `database.py` to an environment variable in `.env`.
- **Action:** Ensure `GOOGLE_APPLICATION_CREDENTIALS` is correctly referenced in the system environment.

---

**Next Steps:** I will begin by fixing the most critical bugs (Timezone and AI Model) first.
