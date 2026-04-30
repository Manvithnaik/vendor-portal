"""Add business_doc to organization

Revision ID: 82bdddb5da51
Revises: b3f1a2c8d4e7
Create Date: 2026-04-18 09:51:18.509571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82bdddb5da51'
down_revision: Union[str, Sequence[str], None] = 'b3f1a2c8d4e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('organizations', sa.Column('business_doc', sa.String(length=500), nullable=True))
    op.add_column('organizations', sa.Column('business_doc_data', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'business_doc_data')
    op.drop_column('organizations', 'business_doc')
