# PULSO Project Setup Guide

Welcome to the **PULSO** development team! This guide will help you set up the entire ecosystem (Backend, Frontend, and Mobile) on your local machine.

---

## 📋 Prerequisites

Ensure you have the following installed on your system:

- **Python 3.10+**: [Download](https://www.python.org/downloads/)
- **Node.js 18+ & npm**: [Download](https://nodejs.org/)
- **Flutter SDK**: [Install Guide](https://docs.flutter.dev/get-started/install)
- **PostgreSQL 14+**: [Download](https://www.postgresql.org/download/)
- **Git**: [Download](https://git-scm.com/)

---

## 🛠️ 1. Backend Setup (Python FastAPI)

1. **Open a terminal** in the `backend/` directory.
2. **Create a Virtual Environment**:

   ```bash
   python -m venv .venv
   ```

3. **Activate the Environment**:
   - Windows: `.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`

4. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**:
   - Copy `backend/.env.example` to `backend/.env.local` and fill in local values. Keep that file untracked.
   - Set `DATABASE_URL` in the terminal to the URL of your own blank PostGIS database. The bootstrap command requires an explicit URL and refuses to run without one.

6. **Start PostGIS & Bootstrap the Database**:
   - **Option A (Recommended - 1-Command Docker)**:
     If Docker is installed, spin up PostGIS in seconds:
     `ash
     docker compose up -d db
     `
   - **Option B (Native PostgreSQL/PostGIS)**:
     Ensure local PostgreSQL with the PostGIS extension is running.

   - **Bootstrap the Database**:
     For a fresh setup, run the bootstrap script from the repository root:
     - Windows PowerShell: ./scripts/bootstrap_db.ps1
     - Linux/macOS: ash scripts/bootstrap_db.sh
     
     *(This script loads the checked-in schema snapshot, stamps Alembic, and migrates to head e4b7c9d2f610).*
     
     *(If upgrading an existing working database, simply run cd backend && python -m alembic upgrade head).*

7. **Run the Backend**:

   ```bash
   uvicorn main:app --reload
   ```

   (Or use the `run_backend.bat` script on Windows).

---

## 💻 2. Frontend Setup (React + Vite)

1. **Open a terminal** in the `frontend/` directory.
2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Run the Development Server**:

   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:5173`.

---

## 📱 3. Mobile App Setup (Flutter)

1. **Open a terminal** in the `mobile_app/` directory.
2. **Install Flutter dependencies**:

   ```bash
   flutter pub get
   ```

3. **Run the App**:
   - Connect an Android/iOS device or start an emulator.
   - Execute:

     ```bash
     flutter run
     ```

---

## 🚀 Troubleshooting

- **Python Errors:** Ensure your `.venv` is activated. If `psycopg2` fails to install, make sure PostgreSQL is correctly added to your system PATH.
- **Node Errors:** Delete `node_modules` and run `npm install` again.
- **Flutter Errors:** Run `flutter doctor` to check for missing SDK components.
- **Database Connection:** Verify the `SQLALCHEMY_DATABASE_URL` in `backend/database.py` matches your local PostgreSQL credentials (default: `postgresql://postgres:user@localhost/pulso_db`).

---

## 💡 Quick Start (Windows)

We've provided a `setup_project.bat` in the root directory to automate the dependency installation for you. Just run it!
