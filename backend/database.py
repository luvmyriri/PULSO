from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv, dotenv_values
from sqlalchemy.engine import make_url
import logging
import socket

env_path = os.path.join(os.path.dirname(__file__), ".env")
local_env_path = os.path.join(os.path.dirname(__file__), ".env.local")
if os.path.exists(local_env_path):
    load_dotenv(local_env_path)
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()


def _resolve_database_url() -> str:
    primary = os.getenv("DATABASE_URL", "postgresql://postgres:0428@localhost/pulso_db")
    try:
        parsed = make_url(primary)
        host = parsed.host or "127.0.0.1"
        port = int(parsed.port or 5432)
        with socket.create_connection((host, port), timeout=1.0):
            return primary
    except Exception:
        if os.path.exists(env_path):
            fallback = dotenv_values(env_path).get("DATABASE_URL")
            if fallback and fallback != primary:
                logging.warning("Primary DATABASE_URL unreachable; falling back to backend/.env DATABASE_URL.")
                return fallback
        return primary


DATABASE_URL = _resolve_database_url()

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true"
)

@event.listens_for(engine, "connect")
def set_search_path(dbapi_conn, connection_record):
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("SET statement_timeout = '30s'")
        cursor.close()
    except Exception as e:
        logging.warning(f"Could not set statement_timeout: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Initialize database tables."""
    from models import Resident, Official, Report, Notification, Advisory, PasswordResetToken
    from gov_models import WorkOrder, WorkOrderUpdate, AuditLog, ProcessTimeline, ProcurementRequest, BoQItem, ProjectRequest, OBOInspection, AgentLocation
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Verify database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        return False
