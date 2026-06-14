import psycopg2
import sys
import os
sys.path.append(os.getcwd())
from database import DATABASE_URL

def sync_data():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False # Use transaction
        cur = conn.cursor()
        
        print("--- Fetching all legacy users ---")
        cur.execute("SELECT * FROM users")
        colnames = [desc[0] for desc in cur.description]
        legacy_users = [dict(zip(colnames, row)) for row in cur.fetchall()]
        print(f"Found {len(legacy_users)} legacy users.")
        
        id_mapping = {} # old_id -> (table, new_id)
        
        # Resident classification: strictly 'resident' role
        # Official classification: everything else
        
        for u in legacy_users:
            old_id = u['id']
            email = u['email']
            role = u.get('role', 'resident')
            
            # Determine target table
            if role == 'resident':
                target_table = 'residents'
                # Columns for residents
                cols = ['full_name', 'email', 'password_hash', 'address', 'barangay_id', 'district_id', 'phone_number', 'trust_score', 'verification_code', 'is_verified', 'kyc_level', 'last_kyc_verification', 'is_active', 'created_at']
            else:
                target_table = 'officials'
                # Columns for officials
                cols = ['full_name', 'email', 'password_hash', 'address', 'barangay', 'phone_number', 'role_id', 'display_name', 'account_type', 'is_active', 'is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by', 'created_at', 'role', 'primary_jurisdiction']
            
            # Check if email already exists in target table
            cur.execute(f"SELECT id FROM {target_table} WHERE email = %s", (email,))
            existing = cur.fetchone()
            
            if existing:
                new_id = existing[0]
                print(f"User {email} already in {target_table} as ID {new_id}")
            else:
                # Insert
                val_dict = {c: u.get(c) for c in cols if c in u}
                # Handle specific mappings if names differ
                # In officials, role is a column. In residents, it is a property (not in DB).
                
                insert_cols = list(val_dict.keys())
                placeholders = [f"%({c})s" for c in insert_cols]
                
                query = f"INSERT INTO {target_table} ({', '.join(insert_cols)}) VALUES ({', '.join(placeholders)}) RETURNING id"
                cur.execute(query, val_dict)
                new_id = cur.fetchone()[0]
                print(f"Migrated {email} to {target_table} with new ID {new_id}")
            
            id_mapping[old_id] = (target_table, new_id)
            
        print("\n--- Updating references in dependent tables ---")
        
        # Reference mapping: table -> {column: expected_target_table}
        # Note: If expected_target is None, it could be either. 
        # But we know from id_mapping which one it is.
        
        refs = {
            "dispatch_crews": ["user_id"],
            "reports": ["resident_id"], # Note: in reports, the old user_id should map to resident_id
            "notifications": ["resident_id", "official_id"],
            "procurement_requests": ["raised_by_id", "validated_by_id", "approved_by_id"],
            "project_requests": ["created_by_id", "survey_engineer_id", "design_lead_id", "project_engineer_id", "certificate_issued_by_id"],
            "obo_inspections": ["assigned_inspector_id", "filed_by_id", "cleared_by_id"],
            "agent_locations": ["agent_id"],
            "system_documents": ["uploader_id"],
            "work_orders": ["assigned_by_id", "assigned_to_id"],
            "work_order_approvals": ["approver_id"],
            "work_order_updates": ["user_id"],
            "process_timelines": ["actor_id"]
        }
        
        # We also need to handle the case where the table still has 'user_id' but we want to move it to 'resident_id' or 'official_id'
        # For now, let's see which columns actually exist in these tables.
        
        for table, columns in refs.items():
            # Check existing columns in the table
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'")
            actual_cols = [r[0] for r in cur.fetchall()]
            
            # Special case for tables that were already partially migrated
            if table == "reports" and "resident_id" in actual_cols:
                # Need to check if user_id still exists to migrate from
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='user_id'")
                if cur.fetchone():
                    cur.execute(f"SELECT id, user_id FROM {table} WHERE user_id IS NOT NULL AND resident_id IS NULL")
                    rows = cur.fetchall()
                    for r_id, u_id in rows:
                        if u_id in id_mapping:
                            target_tbl, target_id = id_mapping[u_id]
                            # Reports should point to residents
                            if target_tbl == 'residents':
                                cur.execute(f"UPDATE {table} SET resident_id = %s WHERE id = %s", (target_id, r_id))
            
            elif table == "notifications":
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='user_id'")
                if cur.fetchone():
                    cur.execute(f"SELECT id, user_id FROM {table} WHERE user_id IS NOT NULL")
                    rows = cur.fetchall()
                    for n_id, u_id in rows:
                        if u_id in id_mapping:
                            target_tbl, target_id = id_mapping[u_id]
                            col = "resident_id" if target_tbl == "residents" else "official_id"
                            if col in actual_cols:
                                cur.execute(f"UPDATE {table} SET {col} = %s WHERE id = %s", (target_id, n_id))

            else:
                # Generic update for other tables where we might just be updating the value in the same column
                # OR we need to know if we should change the FK target later.
                for col in columns:
                    if col in actual_cols:
                        # For these tables, they mostly point to officials
                        # Let's find rows still pointing to old user IDs
                        cur.execute(f"SELECT id, {col} FROM {table} WHERE {col} IS NOT NULL")
                        rows = cur.fetchall()
                        for row_id, u_id in rows:
                            if u_id in id_mapping:
                                target_tbl, target_id = id_mapping[u_id]
                                # Note: This doesn't change the FK TARGET table yet, 
                                # just the value. If the value changed (due to mapping), we update it.
                                if target_id != u_id:
                                    cur.execute(f"UPDATE {table} SET {col} = %s WHERE id = %s", (target_id, row_id))

        conn.commit()
        print("\n--- Synchronization Complete ---")
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    sync_data()
