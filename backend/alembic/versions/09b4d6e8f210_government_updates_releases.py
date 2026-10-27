"""Versioned update releases, sourced disclosure and notification deep links.

Revision ID: 09b4d6e8f210
Revises: f3a6d8c1b250
"""
from datetime import date, datetime
from alembic import op
import sqlalchemy as sa

revision = '09b4d6e8f210'
down_revision = 'f3a6d8c1b250'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table('budget_disclosures'):
        op.create_table('budget_disclosures',
            sa.Column('id', sa.Integer, primary_key=True), sa.Column('disclosure_id', sa.String, unique=True, nullable=False),
            sa.Column('announcement_id', sa.Integer, sa.ForeignKey('announcements.id')), sa.Column('project_id', sa.Integer, sa.ForeignKey('project_requests.id')),
            sa.Column('work_order_id', sa.Integer, sa.ForeignKey('work_orders.id')),
            sa.Column('version', sa.Integer, nullable=False, server_default='1'), sa.Column('source_key', sa.String(64), index=True),
            sa.Column('publication_format', sa.String, nullable=False, server_default='announcement'),
            sa.Column('amount', sa.Numeric(18, 2)), sa.Column('currency', sa.String, nullable=False, server_default='PHP'),
            sa.Column('amount_type', sa.String, nullable=False, server_default='not_disclosed'),
            sa.Column('source_label', sa.String), sa.Column('source_url', sa.String), sa.Column('official_bidding_url', sa.String),
            sa.Column('source_date', sa.Date), sa.Column('fiscal_period', sa.String), sa.Column('issuing_office', sa.String), sa.Column('scope_caveat', sa.Text),
            sa.Column('review_state', sa.String, nullable=False, server_default='draft'),
            sa.Column('entered_by_id', sa.Integer, sa.ForeignKey('officials.id')), sa.Column('reviewed_by_id', sa.Integer, sa.ForeignKey('officials.id')),
            sa.Column('reviewed_at', sa.DateTime(timezone=True)), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    else:
        cols = {c['name']: c for c in sa.inspect(bind).get_columns('budget_disclosures')}
        if 'source_key' not in cols: op.add_column('budget_disclosures', sa.Column('source_key', sa.String(64), index=True))
        if not isinstance(cols['amount']['type'], sa.Numeric):
            op.alter_column('budget_disclosures', 'amount', type_=sa.Numeric(18, 2), postgresql_using="CASE WHEN amount::text IN ('NaN', 'Infinity', '-Infinity') THEN NULL ELSE round(amount::numeric, 2) END")
    if not inspector.has_table('announcement_report_associations'):
        op.create_table('announcement_report_associations',
            sa.Column('id', sa.Integer, primary_key=True), sa.Column('announcement_id', sa.Integer, sa.ForeignKey('announcements.id'), nullable=False, index=True),
            sa.Column('report_id', sa.Integer, sa.ForeignKey('reports.id'), nullable=False, index=True),
            sa.Column('association_type', sa.String, nullable=False, server_default='candidate'), sa.Column('basis_reason', sa.Text),
            sa.Column('created_by_id', sa.Integer, sa.ForeignKey('officials.id')), sa.Column('reviewed_by_id', sa.Integer, sa.ForeignKey('officials.id')),
            sa.Column('reviewed_at', sa.DateTime(timezone=True)), sa.Column('revoked_by_id', sa.Integer, sa.ForeignKey('officials.id')),
            sa.Column('revoked_at', sa.DateTime(timezone=True)), sa.Column('revoked_reason', sa.Text), sa.Column('notified_at', sa.DateTime(timezone=True)),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint('announcement_id', 'report_id', name='uq_announcement_report_assoc'))
    if not inspector.has_table('announcement_revisions'):
        op.create_table('announcement_revisions', sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('announcement_id', sa.Integer, sa.ForeignKey('announcements.id'), nullable=False, index=True), sa.Column('version', sa.Integer, nullable=False),
            sa.Column('snapshot', sa.JSON, nullable=False), sa.Column('released_by_id', sa.Integer, sa.ForeignKey('officials.id')),
            sa.Column('released_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint('announcement_id', 'version', name='uq_announcement_revision'))
    cols = {c['name'] for c in sa.inspect(bind).get_columns('announcements')}
    additions = [sa.Column('content_version', sa.Integer, nullable=False, server_default='1'), sa.Column('approved_version', sa.Integer),
        sa.Column('published_version', sa.Integer), sa.Column('publication_format', sa.String(20), nullable=False, server_default='announcement'), sa.Column('disclosure_ref_id', sa.Integer)]
    for col in additions:
        if col.name not in cols: op.add_column('announcements', col)
    fks = sa.inspect(bind).get_foreign_keys('announcements')
    if not any('disclosure_ref_id' in f['constrained_columns'] for f in fks):
        op.create_foreign_key('fk_announcement_disclosure_ref', 'announcements', 'budget_disclosures', ['disclosure_ref_id'], ['id'])
    if 'target_url' not in {c['name'] for c in sa.inspect(bind).get_columns('notifications')}:
        op.add_column('notifications', sa.Column('target_url', sa.String))

    # Older approvals do not prove approval of a versioned disclosure/association.
    bind.execute(sa.text("UPDATE announcements SET status='in_review', approved_by_id=NULL, approved_at=NULL WHERE status IN ('approved','scheduled') AND approved_version IS NULL"))
    bind.execute(sa.text("UPDATE announcements SET publication_format=CASE WHEN category IN ('advisory','service_interruption') THEN 'advisory' WHEN category IN ('news_release','progress_update','work_completed') THEN 'news' ELSE 'announcement' END WHERE published_version IS NULL"))
    rows = bind.execute(sa.text("SELECT * FROM announcements WHERE status='published' AND published_version IS NULL")).mappings().all()
    keys = ('id', 'announcement_id', 'title_en', 'title_fil', 'content_en', 'content_fil', 'category', 'publication_format', 'priority', 'target_barangays', 'published_at', 'expires_at', 'image_url', 'content_version')
    released = sa.table('announcement_revisions', sa.column('announcement_id'), sa.column('version'), sa.column('snapshot', sa.JSON), sa.column('released_by_id'))
    for row in rows:
        snapshot = {k: row[k].isoformat() if isinstance(row[k], (date, datetime)) else row[k] for k in keys}
        snapshot.update(status='published', budget_disclosure=None, report_associations=[], corrections=[])
        bind.execute(released.insert().values(announcement_id=row['id'], version=row['content_version'], snapshot=snapshot, released_by_id=row['approved_by_id']))
        bind.execute(sa.text('UPDATE announcements SET published_version=:v WHERE id=:id'), {'v': row['content_version'], 'id': row['id']})


def downgrade():
    # Release history is civic evidence: an automatic destructive downgrade would
    # discard it. Restore a reviewed backup or write an explicit retention-safe
    # migration instead of silently dropping published revisions.
    raise RuntimeError('This migration retains public release history. Use a reviewed backup/forward migration to roll back.')
