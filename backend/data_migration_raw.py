"""Seed data snapshot

Revision ID: 2nd_data_seed
Revises: 
Create Date: 2026-03-13T00:28:21.822172

"""
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
    # Data for advisories
    t_advisories = table('advisories',
        column('id'),
        column('advisory_id'),
        column('department'),
        column('title'),
        column('description'),
        column('priority'),
        column('category'),
        column('has_image'),
        column('image_url'),
        column('stats_views'),
        column('stats_affected'),
        column('created_at'),
    )
    op.bulk_insert(t_advisories, [
        {'id': 1, 'advisory_id': 'PUB-1895', 'department': 'Meralco / City Engineering', 'title': 'Scheduled Power Interruption', 'description': 'Due to grid maintenance, power will be out in parts of Camarin and Bagong Silang tomorrow from 9 AM to 4 PM.', 'priority': 'high', 'category': 'Utilities', 'has_image': False, 'image_url': None, 'stats_views': 0, 'stats_affected': 'Zones 1-4', 'created_at': '2026-02-27T05:34:34.539502+08:00'},
        {'id': 2, 'advisory_id': 'PUB-1256', 'department': 'DPWH', 'title': 'Road Repair Alert: Quirino Highway', 'description': 'Partial lane closure near Novaliches-Caloocan boundary. Expect delays.', 'priority': 'medium', 'category': 'Public Works', 'has_image': False, 'image_url': None, 'stats_views': 0, 'stats_affected': 'All Commuters', 'created_at': '2026-02-27T05:34:34.539502+08:00'},
        {'id': 3, 'advisory_id': 'PUB-2051', 'department': 'DOH / City Health', 'title': 'Mobile Dental Mission', 'description': 'Join us at the Brgy 178 Covered Court this Friday for free check-ups and medical supplies distribution.', 'priority': 'low', 'category': 'Advisory', 'has_image': False, 'image_url': None, 'stats_views': 0, 'stats_affected': 'District residents', 'created_at': '2026-02-27T05:34:34.539502+08:00'},
    ])

    # Data for users
    t_users = table('users',
        column('id'),
        column('full_name'),
        column('email'),
        column('password_hash'),
        column('role'),
        column('address'),
        column('barangay'),
        column('phone_number'),
        column('trust_score'),
        column('created_at'),
    )
    op.bulk_insert(t_users, [
        {'id': 1, 'full_name': 'Admin Manager', 'email': 'admin@pulso.gov.ph', 'password_hash': '$2b$12$bhZd9DkKl4vmqs0XJkUduuvpYoP.bkWduD.dEGnZSfQGDpb3f/mD.', 'role': 'manager', 'address': 'City Hall, Caloocan', 'barangay': 'Grace Park', 'phone_number': '09123456789', 'trust_score': 100, 'created_at': '2026-02-27T05:34:34.532535+08:00'},
        {'id': 2, 'full_name': 'Dispatcher One', 'email': 'dispatcher@pulso.gov.ph', 'password_hash': '$2b$12$bhZd9DkKl4vmqs0XJkUduuvpYoP.bkWduD.dEGnZSfQGDpb3f/mD.', 'role': 'dispatcher', 'address': 'North Command Center', 'barangay': 'Bagong Silang', 'phone_number': '09223456789', 'trust_score': 100, 'created_at': '2026-02-27T05:34:34.532535+08:00'},
        {'id': 3, 'full_name': 'Juan Dela Cruz', 'email': 'resident@gmail.com', 'password_hash': '$2b$12$bhZd9DkKl4vmqs0XJkUduuvpYoP.bkWduD.dEGnZSfQGDpb3f/mD.', 'role': 'resident', 'address': 'Phase 1, Block 2, Lot 3', 'barangay': 'Brgy 178', 'phone_number': '09333456789', 'trust_score': 100, 'created_at': '2026-02-27T05:34:34.532535+08:00'},
    ])

    # Data for notifications
    t_notifications = table('notifications',
        column('id'),
        column('user_id'),
        column('title'),
        column('message'),
        column('is_read'),
        column('created_at'),
    )
    op.bulk_insert(t_notifications, [
        {'id': 1, 'user_id': 3, 'title': 'Report Resolved', 'message': 'Your sanitation report regarding garbage collection has been resolved. Thank you!', 'is_read': False, 'created_at': '2026-02-27T05:34:34.553572+08:00'},
        {'id': 2, 'user_id': 3, 'title': 'Team Dispatched', 'message': 'A team has been dispatched to check the electrical hazard you reported.', 'is_read': True, 'created_at': '2026-02-27T05:34:34.553572+08:00'},
        {'id': 3, 'user_id': 3, 'title': 'Report Status Update', 'message': 'Your report RPT-[1] has been verified by the Command Center and is pending engineering approval.', 'is_read': False, 'created_at': '2026-02-27T10:24:07.802843+08:00'},
    ])

    # Data for reports
    t_reports = table('reports',
        column('id'),
        column('ticket_id'),
        column('user_id'),
        column('category'),
        column('description'),
        column('location_lat'),
        column('location_lng'),
        column('location_string'),
        column('status'),
        column('image_url'),
        column('ai_category'),
        column('ai_urgency'),
        column('ai_summary'),
        column('created_at'),
    )
    op.bulk_insert(t_reports, [
        {'id': 2, 'ticket_id': 'RPT-1583', 'user_id': 3, 'category': 'Safety', 'description': 'Exposed high-voltage wires hanging low after a truck hit the post. Near Brgy 174 gym.', 'location_lat': 14.761, 'location_lng': 121.0505, 'location_string': 'Caloocan North, 186', 'status': 'dispatched', 'image_url': None, 'ai_category': None, 'ai_urgency': None, 'ai_summary': None, 'created_at': '2026-02-27T05:34:34.547019+08:00'},
        {'id': 3, 'ticket_id': 'RPT-3086', 'user_id': 3, 'category': 'Sanitation', 'description': 'Uncollected garbage piling up in front of the elementary school for over a week.', 'location_lat': 14.7588, 'location_lng': 121.047, 'location_string': 'Caloocan North, 170', 'status': 'resolved', 'image_url': None, 'ai_category': None, 'ai_urgency': None, 'ai_summary': None, 'created_at': '2026-02-27T05:34:34.547019+08:00'},
        {'id': 4, 'ticket_id': 'RPT-1070', 'user_id': 3, 'category': 'Safety', 'description': 'Pothole is getting too deep on the main road, motorcycles are slipping.', 'location_lat': 14.753, 'location_lng': 121.044, 'location_string': 'Caloocan North, 184', 'status': 'pending', 'image_url': None, 'ai_category': None, 'ai_urgency': None, 'ai_summary': None, 'created_at': '2026-02-27T05:34:34.547019+08:00'},
        {'id': 1, 'ticket_id': 'RPT-2327', 'user_id': 3, 'category': 'Infrastructure', 'description': 'Burst water pipe near the main intersection of Camarin Road. Water is flooding the street.', 'location_lat': 14.7552, 'location_lng': 121.0421, 'location_string': 'Caloocan North, 181', 'status': 'pending_approval', 'image_url': None, 'ai_category': None, 'ai_urgency': None, 'ai_summary': None, 'created_at': '2026-02-27T05:34:34.547019+08:00'},
    ])

def downgrade():
    op.execute('DELETE FROM reports')
    op.execute('DELETE FROM notifications')
    op.execute('DELETE FROM users')
    op.execute('DELETE FROM advisories')
