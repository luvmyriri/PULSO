-- Final commit script: validate zero orphans, then commit the 3NF migration

-- Final orphan check
SELECT 'users_without_role_id' AS check_name, COUNT(*) AS orphan_count
FROM   users WHERE role_id IS NULL AND role IS NOT NULL;

SELECT 'users_with_unknown_role' AS check_name, COUNT(*) AS orphan_count
FROM   users u LEFT JOIN system_roles sr ON u.role = sr.name WHERE sr.id IS NULL;

SELECT 'env_context_unlinked' AS check_name, COUNT(*) AS orphan_count
FROM   environmental_context WHERE barangay_id IS NULL;

SELECT 'wo_invalid_district' AS check_name, COUNT(*) AS orphan_count
FROM   work_orders wo LEFT JOIN districts d ON wo.district_id = d.id
WHERE  wo.district_id IS NOT NULL AND d.id IS NULL;

-- Commit the open transaction from pulso_3nf_migration.sql
COMMIT;

-- Confirm new tables exist post-commit
SELECT table_name FROM information_schema.tables
WHERE  table_schema = 'public' AND table_name IN ('districts','barangays')
ORDER  BY table_name;

-- Confirm FK constraints are live
SELECT tc.table_name AS tbl, tc.constraint_name, ccu.table_name AS ref_table
FROM   information_schema.table_constraints        tc
JOIN   information_schema.referential_constraints  rc USING (constraint_name)
JOIN   information_schema.constraint_column_usage  ccu ON ccu.constraint_name = rc.unique_constraint_name
WHERE  tc.table_schema = 'public'
  AND  tc.constraint_name LIKE 'fk_%'
ORDER  BY tc.table_name, tc.constraint_name
LIMIT  40;
