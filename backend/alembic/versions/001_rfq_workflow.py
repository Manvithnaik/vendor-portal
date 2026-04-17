"""Add quotation workflow fields to orders and quotes

Revision ID: 001_rfq_workflow
Revises: 
Create Date: 2026-04-13

Adds:
- orders.quotation_id        (FK → quotes.id, nullable)
- orders.po_document_url     (VARCHAR 500, nullable)
- orders.vendor_response_reason (TEXT, nullable)
- orders.contract_id         altered to nullable
- quotes.status              (quote_status_enum, default 'submitted')
- New ENUM: quote_status_enum, vendor_review/accepted/rejected in order_status_enum
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_rfq_workflow'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new ENUM values to order_status_enum
    #    PostgreSQL requires ALTER TYPE to add values
    op.execute("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'vendor_review'")
    op.execute("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'accepted'")
    op.execute("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'rejected'")

    # 2. Create quote_status_enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE quote_status_enum AS ENUM ('submitted', 'accepted', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # 3. Add new columns to orders table
    op.add_column('orders',
        sa.Column('quotation_id', sa.Integer(), sa.ForeignKey('quotes.id'), nullable=True)
    )
    op.add_column('orders',
        sa.Column('po_document_url', sa.String(500), nullable=True)
    )
    op.add_column('orders',
        sa.Column('vendor_response_reason', sa.Text(), nullable=True)
    )

    # 4. Make orders.contract_id nullable (was NOT NULL before)
    op.alter_column('orders', 'contract_id', nullable=True)

    # 5. Add status column to quotes table
    op.add_column('quotes',
        sa.Column(
            'status',
            sa.Enum('submitted', 'accepted', 'rejected', name='quote_status_enum'),
            nullable=False,
            server_default='submitted'
        )
    )

    # 6. Create index on orders.quotation_id
    op.create_index('idx_orders_quotation_id', 'orders', ['quotation_id'])


def downgrade() -> None:
    op.drop_index('idx_orders_quotation_id', table_name='orders')
    op.drop_column('quotes', 'status')
    op.alter_column('orders', 'contract_id', nullable=False)
    op.drop_column('orders', 'vendor_response_reason')
    op.drop_column('orders', 'po_document_url')
    op.drop_column('orders', 'quotation_id')
    # Note: ENUM types and values cannot easily be removed in PostgreSQL
    # quote_status_enum is left in place on downgrade
