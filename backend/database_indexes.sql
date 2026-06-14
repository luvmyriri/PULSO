-- Performance Indexes for PULSO Database
-- Run this after creating tables and views

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_cluster_id ON reports(cluster_id);
CREATE INDEX IF NOT EXISTS idx_reports_ai_category ON reports(ai_category);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(location_lat, location_lng);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_barangay ON users(barangay);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON users(trust_score);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Work Orders indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_report_id ON work_orders(report_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to_id ON work_orders(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Audit Logs indexes (high write volume)
CREATE INDEX IF NOT EXISTS idx_audit_logs_trigger_type ON audit_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Process Timeline indexes
CREATE INDEX IF NOT EXISTS idx_process_timelines_report_id ON process_timelines(report_id);
CREATE INDEX IF NOT EXISTS idx_process_timelines_created_at ON process_timelines(created_at DESC);

-- Procurement indexes
CREATE INDEX IF NOT EXISTS idx_procurement_requests_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_raised_by ON procurement_requests(raised_by_id);

-- BoQ indexes
CREATE INDEX IF NOT EXISTS idx_boq_procurement_id ON boq_items(procurement_request_id);

-- Project Requests indexes
CREATE INDEX IF NOT EXISTS idx_project_requests_status ON project_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_requests_barangay ON project_requests(barangay);

-- Agent Location indexes (real-time updates)
CREATE INDEX IF NOT EXISTS idx_agent_locations_agent_id ON agent_locations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_locations_updated_at ON agent_locations(updated_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON reports(user_id, status);
