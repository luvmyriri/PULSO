"""
migrate_add_ai_columns.py
Adds AI-related columns to the 'reports' table if they don't exist.
Safe to run multiple times (idempotent).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

# Columns to add: (column_name, type_definition)
COLUMNS = [
    ("ai_category",    "VARCHAR"),
    ("ai_urgency",     "VARCHAR"),
    ("ai_summary",     "VARCHAR"),
    ("ai_reasoning",   "VARCHAR"),
    ("severity_score", "FLOAT DEFAULT 0.0"),
    ("ai_metadata",    "TEXT"),
    ("cluster_id",     "INTEGER"),
]

print("\n" + "="*55)
print("  PULSO — DB Migration: Add AI Columns to Reports")
print("="*55)

with engine.connect() as conn:
    for col_name, col_type in COLUMNS:
        try:
            conn.execute(text(f"ALTER TABLE reports ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            conn.commit()
            print(f"  ✅  Column '{col_name}' ({col_type}) — OK")
        except Exception as e:
            print(f"  ⚠️  Column '{col_name}' — SKIPPED: {e}")

print("="*55)
print("  Migration complete. Schema is now in sync.")
print("="*55 + "\n")
