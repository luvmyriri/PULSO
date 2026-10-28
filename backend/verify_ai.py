"""Read-only PULSO AI readiness check.

Use ``python verify_ai.py`` for local configuration status. Add ``--live`` to
make one small Gemini request; this consumes one call from the configured cap.
No database records, resident inputs, or staff credentials are used.
"""

import argparse
import json

import gemini_service


def main() -> int:
    parser = argparse.ArgumentParser(description="Check PULSO AI readiness without changing civic records.")
    parser.add_argument("--live", action="store_true", help="Make one provider request to verify model access.")
    args = parser.parse_args()

    configured = bool(gemini_service._SDK_READY and gemini_service._client is not None
                      and not gemini_service.AI_DISABLED)
    result = {
        "configured": configured,
        "model": gemini_service.GEMINI_MODEL,
        "live_verified": None,
    }
    if args.live and configured:
        try:
            response = gemini_service._generate(
                "Return only a JSON object with the key ok set to true.",
                user_id="ai_integrity_probe",
            )
            result["live_verified"] = bool(response and json.loads(response).get("ok") is True)
        except (ValueError, TypeError):
            result["live_verified"] = False
    elif args.live:
        result["live_verified"] = False

    print(json.dumps(result))
    return 0 if configured and (not args.live or result["live_verified"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
