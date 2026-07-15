from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Site(Base):
    """A single mining/infrastructure/petroleum site (MINEDEX SITE_CODE grain).

    Mirrors SQL/02_create_clean_table.sql, with `title` and `short_title`
    carried through from staging (dropped in the original SQL pipeline, but
    needed here as the human-readable name for any UI built on top of this).
    """

    __tablename__ = "sites"

    site_code: Mapped[str] = mapped_column(String, primary_key=True)
    project_code: Mapped[str | None] = mapped_column(String, index=True)
    project_title: Mapped[str | None] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String)
    short_title: Mapped[str | None] = mapped_column(String)
    site_type: Mapped[str | None] = mapped_column(String, index=True)
    subtype: Mapped[str | None] = mapped_column(String)
    stage: Mapped[str | None] = mapped_column(String, index=True)
    target_group_name: Mapped[str | None] = mapped_column(String, index=True)
    commodity_group_name: Mapped[str | None] = mapped_column(String)
    development_region: Mapped[str | None] = mapped_column(String, index=True)
    lga_name: Mapped[str | None] = mapped_column(String)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 6))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 6))
    active_flag: Mapped[str | None] = mapped_column(String)
