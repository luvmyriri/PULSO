"""Integrate normalized resident contacts after the government referral schema.

Revision ID: 18efa117cb09
Revises: 17def006ba98
Source: Finals-refractor-92526 normalized-contact migration, reconciled linearly.
"""
from alembic import op
import sqlalchemy as sa
import logging
from collections import Counter
from utils.contact_normalizer import normalize_email, normalize_phone_number

revision = '18efa117cb09'
down_revision = '17def006ba98'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('residents', sa.Column('normalized_email', sa.String(), nullable=True))
    op.add_column('residents', sa.Column('normalized_phone_number', sa.String(), nullable=True))
    connection = op.get_bind()
    residents = sa.table('residents', sa.column('id'), sa.column('email'), sa.column('phone_number'),
                        sa.column('normalized_email'), sa.column('normalized_phone_number'), sa.column('is_verified'))
    rows = list(connection.execute(sa.select(residents.c.id, residents.c.email, residents.c.phone_number, residents.c.is_verified)).mappings())
    emails = Counter(normalize_email(row['email']) for row in rows if row['is_verified'] and row['email'])
    phones = Counter(normalize_phone_number(row['phone_number']) for row in rows if row['is_verified'] and row['phone_number'])
    ambiguous = []
    for row in rows:
        email, phone = normalize_email(row['email']) or None, normalize_phone_number(row['phone_number']) or None
        # Do not choose a primary owner or edit legacy contact data automatically.
        # The shared availability guard still checks these original contact values.
        if row['is_verified'] and emails[email] > 1:
            email = None
            ambiguous.append(row['id'])
        if row['is_verified'] and phones[phone] > 1:
            phone = None
            ambiguous.append(row['id'])
        connection.execute(residents.update().where(residents.c.id == row['id']).values(normalized_email=email, normalized_phone_number=phone))
    if ambiguous:
        logging.getLogger('alembic.runtime.migration').warning('Legacy confirmed contact conflicts preserved for manual review; resident IDs: %s', sorted(set(ambiguous)))
    op.create_index('ix_residents_normalized_email', 'residents', ['normalized_email'])
    op.create_index('ix_residents_normalized_phone_number', 'residents', ['normalized_phone_number'])
    op.create_index('uq_residents_confirmed_norm_email', 'residents', ['normalized_email'], unique=True,
                    postgresql_where=sa.text('is_verified = TRUE AND normalized_email IS NOT NULL'))
    op.create_index('uq_residents_confirmed_norm_phone', 'residents', ['normalized_phone_number'], unique=True,
                    postgresql_where=sa.text('is_verified = TRUE AND normalized_phone_number IS NOT NULL'))


def downgrade():
    for name in ('uq_residents_confirmed_norm_phone', 'uq_residents_confirmed_norm_email',
                 'ix_residents_normalized_phone_number', 'ix_residents_normalized_email'):
        op.drop_index(name, table_name='residents')
    op.drop_column('residents', 'normalized_phone_number')
    op.drop_column('residents', 'normalized_email')
