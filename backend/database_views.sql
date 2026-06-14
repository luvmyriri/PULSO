-- ============================================================
-- Views and Optimizations for PULSO Database
-- Designed for high-read, multi-user scenarios
-- Refactored for Segregated Architecture (Residents & Officials)
-- ============================================================

-- Drop existing views if they exist (PostgreSQL syntax)
DROP VIEW IF EXISTS v_report_with_reporter;
DROP VIEW IF EXISTS v_work_order_full;
DROP VIEW IF EXISTS v_notification_with_user;
DROP VIEW IF EXISTS v_report_stats_by_status;
DROP VIEW IF EXISTS v_procurement_with_approvers;
DROP VIEW IF EXISTS v_project_with_engineers;

-- ============================================================
-- View: v_report_with_reporter
-- Purpose: Single query to get reports with full resident details
-- ============================================================
CREATE VIEW v_report_with_reporter AS
SELECT 
    r.id,
    r.ticket_id,
    r.category,
    r.description,
    r.location_lat,
    r.location_lng,
    r.location_string,
    r.status,
    r.image_url,
    r.resolution_image_url,
    r.ai_category,
    r.ai_urgency,
    r.ai_summary,
    r.ai_reasoning,
    r.severity_score,
    r.cluster_id,
    r.created_at,
    r.updated_at,
    res.id AS reporter_id,
    res.full_name AS reporter_name,
    res.email AS reporter_email,
    res.barangay AS reporter_barangay,
    res.trust_score AS reporter_trust_score
FROM reports r
INNER JOIN residents res ON r.resident_id = res.id;

-- ============================================================
-- View: v_work_order_full
-- Purpose: Work orders with assignee/reporter details (Officials)
-- ============================================================
CREATE VIEW v_work_order_full AS
SELECT 
    wo.id,
    wo.wo_number,
    wo.title,
    wo.description,
    wo.wo_type,
    wo.status,
    wo.priority,
    wo.scheduled_date,
    wo.completed_date,
    wo.notes,
    wo.created_at,
    wo.updated_at,
    wo.report_id,
    wo.project_id,
    r.ticket_id AS report_ticket_id,
    ab.full_name AS assigned_by_name,
    at.full_name AS assigned_to_name,
    at.phone_number AS assigned_to_phone
FROM work_orders wo
LEFT JOIN reports r ON wo.report_id = r.id
LEFT JOIN officials ab ON wo.assigned_by_id = ab.id
LEFT JOIN officials at ON wo.assigned_to_id = at.id;

-- ============================================================
-- View: v_notification_with_user
-- Purpose: Notifications with user details (Resident OR Official)
-- ============================================================
CREATE VIEW v_notification_with_user AS
SELECT 
    n.id,
    COALESCE(n.resident_id, n.official_id) AS user_id,
    CASE 
        WHEN n.resident_id IS NOT NULL THEN 'Resident'
        ELSE 'Official'
    END AS user_type,
    COALESCE(res.full_name, off.full_name) AS user_name,
    COALESCE(res.email, off.email) AS user_email,
    n.title,
    n.message,
    n.is_read,
    n.is_hidden,
    n.created_at
FROM notifications n
LEFT JOIN residents res ON n.resident_id = res.id
LEFT JOIN officials off ON n.official_id = off.id;

-- ============================================================
-- View: v_report_stats_by_status
-- ============================================================
CREATE VIEW v_report_stats_by_status AS
SELECT 
    status,
    COUNT(*) AS count
FROM reports
WHERE status != 'cancelled'
GROUP BY status;

-- ============================================================
-- View: v_procurement_with_approvers
-- ============================================================
CREATE VIEW v_procurement_with_approvers AS
SELECT 
    pr.id,
    pr.pr_number,
    pr.title,
    pr.purpose,
    pr.status,
    pr.rejection_reason,
    pr.created_at,
    rb.full_name AS raised_by_name,
    vb.full_name AS validated_by_name,
    ab.full_name AS approved_by_name,
    COUNT(bi.id) AS item_count,
    COALESCE(SUM(bi.total_cost), 0) AS total_cost
FROM procurement_requests pr
LEFT JOIN officials rb ON pr.raised_by_id = rb.id
LEFT JOIN officials vb ON pr.validated_by_id = vb.id
LEFT JOIN officials ab ON pr.approved_by_id = ab.id
LEFT JOIN boq_items bi ON pr.id = bi.procurement_request_id
GROUP BY pr.id, pr.pr_number, pr.title, pr.purpose, pr.status, pr.rejection_reason, pr.created_at, 
         rb.full_name, vb.full_name, ab.full_name;

-- ============================================================
-- View: v_project_with_engineers
-- ============================================================
CREATE VIEW v_project_with_engineers AS
SELECT 
    pr.id,
    pr.proj_number,
    pr.title,
    pr.description,
    pr.status,
    pr.current_phase,
    pr.location_string,
    pr.barangay,
    pr.created_at,
    cr.full_name AS created_by_name,
    se.full_name AS survey_engineer_name,
    dl.full_name AS design_lead_name,
    pe.full_name AS project_engineer_name,
    pr.certificate_issued
FROM project_requests pr
LEFT JOIN officials cr ON pr.created_by_id = cr.id
LEFT JOIN officials se ON pr.survey_engineer_id = se.id
LEFT JOIN officials dl ON pr.design_lead_id = dl.id
LEFT JOIN officials pe ON pr.project_engineer_id = pe.id;

-- ============================================================
-- MATERIALIZED VIEW: mv_daily_report_stats
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_daily_report_stats;
CREATE MATERIALIZED VIEW mv_daily_report_stats AS
SELECT 
    DATE(created_at) AS report_date,
    status,
    COUNT(*) AS count
FROM reports
GROUP BY DATE(created_at), status;

CREATE INDEX idx_mv_daily_date ON mv_daily_report_stats(report_date);

-- ============================================================
-- MATERIALIZED VIEW: mv_resident_activity (Formerly mv_user_activity)
-- ============================================================
DROP MATERIALIZED VIEW IF EXISTS mv_resident_activity;
CREATE MATERIALIZED VIEW mv_resident_activity AS
SELECT 
    res.id AS resident_id,
    res.email,
    res.full_name,
    res.barangay,
    res.trust_score,
    COUNT(r.id) AS total_reports,
    SUM(CASE WHEN r.status = 'resolved' THEN 1 ELSE 0 END) AS resolved_reports,
    SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_reports,
    MAX(r.created_at) AS last_report_date
FROM residents res
LEFT JOIN reports r ON res.id = r.resident_id
GROUP BY res.id, res.email, res.full_name, res.barangay, res.trust_score;

CREATE INDEX idx_mv_res_activity_trust ON mv_resident_activity(trust_score DESC);

