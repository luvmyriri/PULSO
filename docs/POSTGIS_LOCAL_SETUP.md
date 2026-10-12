# Local PostGIS instance

**Status:** verified on Val's Windows workstation on 2026-10-06. This is a local development database, not a production deployment.

The existing PostgreSQL 18 service on port 5432 does not include PostGIS. A user-owned PostgreSQL 18.1 instance with the official PostGIS 3.6.2 Windows bundle runs on `127.0.0.1:5433`. Its files, data directory, backup, log, and startup script are under `%LOCALAPPDATA%\PULSO\PostGIS`. The official bundle archive was checked against its published MD5 before extraction.

`pulso_db` on port 5433 was restored from a read-only dump of the port-5432 database at Alembic revision `da48716fc54d`, then upgraded to `b72d4e_postgis_report_locations`. The port-5432 database was not changed. **The two databases do not replicate:** later writes to either are not copied to the other.

On 2026-10-09, this branch also applied `c81a1f_report_reliability` on port 5433 for report versions, command receipts, and the in-app notification outbox. See [`GOVERNMENT_RELIABILITY_SLICE.md`](./GOVERNMENT_RELIABILITY_SLICE.md).

This branch's backend reads `backend/.env.local` before the tracked `backend/.env`. The local override contains the port-5433 connection and is ignored by Git. An explicit `DATABASE_URL` process environment variable still takes precedence. Alembic now uses the same resolved URL as the backend, so run it from `backend/`:

```powershell
python -m alembic current
python -m alembic upgrade head
```

A hidden `PULSO PostGIS.lnk` shortcut in the current user's Windows Startup folder runs `%LOCALAPPDATA%\PULSO\PostGIS\start-postgis.ps1` at sign-in. The launcher is idempotent and was tested by stopping and restarting the private instance. To start it manually, run the script in PowerShell. The instance listens only on loopback.

## Verified state

- PostgreSQL 18.1, PostGIS 3.6.2, Alembic `b72d4e_postgis_report_locations`.
- GiST indexes `ix_reports_location_geog` and `ix_agent_locations_location_geog` exist.
- A report `ST_DWithin` explain plan with sequential scans disabled selected `ix_reports_location_geog`; the small development dataset may naturally choose a sequential scan without that planner setting.
- All 13 restored reports and five restored field locations had generated geography points.
- A geodesic distance check (10.77 m), the PostGIS report proximity path, and the fresh eligible agent suggestion path succeeded. The agent-location test used a transaction that was rolled back.
- The branch backend connected to port 5433 and `/api/health` returned HTTP `200`.

Other checkouts and environments still need their own PostGIS installation, migration, and connection configuration. Do not copy the local credential file into Git or treat this development snapshot as the production record.
