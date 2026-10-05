from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
import logging

env_path = os.path.join(os.path.dirname(__file__), ".env")
local_env_path = os.path.join(os.path.dirname(__file__), ".env.local")
if os.path.exists(local_env_path):
    load_dotenv(local_env_path)
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")

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
