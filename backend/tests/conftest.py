"""Shared fixtures: an in-memory SQLite DB seeded with a small, hand-picked
set of sites, plus a FastAPI TestClient wired to it via dependency override.

SQLite (not Postgres) is deliberate here -- these tests exercise query
*logic* (filtering, sorting, tiebreaking, NULL handling), all of which is
plain SQL that SQLite implements the same way Postgres does. Bringing up a
real Postgres container for this would test the same logic slower, for no
extra coverage. If a future test ever needs a Postgres-only feature (e.g. a
window function Postgres implements differently), that's the point to
introduce a real Postgres fixture instead of stretching this one.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.site import Site


def _make_sample_sites() -> list[Site]:
    # Deliberately includes: a NULL `stage` (S004, for nulls_last checks),
    # a duplicate `stage` pair (S001 + S005, both "Operating", for the
    # site_code tiebreaker), and overlapping commodities/regions so
    # multi-value filter tests aren't trivially "only one row matches".
    return [
        Site(
            site_code="S001",
            project_code="P01",
            project_title="Alpha Project",
            title="Alpha Mine",
            site_type="Mine",
            stage="Operating",
            target_group_name="Gold",
            development_region="Pilbara",
        ),
        Site(
            site_code="S002",
            project_code="P02",
            project_title="Beta Project",
            title="Beta Mine",
            site_type="Mine",
            stage="Operating",
            target_group_name="Nickel",
            development_region="Goldfields-Esperance",
        ),
        Site(
            site_code="S003",
            project_code="P03",
            project_title="Charlie Project",
            title="Charlie Port",
            site_type="Infrastructure",
            stage="Proposed",
            target_group_name="Iron Ore",
            development_region="Pilbara",
        ),
        Site(
            site_code="S004",
            project_code="P04",
            project_title="Delta Project",
            title="Delta Deposit",
            site_type="Deposit",
            stage=None,
            target_group_name="Gold",
            development_region="Wheatbelt",
        ),
        Site(
            site_code="S005",
            project_code="P05",
            project_title="Echo Project",
            title="Echo Mine",
            site_type="Mine",
            stage="Operating",
            target_group_name="Gold",
            development_region="Pilbara",
        ),
    ]


@pytest.fixture()
def db_session():
    # StaticPool pins the engine to a single connection -- without it, each
    # checkout from the pool opens a *new* SQLite in-memory database (an
    # in-memory DB is per-connection, not per-engine), so the tables created
    # here would be invisible to whatever connection a later request in the
    # same test happens to check out.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def seeded_session(db_session):
    db_session.add_all(_make_sample_sites())
    db_session.commit()
    return db_session


@pytest.fixture()
def client(seeded_session):
    def _override_get_db():
        yield seeded_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
