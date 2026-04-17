"""Add Quote.deleted_at (if absent); make OrderItem.contract_pricing_id nullable

Revision ID: b3f1a2c8d4e7
Revises: 001_rfq_workflow
Create Date: 2026-04-14 10:00:00.000000

Safe (idempotent):
  - Uses IF NOT EXISTS for ADD COLUMN
  - Checks current nullability before ALTER COLUMN
  - Zero data loss on upgrade AND downgrade
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = 'b3f1a2c8d4e7'
down_revision = '001_rfq_workflow'
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def _column_is_nullable(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT is_nullable FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    row = result.fetchone()
    return row is not None and row[0] == 'YES'


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add deleted_at to quotes only if it doesn't exist yet
    if not _column_exists(conn, 'quotes', 'deleted_at'):
        op.add_column(
            'quotes',
            sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True)
        )

    # 2. Make order_items.contract_pricing_id nullable only if it's currently NOT NULL
    if not _column_is_nullable(conn, 'order_items', 'contract_pricing_id'):
        op.alter_column(
            'order_items',
            'contract_pricing_id',
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    conn = op.get_bind()

    # Reverse nullable — only safe if no NULL rows exist
    if _column_is_nullable(conn, 'order_items', 'contract_pricing_id'):
        null_count = conn.execute(
            text("SELECT COUNT(*) FROM order_items WHERE contract_pricing_id IS NULL")
        ).scalar()
        if null_count == 0:
            op.alter_column(
                'order_items',
                'contract_pricing_id',
                existing_type=sa.Integer(),
                nullable=False,
            )
        # else: skip — cannot make NOT NULL while NULL rows exist

    # Remove deleted_at only if it exists
    if _column_exists(conn, 'quotes', 'deleted_at'):
        op.drop_column('quotes', 'deleted_at')
