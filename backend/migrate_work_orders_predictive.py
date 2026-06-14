"""
migrate_work_orders_predictive.py
Adds predictive maintenance columns to the 'work_orders' table.
Also ensures the 'work_order_updates' table exists.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine, init_db

# Columns to add to work_orders
WO_COLUMNS = [
    ("category",        "VARCHAR"),
    ("estimated_cost",  "DECIMAL(12, 2) DEFAULT 0.0"),
    ("actual_cost",     "DECIMAL(12, 2) DEFAULT 0.0"),
    ("ai_plan_summary", "TEXT"),
]

print("\n" + "="*60)
print("  PULSO — DB Migration: Work Order Predictive Expansion")
print("="*60)

with engine.connect() as conn:
    # 1. Add columns to work_orders
    for col_name, col_type in WO_COLUMNS:
        try:
            # PostgreSQL syntax: ADD COLUMN IF NOT EXISTS
            conn.execute(text(f"ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            conn.commit()
            print(f"  [OK] Column 'work_orders.{col_name}'")
        except Exception as e:
            conn.rollback()
            print(f"  [SKIPPED] Column 'work_orders.{col_name}': {e}")

# 2. Ensure new tables (WorkOrderUpdate) are created
print("\n  [INFO] Initializing new tables...")
try:
    init_db()
    print("  [OK] Table initialization")
except Exception as e:
    print(f"  [ERROR] Table initialization: {e}")

print("="*60)
print("  Migration complete. Predictive infrastructure is active.")
print("="*60 + "\n")
