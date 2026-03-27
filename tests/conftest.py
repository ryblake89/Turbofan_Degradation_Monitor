"""Shared test fixtures for tool function tests.

These tests run against the live PostgreSQL database (Docker Compose).
The C-MAPSS FD001 data and trained models must already be loaded.
"""

import pytest

from src.data.database import engine


@pytest.fixture(scope="session", autouse=True)
def check_db_connection():
    """Verify the database is reachable before running any tests."""
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"Database not available: {exc}")


@pytest.fixture(scope="session")
def known_unit_id():
    """A unit_id known to exist in the FD001 dataset."""
    return 1


@pytest.fixture(scope="session")
def all_unit_ids():
    """All unit_ids in the FD001 dataset (1-100)."""
    return list(range(1, 101))
