# Local setup verification

Status: verified on a disposable PostGIS database and a shallow local clone.
No production database or real rows were used. Test credentials were generated
locally, never printed, and removed with the temporary clone.

| Check | Command or method | Result |
| --- | --- | --- |
| Clone excludes local state | `git clone --depth 1` and existence checks | Pass: no `backend/.venv`, `.env`, or service credential file |
| Compose health | `docker compose up -d --wait` | Pass |
| Python dependencies | `python3.12 -m venv backend/.venv`; `backend/.venv/bin/python -m pip install -r backend/requirements.txt` | Pass in Python 3.12 Linux container |
| Frontend dependencies | `cd frontend && npm ci` | Pass |
| Blank bootstrap | `PYTHON=... bash scripts/bootstrap_db.sh` | Pass; `a9c6e4b2d1f0 (head)` |
| Synthetic seed | `cd backend && .venv/bin/python seed_dev.py` | Pass; one synthetic official; password output suppressed during test |
| Backend | `python -m uvicorn main:app --reload ...` | Pass; `/docs` HTTP 200 |
| Frontend | `npm run dev -- --host 127.0.0.1` | Pass; `/` HTTP 200 |
| Schema parity after startup | `scripts/db_schema.py inventory` compared to head manifest | Pass |
| Windows launcher guard | `cmd /c setup_project.bat`; `cmd /c start.bat` | Pass: clear error because Python 3.12 is absent on this host |

The Linux `bootstrap_db.sh` and `check_existing_db.sh` also passed against
separate disposable databases: blank bootstrap, schema-only existing-copy
upgrade, non-empty bootstrap refusal, and divergent existing-schema refusal.
`.gitattributes` preserves LF line endings in both scripts, including in Git
archives. The temporary Windows-created `.env` was normalized to LF before
sourcing it inside the Linux test container; a native Linux-created `.env`
needs no conversion.

The GitHub-hosted workflow has not run yet. Its blocking commands were tested
locally, and its YAML parsed successfully. `alembic check` remains report-only
because model drift is known. The existing backend test suite was run in a
disposable Python 3.12/PostGIS environment: 212 passed, 127 failed, 8 errors,
224 warnings. CI runs it report-only while those legacy failures are reviewed.
