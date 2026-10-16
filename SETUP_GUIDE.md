# PULSO local setup

This guide covers the public/resident frontend, FastAPI backend, and a local
PostGIS database. The blank-database path and both Linux database scripts were
verified in disposable containers. Never point the bootstrap script at a
database that already contains application objects.

## Requirements

- Docker with Compose.
- Python **3.12** (`.python-version`). The pinned Pillow release does not
  install in the tested Python 3.14 environment.
- Node **20.19+** or **22.12+**, with npm. Node 24 was also tested.
- Git. On Windows, use PowerShell for database scripts.

Run the commands from the repository root unless a step says otherwise.

## 1. Start PostGIS

Copy `.env.example` to `.env` at the repository root, then replace all four
placeholders with local values. Use a unique password; a hexadecimal password
avoids URL encoding issues in `DATABASE_URL`. Keep this file local. Set
`POSTGRES_PORT` to another free port if 5432 is in use.

```sh
docker compose up -d --wait
```

The single service uses `postgis/postgis:18-3.6`. Its named volume is mounted
at `/var/lib/postgresql`, the correct parent of PostgreSQL 18's data directory.
`docker compose down` stops the service and preserves the volume.

## 2. Configure the app

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env`. Replace the backend `DATABASE_URL` placeholders with the same
database, user, password, and host port from the root `.env`. Replace
`JWT_SECRET_KEY` with a different random value. The frontend example already
points to the local backend at port 33159. Optional integrations are commented
out; enable only the ones you configure. Do not commit any `.env` file.

The Compose database is for local development only. District and barangay
reference rows are intentionally absent; see [reference-data.md](docs/reference-data.md).

## 3. Install dependencies

Linux/macOS shell (the Linux path was verified):

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
cd frontend
npm ci
cd ..
```

Windows PowerShell:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
Push-Location frontend
npm ci
Pop-Location
```

`setup_project.bat` performs the Windows dependency steps after checking the
three `.env` files and the Node and Python versions. The batch path is
**untested** on this host because its installed default Python is 3.14.

## 4. Bootstrap a blank database

The bootstrap script creates the named database if missing, refuses a
non-empty database, loads the checked-in schema-only snapshot, stamps
`c455ca49f6d5`, upgrades to `e4b7c9d2f610`, and prints `alembic current`.
Run it **once per blank database**. `alembic upgrade head` alone cannot build
this legacy schema from an empty database.

Linux/macOS shell:

```sh
set -a
. backend/.env
set +a
PYTHON="$PWD/backend/.venv/bin/python" bash scripts/bootstrap_db.sh
```

Windows PowerShell (reads the URL locally without displaying it):

```powershell
$dbLine = Get-Content backend/.env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $dbLine) { throw 'DATABASE_URL is missing from backend/.env' }
$env:DATABASE_URL = $dbLine.Substring('DATABASE_URL='.Length)
Remove-Variable dbLine
./scripts/bootstrap_db.ps1 -Python ./backend/.venv/Scripts/python.exe
```

Expected revision: `e4b7c9d2f610 (head)`. The Linux shell script passed a
blank database, a schema-only existing copy, and non-empty/divergent refusal
tests. The PowerShell scripts passed the same disposable checks earlier.

## 5. Optional synthetic staff account

```sh
cd backend
.venv/bin/python seed_dev.py
cd ..
```

On Windows, use `backend\.venv\Scripts\python.exe backend\seed_dev.py` from the
repository root. Run it in a private console: it prints one generated password
once after the account is committed. Save that password in your own password
manager. A second run changes nothing and cannot show the password again.
The account is marked synthetic (`dev.staff@example.invalid`); the script does
not seed districts, barangays, reports, or real people. Broad legacy seed
scripts require `PULSO_ALLOW_DESTRUCTIVE_SEED=true` and are not part of setup.

## 6. Start the servers

In one terminal:

```sh
cd backend
.venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 33159
```

In another terminal:

```sh
cd frontend
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`; backend documentation is at
`http://127.0.0.1:33159/docs`. Windows users can run `start.bat` after
bootstrap. The Windows launcher is **untested** on this host; the equivalent
Linux backend and frontend commands are tested. `DEV_CREATE_ALL` defaults off:
startup does not create schema objects.

## Existing databases and troubleshooting

- **Already have a PULSO database:** do not run bootstrap. Back it up, then
  run `scripts/check_existing_db.sh` or `scripts/check_existing_db.ps1` with
  `DATABASE_URL` and the venv Python set as above. The script compares its
  normalized schema inventory with the baseline or head manifest. It stamps
  and upgrades only an exact baseline match, and refuses divergent schemas.
- **Native PostgreSQL installed with StackBuilder:** install the matching
  PostGIS extension in that server, confirm `SELECT PostGIS_Full_Version();`
  in the intended PULSO database, then use `check_existing_db` for a database
  you already built. This native-server path is **untested** here. A newly
  created empty native database may use bootstrap only after you verify it is
  the intended local database.
- **Port 5432 in use:** set `POSTGRES_PORT` in the root `.env`, update the port
  in `backend/.env`'s `DATABASE_URL`, then restart Compose. Port 33159 or 5173
  in use: stop the conflicting process or change the server and frontend URL
  together.
- **Need to reset disposable local data:** `docker compose down -v` removes
  the database volume and all its data. Then `docker compose up -d --wait`
  and bootstrap the new empty database. Do not run this against data you need.
- **Schema comparison fails:** keep the database untouched and review the
  diff; do not stamp a divergent database. The current model-to-schema drift
  is recorded in [schema-drift.md](docs/schema-drift.md).
- **Python install fails:** use Python 3.12 and recreate `backend/.venv` if it
  was built by another Python version. The project does not support the
  current Python 3.14/Pillow combination.

CI treats blank bootstrap, Alembic head, normalized inventory parity, and
backend PostGIS tests as blocking. The explicit baseline in
`tests/known_failures.txt` is marked xfail and CI fails if any listed test starts
passing. `alembic check` reports the known drift count without blocking.
