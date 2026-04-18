"""Add sequence tracker and codes

Revision ID: c1e19d2a1387
Revises: b3f1a2c8d4e7
Create Date: 2026-04-18 10:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1e19d2a1387'
down_revision = 'b3f1a2c8d4e7'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create sequence_trackers table
    op.create_table(
        'sequence_trackers',
        sa.Column('role_prefix', sa.String(length=1), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('last_value', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('role_prefix', 'year')
    )

    # 2. Add org_code to organizations
    op.add_column('organizations', sa.Column('org_code', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_organizations_org_code'), 'organizations', ['org_code'], unique=True)

    # 3. Add admin_code to admins
    op.add_column('admins', sa.Column('admin_code', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_admins_admin_code'), 'admins', ['admin_code'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_admins_admin_code'), table_name='admins')
    op.drop_column('admins', 'admin_code')

    op.drop_index(op.f('ix_organizations_org_code'), table_name='organizations')
    op.drop_column('organizations', 'org_code')

    op.drop_table('sequence_trackers')
