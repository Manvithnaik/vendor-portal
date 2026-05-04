"""merge_heads

Revision ID: c529eca6e870
Revises: 82bdddb5da51, c1e19d2a1387
Create Date: 2026-04-18 23:12:49.198145

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c529eca6e870'
down_revision: Union[str, Sequence[str], None] = ('82bdddb5da51', 'c1e19d2a1387')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
