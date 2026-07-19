import pytest

from app.models.site import Site
from app.services.portfolio_service import (
    SORTABLE_COLUMNS,
    InvalidSortField,
    list_sites,
    resolve_sort,
)


class TestResolveSort:
    def test_no_sort_returns_none(self):
        assert resolve_sort(None) is None
        assert resolve_sort("") is None

    def test_ascending_field(self):
        column, descending = resolve_sort("stage")
        assert column is Site.stage
        assert descending is False

    def test_descending_prefix(self):
        column, descending = resolve_sort("-stage")
        assert column is Site.stage
        assert descending is True

    def test_unknown_field_raises(self):
        with pytest.raises(InvalidSortField):
            resolve_sort("not_a_real_column")

    def test_unknown_field_message_lists_valid_fields(self):
        # The API surfaces this message verbatim on a 422 (see
        # test_sites_routes.py) -- it needs to actually be useful, not just
        # "invalid sort", so assert every real option is named in it.
        with pytest.raises(InvalidSortField) as exc_info:
            resolve_sort("bogus")
        message = str(exc_info.value)
        for field in SORTABLE_COLUMNS:
            assert field in message


class TestListSitesSorting:
    def test_default_order_is_title_ascending(self, seeded_session):
        items, total = list_sites(seeded_session)
        assert total == 5
        titles = [s.title for s in items]
        assert titles == sorted(titles)

    def test_sort_ascending(self, seeded_session):
        items, _ = list_sites(seeded_session, sort="stage")
        stages = [s.stage for s in items if s.stage is not None]
        assert stages == sorted(stages)

    def test_sort_descending(self, seeded_session):
        items, _ = list_sites(seeded_session, sort="-stage")
        stages = [s.stage for s in items if s.stage is not None]
        assert stages == sorted(stages, reverse=True)

    def test_nulls_last_on_both_directions(self, seeded_session):
        # S004 is the only NULL-stage row; it must sort last whichever
        # direction is requested, not just on ascending (Postgres's own
        # default flips NULL placement between ASC and DESC).
        asc_items, _ = list_sites(seeded_session, sort="stage")
        desc_items, _ = list_sites(seeded_session, sort="-stage")
        assert asc_items[-1].site_code == "S004"
        assert desc_items[-1].site_code == "S004"

    def test_tiebreaker_gives_deterministic_repeatable_order(self, seeded_session):
        # S001 and S005 share stage="Operating". Without the site_code
        # tiebreaker, their relative order isn't guaranteed by SQL and could
        # legitimately differ between two calls -- assert it doesn't.
        first, _ = list_sites(seeded_session, sort="stage")
        second, _ = list_sites(seeded_session, sort="stage")
        assert [s.site_code for s in first] == [s.site_code for s in second]

        operating_codes = [s.site_code for s in first if s.stage == "Operating"]
        assert operating_codes == sorted(operating_codes)

    def test_invalid_sort_raises_before_hitting_the_database(self, seeded_session):
        with pytest.raises(InvalidSortField):
            list_sites(seeded_session, sort="bogus_field")


class TestListSitesFiltering:
    def test_filter_by_single_stage(self, seeded_session):
        items, total = list_sites(seeded_session, stage=["Proposed"])
        assert total == 1
        assert items[0].site_code == "S003"

    def test_multiple_values_for_one_field_are_or_not_and(self, seeded_session):
        items, total = list_sites(seeded_session, commodity=["Nickel", "Iron Ore"])
        assert total == 2
        assert {s.site_code for s in items} == {"S002", "S003"}

    def test_multiple_fields_combine_with_and(self, seeded_session):
        # Gold AND Pilbara should exclude S004 (Gold but Wheatbelt).
        items, total = list_sites(
            seeded_session, commodity=["Gold"], region=["Pilbara"]
        )
        assert total == 2
        assert {s.site_code for s in items} == {"S001", "S005"}

    def test_search_matches_title_project_or_site_code(self, seeded_session):
        items, total = list_sites(seeded_session, search="Beta")
        assert total == 1
        assert items[0].site_code == "S002"

    def test_search_is_case_insensitive_partial_match(self, seeded_session):
        items, total = list_sites(seeded_session, search="mine")
        assert total == 3  # Alpha Mine, Beta Mine, Echo Mine

    def test_filter_by_project_code(self, seeded_session):
        # P01 is the fixture's multi-site project (S001 + S005) -- the exact
        # query the site detail page's "related sites" section runs.
        items, total = list_sites(seeded_session, project=["P01"])
        assert total == 2
        assert {s.site_code for s in items} == {"S001", "S005"}

    def test_project_filter_combines_with_other_filters(self, seeded_session):
        # Within P01, only S005 is in Pilbara AND... both are: S001 Pilbara,
        # S005 Pilbara. Use stage=Operating + region to prove AND semantics
        # via a filter that actually excludes: S001+S005 are both Operating,
        # so filter by search instead ("Echo" matches only S005's title).
        items, total = list_sites(seeded_session, project=["P01"], search="Echo")
        assert total == 1
        assert items[0].site_code == "S005"

    def test_no_filters_returns_everything(self, seeded_session):
        _, total = list_sites(seeded_session)
        assert total == 5
