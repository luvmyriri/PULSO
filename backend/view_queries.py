"""
Database Views Module - Optimized queries using materialized views
For high-performance data retrieval in PULSO system
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Optional, List, Any


class ViewQueries:
    """Centralized view queries for optimized data access."""

    @staticmethod
    def get_report_with_reporter(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        status_filter: Optional[str] = None
    ) -> List[Any]:
        """Get paginated reports with reporter details."""
        query = text("""
            SELECT 
                id, ticket_id, category, description,
                location_lat, location_lng, location_string,
                status, image_url, resolution_image_url,
                ai_category, ai_urgency, ai_summary, ai_reasoning,
                severity_score, cluster_id, created_at, updated_at,
                reporter_id, reporter_name, reporter_email,
                reporter_barangay, reporter_trust_score
            FROM v_report_with_reporter
        """)
        
        params = {"skip": skip, "limit": limit}
        if status_filter:
            query = text(f"""
                SELECT 
                    id, ticket_id, category, description,
                    location_lat, location_lng, location_string,
                    status, image_url, resolution_image_url,
                    ai_category, ai_urgency, ai_summary, ai_reasoning,
                    severity_score, cluster_id, created_at, updated_at,
                    reporter_id, reporter_name, reporter_email,
                    reporter_barangay, reporter_trust_score
                FROM v_report_with_reporter
                WHERE status = :status_filter
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :skip
            """)
            params["status_filter"] = status_filter
            return db.execute(query, params).fetchall()
        
        query = text(f"{query} ORDER BY created_at DESC LIMIT :limit OFFSET :skip")
        return db.execute(query, params).fetchall()

    @staticmethod
    def get_report_stats(db: Session) -> dict:
        """Get aggregated report statistics in single query."""
        result = db.execute(text("""
            SELECT status, COUNT(*) as count 
            FROM reports 
            WHERE status != 'cancelled' 
            GROUP BY status
        """)).fetchall()
        
        stats = {row.status: row.count for row in result}
        total = db.execute(text("""
            SELECT COUNT(*) as total FROM reports WHERE status != 'cancelled'
        """)).fetchone()
        stats["total"] = total.total if total else 0
        return stats

    @staticmethod
    def get_work_order_full(
        db: Session,
        skip: int = 0,
        limit: int = 50
    ) -> List[Any]:
        """Get paginated work orders with full details."""
        return db.execute(text("""
            SELECT 
                id, wo_number, title, description, wo_type, status, priority,
                scheduled_date, completed_date, notes, created_at, updated_at,
                report_id, project_id, report_ticket_id,
                assigned_by_name, assigned_to_name, assigned_to_phone
            FROM v_work_order_full
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """), {"skip": skip, "limit": limit}).fetchall()

    @staticmethod
    def get_notification_with_user(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[Any]:
        """Get notifications with user details."""
        return db.execute(text("""
            SELECT 
                id, user_id, user_name, user_email,
                title, message, is_read, is_hidden, created_at
            FROM v_notification_with_user
            WHERE user_id = :user_id AND is_hidden = false
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :skip
        """), {"user_id": user_id, "skip": skip, "limit": limit}).fetchall()

    @staticmethod
    def get_user_activity(
        db: Session,
        sort_by: str = "trust_score",
        order: str = "DESC",
        skip: int = 0,
        limit: int = 50
    ) -> List[Any]:
        """Get user activity summary."""
        allowed_cols = ["trust_score", "total_reports", "last_report_date"]
        col = sort_by if sort_by in allowed_cols else "trust_score"
        dir_order = "DESC" if order.upper() == "DESC" else "ASC"
        
        return db.execute(text(f"""
            SELECT * FROM mv_user_activity
            ORDER BY {col} {dir_order}
            LIMIT :limit OFFSET :skip
        """), {"skip": skip, "limit": limit}).fetchall()

    @staticmethod
    def get_daily_report_stats(
        db: Session,
        days: int = 30
    ) -> List[Any]:
        """Get daily report statistics for trend analysis."""
        return db.execute(text("""
            SELECT * FROM mv_daily_report_stats
            WHERE report_date >= CURRENT_DATE - INTERVAL ':days days'
            ORDER BY report_date DESC
        """), {"days": days}).fetchall()

    @staticmethod
    def refresh_materialized_views(db: Session) -> dict:
        """Refresh all materialized views."""
        views = ["mv_daily_report_stats", "mv_user_activity"]
        results = {}
        
        for view in views:
            try:
                db.execute(text(f"REFRESH MATERIALIZED VIEW {view}"))
                results[view] = "success"
            except Exception as e:
                results[view] = f"error: {str(e)}"
        
        db.commit()
        return results


view_queries = ViewQueries()
