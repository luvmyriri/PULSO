import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from database import SQLALCHEMY_DATABASE_URL
import datetime

def export_data_to_alembic():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    # Exclude alembic_version
    tables = [t for t in tables if t != 'alembic_version']
    
    data_map = {}
    for table in tables:
        result = session.execute(text(f"SELECT * FROM {table}"))
        columns = result.keys()
        rows = [dict(zip(columns, row)) for row in result]
        
        # Convert datetimes to strings for the migration file
        for row in rows:
            for k, v in row.items():
                if isinstance(v, (datetime.datetime, datetime.date)):
                    row[k] = v.isoformat()
        
        data_map[table] = rows
    
    # Generate migration content
    migration_content = f"""\"\"\"Seed data snapshot

Revision ID: 2nd_data_seed
Revises: 
Create Date: {datetime.datetime.now().isoformat()}

\"\"\"
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
import datetime

# revision identifiers, used by Alembic.
revision = 'data_seed_snapshot'
down_revision = None # Will fill this in
branch_labels = None
depends_on = None

def upgrade():
"""
    
    for table_name, rows in data_map.items():
        if not rows:
            continue
            
        cols = rows[0].keys()
        migration_content += f"    # Data for {table_name}\n"
        migration_content += f"    t_{table_name} = table('{table_name}',\n"
        for col in cols:
            migration_content += f"        column('{col}'),\n"
        migration_content += "    )\n"
        
        # Prepare rows for op.bulk_insert
        # Need to handle datetime strings back to datetime objects in the migration
        migration_content += f"    op.bulk_insert(t_{table_name}, [\n"
        for row in rows:
            migration_content += f"        {row},\n"
        migration_content += "    ])\n\n"
        
    migration_content += "def downgrade():\n"
    for table_name in reversed(list(data_map.keys())):
        migration_content += f"    op.execute('DELETE FROM {table_name}')\n"

    # Write to a temporary file
    with open('data_migration_raw.py', 'w') as f:
        f.write(migration_content)
    
    print("Generated data_migration_raw.py")

if __name__ == "__main__":
    export_data_to_alembic()
