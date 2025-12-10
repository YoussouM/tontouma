"""Update embedding dimension to 1536

Revision ID: 691003aa63c1
Revises: 3750bdecc085
Create Date: 2024-12-09 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '691003aa63c1'
down_revision: Union[str, None] = '3750bdecc085'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL to alter the vector column dimension
    # ALTER COLUMN type cannot be done automatically by just changing metadata in some cases with vectors
    op.execute('ALTER TABLE kb_embeddings ALTER COLUMN embedding TYPE vector(1536);')


def downgrade() -> None:
    op.execute('ALTER TABLE kb_embeddings ALTER COLUMN embedding TYPE vector(384);')
