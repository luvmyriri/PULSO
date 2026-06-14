-- ============================================================
-- PULSO 3NF — UNIFIED SINGLE-SESSION MIGRATION
-- Combines: pulso_3nf_migration.sql + seed_missing_roles.sql
-- Ends with explicit COMMIT so everything persists.
-- ============================================================

BEGIN;

-- 1. New Lookup Tables
CREATE TABLE IF NOT EXISTS districts (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(10)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barangays (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    district_id INTEGER      NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    zip_code    VARCHAR(10),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Seed districts
INSERT INTO districts (name, code) VALUES
    ('District 1 – South Caloocan',    'D1'),
    ('District 2 – North Caloocan',    'D2'),
    ('District 3 – Far North Caloocan','D3')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed numbered barangays (D1: 1-100, D2: 101-187)
INSERT INTO barangays (name, district_id) SELECT 'Barangay ' || n, (SELECT id FROM districts WHERE code='D1') FROM generate_series(1,100) n ON CONFLICT (name) DO NOTHING;
INSERT INTO barangays (name, district_id) SELECT 'Barangay ' || n, (SELECT id FROM districts WHERE code='D2') FROM generate_series(101,187) n ON CONFLICT (name) DO NOTHING;

-- 4. Seed named barangays (D3)
INSERT INTO barangays (name, district_id) VALUES
    ('Bagong Silang',   (SELECT id FROM districts WHERE code='D3')),
    ('Camarin',         (SELECT id FROM districts WHERE code='D3')),
    ('Dagat-Dagatan',   (SELECT id FROM districts WHERE code='D3')),
    ('Deparo',          (SELECT id FROM districts WHERE code='D3')),
    ('Grace Park East', (SELECT id FROM districts WHERE code='D3')),
    ('Grace Park West', (SELECT id FROM districts WHERE code='D3')),
    ('Kaunlaran',       (SELECT id FROM districts WHERE code='D3')),
    ('Maypajo',         (SELECT id FROM districts WHERE code='D3')),
    ('Sangandaan',      (SELECT id FROM districts WHERE code='D3')),
    ('Tala',            (SELECT id FROM districts WHERE code='D3')),
    ('Malasiqui',       (SELECT id FROM districts WHERE code='D3')),
    ('Llano',           (SELECT id FROM districts WHERE code='D3'))
ON CONFLICT (name) DO NOTHING;

-- 5. Seed missing legacy role slugs into system_roles
INSERT INTO system_roles (name, label, capabilities, access_level) VALUES
    ('resident',               'Resident / Citizen',           '{}',                                                                                                     'resident'),
    ('assistant_city_engineer','Asst. City Engineer (legacy)', '{"records":["view","create","edit","delete"],"ops":["dashboard","dispatch","timeline"],"procurement":["view","apply","approve"]}', 'executive'),
    ('assistant_engineer',     'Assistant Engineer',           '{"records":["view"],"ops":["dashboard","timeline"]}',                                                     'staff'),
    ('engineer_i',             'Engineer I',                   '{"records":["view"],"ops":["dashboard","timeline"]}',                                                     'staff'),
    ('engineer_ii',            'Engineer II',                  '{"records":["view","create"],"ops":["dashboard","timeline"],"maintenance":["view"]}',                     'staff'),
    ('field_engineer',         'Field Engineer',               '{"ops":["dashboard","timeline"],"maintenance":["view"]}',                                                 'staff'),
    ('lead_engineer',          'Lead Engineer',                '{"records":["view","create","edit"],"ops":["dashboard","dispatch","timeline"],"maintenance":["view","manage"]}', 'senior'),
    ('maintenance_foreman',    'Maintenance Foreman',          '{"ops":["dashboard"],"maintenance":["view"]}',                                                            'staff')
ON CONFLICT (name) DO NOTHING;

-- 6. Add FK columns to existing tables
ALTER TABLE users             ADD COLUMN IF NOT EXISTS role_id     INTEGER;
ALTER TABLE users             ADD COLUMN IF NOT EXISTS barangay_id INTEGER;
ALTER TABLE advisories        ADD COLUMN IF NOT EXISTS author_id   INTEGER;
ALTER TABLE project_requests  ADD COLUMN IF NOT EXISTS barangay_id INTEGER;
ALTER TABLE infrastructure_assets ADD COLUMN IF NOT EXISTS barangay_id INTEGER;
ALTER TABLE obo_inspections   ADD COLUMN IF NOT EXISTS barangay_id INTEGER;

-- 7. Back-fill FK columns
UPDATE users u       SET role_id     = sr.id FROM system_roles sr WHERE u.role = sr.name  AND u.role_id IS NULL;
UPDATE users u       SET barangay_id = b.id  FROM barangays b       WHERE TRIM(UPPER(u.barangay)) = TRIM(UPPER(b.name)) AND u.barangay_id IS NULL;
UPDATE project_requests pr SET barangay_id = b.id FROM barangays b  WHERE TRIM(UPPER(pr.barangay)) = TRIM(UPPER(b.name)) AND pr.barangay_id IS NULL;
UPDATE infrastructure_assets ia SET barangay_id = b.id FROM barangays b WHERE TRIM(UPPER(ia.barangay)) = TRIM(UPPER(b.name)) AND ia.barangay_id IS NULL;
UPDATE obo_inspections oi   SET barangay_id = b.id FROM barangays b  WHERE TRIM(UPPER(oi.barangay)) = TRIM(UPPER(b.name)) AND oi.barangay_id IS NULL;

-- 8. Add all FK constraints (with ON DELETE behaviours)

-- users
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role_id;
ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES system_roles(id) ON DELETE RESTRICT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_barangay_id;
ALTER TABLE users ADD CONSTRAINT fk_users_barangay_id FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_district_id;
ALTER TABLE users ADD CONSTRAINT fk_users_district_id FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_suspended_by;
ALTER TABLE users ADD CONSTRAINT fk_users_suspended_by FOREIGN KEY (suspended_by) REFERENCES users(id) ON DELETE SET NULL;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user_id;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- reports
ALTER TABLE reports DROP CONSTRAINT IF EXISTS fk_reports_user_id;
ALTER TABLE reports ADD CONSTRAINT fk_reports_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- advisories
ALTER TABLE advisories DROP CONSTRAINT IF EXISTS fk_advisories_author_id;
ALTER TABLE advisories ADD CONSTRAINT fk_advisories_author_id FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- work_orders
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_report_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_report_id FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_project_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_project_id FOREIGN KEY (project_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_asset_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_asset_id FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(asset_id) ON DELETE SET NULL;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_assigned_by_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_assigned_by_id FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_assigned_to_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_assigned_to_id FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_wo_district_id;
ALTER TABLE work_orders ADD CONSTRAINT fk_wo_district_id FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL;

-- work_order_approvals
ALTER TABLE work_order_approvals DROP CONSTRAINT IF EXISTS fk_woa_work_order_id;
ALTER TABLE work_order_approvals ADD CONSTRAINT fk_woa_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE;
ALTER TABLE work_order_approvals DROP CONSTRAINT IF EXISTS fk_woa_approver_id;
ALTER TABLE work_order_approvals ADD CONSTRAINT fk_woa_approver_id FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT;

-- work_order_updates
ALTER TABLE work_order_updates DROP CONSTRAINT IF EXISTS fk_wou_work_order_id;
ALTER TABLE work_order_updates ADD CONSTRAINT fk_wou_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE;
ALTER TABLE work_order_updates DROP CONSTRAINT IF EXISTS fk_wou_user_id;
ALTER TABLE work_order_updates ADD CONSTRAINT fk_wou_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_report_id;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_report_id FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_work_order_id;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_project_id;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_project_id FOREIGN KEY (project_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_procurement_id;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_procurement_id FOREIGN KEY (procurement_id) REFERENCES procurement_requests(id) ON DELETE SET NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_al_actor_id;
ALTER TABLE audit_logs ADD CONSTRAINT fk_al_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

-- process_timelines
ALTER TABLE process_timelines DROP CONSTRAINT IF EXISTS fk_pt_report_id;
ALTER TABLE process_timelines ADD CONSTRAINT fk_pt_report_id FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE process_timelines DROP CONSTRAINT IF EXISTS fk_pt_work_order_id;
ALTER TABLE process_timelines ADD CONSTRAINT fk_pt_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
ALTER TABLE process_timelines DROP CONSTRAINT IF EXISTS fk_pt_project_id;
ALTER TABLE process_timelines ADD CONSTRAINT fk_pt_project_id FOREIGN KEY (project_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE process_timelines DROP CONSTRAINT IF EXISTS fk_pt_actor_id;
ALTER TABLE process_timelines ADD CONSTRAINT fk_pt_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;

-- procurement_requests
ALTER TABLE procurement_requests DROP CONSTRAINT IF EXISTS fk_pr_work_order_id;
ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_work_order_id FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
ALTER TABLE procurement_requests DROP CONSTRAINT IF EXISTS fk_pr_project_id;
ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_project_id FOREIGN KEY (project_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE procurement_requests DROP CONSTRAINT IF EXISTS fk_pr_raised_by_id;
ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_raised_by_id FOREIGN KEY (raised_by_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE procurement_requests DROP CONSTRAINT IF EXISTS fk_pr_validated_by_id;
ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_validated_by_id FOREIGN KEY (validated_by_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE procurement_requests DROP CONSTRAINT IF EXISTS fk_pr_approved_by_id;
ALTER TABLE procurement_requests ADD CONSTRAINT fk_pr_approved_by_id FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- boq_items
ALTER TABLE boq_items DROP CONSTRAINT IF EXISTS fk_boq_procurement_request_id;
ALTER TABLE boq_items ADD CONSTRAINT fk_boq_procurement_request_id FOREIGN KEY (procurement_request_id) REFERENCES procurement_requests(id) ON DELETE CASCADE;

-- project_requests
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_created_by_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_created_by_id FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_survey_engineer_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_survey_engineer_id FOREIGN KEY (survey_engineer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_design_lead_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_design_lead_id FOREIGN KEY (design_lead_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_project_engineer_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_project_engineer_id FOREIGN KEY (project_engineer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_certificate_issued_by_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_certificate_issued_by_id FOREIGN KEY (certificate_issued_by_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_asset_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_asset_id FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(asset_id) ON DELETE SET NULL;
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS fk_proj_barangay_id;
ALTER TABLE project_requests ADD CONSTRAINT fk_proj_barangay_id FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL;

-- obo_inspections
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_assigned_inspector_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_assigned_inspector_id FOREIGN KEY (assigned_inspector_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_filed_by_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_filed_by_id FOREIGN KEY (filed_by_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_cleared_by_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_cleared_by_id FOREIGN KEY (cleared_by_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_source_report_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_source_report_id FOREIGN KEY (source_report_id) REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_engineering_clearance_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_engineering_clearance_id FOREIGN KEY (engineering_clearance_id) REFERENCES project_requests(id) ON DELETE SET NULL;
ALTER TABLE obo_inspections DROP CONSTRAINT IF EXISTS fk_obo_barangay_id;
ALTER TABLE obo_inspections ADD CONSTRAINT fk_obo_barangay_id FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL;

-- agent_locations
ALTER TABLE agent_locations DROP CONSTRAINT IF EXISTS fk_agl_agent_id;
ALTER TABLE agent_locations ADD CONSTRAINT fk_agl_agent_id FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE;

-- maintenance_history
ALTER TABLE maintenance_history DROP CONSTRAINT IF EXISTS fk_mh_asset_id;
ALTER TABLE maintenance_history ADD CONSTRAINT fk_mh_asset_id FOREIGN KEY (asset_id) REFERENCES infrastructure_assets(asset_id) ON DELETE RESTRICT;

-- infrastructure_assets
ALTER TABLE infrastructure_assets DROP CONSTRAINT IF EXISTS fk_ia_barangay_id;
ALTER TABLE infrastructure_assets ADD CONSTRAINT fk_ia_barangay_id FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL;

-- environmental_context
ALTER TABLE environmental_context DROP CONSTRAINT IF EXISTS fk_ec_barangay_id;
ALTER TABLE environmental_context ADD CONSTRAINT fk_ec_barangay_id FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE RESTRICT;

-- system_documents
ALTER TABLE system_documents DROP CONSTRAINT IF EXISTS fk_sysdoc_uploader_id;
ALTER TABLE system_documents ADD CONSTRAINT fk_sysdoc_uploader_id FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL;

-- barangays → districts (already set on CREATE TABLE; add named constraint too)
ALTER TABLE barangays DROP CONSTRAINT IF EXISTS fk_brgy_district_id;
ALTER TABLE barangays ADD CONSTRAINT fk_brgy_district_id FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT;

-- 9. Indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_users_role_id        ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_barangay_id    ON users(barangay_id);
CREATE INDEX IF NOT EXISTS idx_users_district_id    ON users(district_id);
CREATE INDEX IF NOT EXISTS idx_advisories_author_id ON advisories(author_id);
CREATE INDEX IF NOT EXISTS idx_proj_barangay_id     ON project_requests(barangay_id);
CREATE INDEX IF NOT EXISTS idx_ia_barangay_id       ON infrastructure_assets(barangay_id);
CREATE INDEX IF NOT EXISTS idx_obo_barangay_id      ON obo_inspections(barangay_id);
CREATE INDEX IF NOT EXISTS idx_wo_district_id       ON work_orders(district_id);
CREATE INDEX IF NOT EXISTS idx_ec_barangay_id       ON environmental_context(barangay_id);
CREATE INDEX IF NOT EXISTS idx_brgy_district_id     ON barangays(district_id);

-- 10. Check constraints
ALTER TABLE system_documents DROP CONSTRAINT IF EXISTS ck_sysdoc_target_model;
ALTER TABLE system_documents ADD CONSTRAINT ck_sysdoc_target_model
    CHECK (target_model IN ('WorkOrder','ProjectRequest','ProcurementRequest','OBOInspection','Report','InfrastructureAsset','MaintenanceHistory'));

ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS ck_wo_status;
ALTER TABLE work_orders ADD CONSTRAINT ck_wo_status
    CHECK (status IN ('open','assigned','in_progress','completed','cancelled'));

ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS ck_wo_priority;
ALTER TABLE work_orders ADD CONSTRAINT ck_wo_priority
    CHECK (priority IN ('low','normal','high','critical'));

-- 11. Final orphan audit
SELECT 'users_without_role_id'  AS check_name, COUNT(*) AS count FROM users WHERE role_id IS NULL AND role IS NOT NULL;
SELECT 'users_with_unknown_role' AS check_name, COUNT(*) AS count FROM users u LEFT JOIN system_roles sr ON u.role=sr.name WHERE sr.id IS NULL;
SELECT 'env_context_unlinked'   AS check_name, COUNT(*) AS count FROM environmental_context WHERE barangay_id IS NULL;
SELECT 'wo_invalid_district'    AS check_name, COUNT(*) AS count FROM work_orders wo LEFT JOIN districts d ON wo.district_id=d.id WHERE wo.district_id IS NOT NULL AND d.id IS NULL;
SELECT 'reports_user_orphan'    AS check_name, COUNT(*) AS count FROM reports r LEFT JOIN users u ON r.user_id=u.id WHERE r.user_id IS NOT NULL AND u.id IS NULL;
SELECT 'boq_orphan'             AS check_name, COUNT(*) AS count FROM boq_items b LEFT JOIN procurement_requests pr ON b.procurement_request_id=pr.id WHERE pr.id IS NULL;

-- ✅ COMMIT
COMMIT;

-- Confirm tables created
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('districts','barangays') ORDER BY 1;

-- Count live FK constraints added
SELECT COUNT(*) AS fk_constraints_added
FROM   information_schema.table_constraints
WHERE  table_schema='public' AND constraint_type='FOREIGN KEY' AND constraint_name LIKE 'fk_%';
