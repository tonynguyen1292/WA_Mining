"""HTTP-layer tests for /api/sites -- these exist on top of
test_portfolio_service.py's logic tests to specifically pin down the
route<->service boundary: does InvalidSortField actually turn into a 422
(not a 500), and does the response body still look like SiteListResponse.
"""


def test_valid_sort_returns_200(client):
    res = client.get("/api/sites", params={"sort": "-stage"})
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 5
    assert body["page"] == 1
    assert body["page_size"] == 25


def test_invalid_sort_returns_422_not_500(client):
    res = client.get("/api/sites", params={"sort": "bogus_field"})
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert "bogus_field" in detail
    assert "stage" in detail  # a real, valid field should be named as an option


def test_filter_by_stage_query_param(client):
    res = client.get("/api/sites", params={"stage": "Proposed"})
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["site_code"] == "S003"


def test_repeated_query_param_is_multi_value_filter(client):
    res = client.get(
        "/api/sites",
        params=[("commodity", "Nickel"), ("commodity", "Iron Ore")],
    )
    body = res.json()
    assert body["total"] == 2


def test_project_query_param_filters_to_that_projects_sites(client):
    res = client.get("/api/sites", params={"project": "P01"})
    body = res.json()
    assert body["total"] == 2
    assert {item["site_code"] for item in body["items"]} == {"S001", "S005"}


def test_project_param_reaches_the_export_too(client):
    # The export shares _apply_filters with the list, so ?project= must
    # produce a project-scoped CSV rather than silently exporting everything.
    res = client.get("/api/sites/export", params={"project": "P01"})
    assert res.status_code == 200
    data_rows = [line for line in res.text.lstrip("\ufeff").splitlines()[1:] if line]
    assert len(data_rows) == 2


def test_site_detail_returns_full_record(client):
    res = client.get("/api/sites/S001")
    assert res.status_code == 200
    assert res.json()["title"] == "Alpha Mine"


def test_site_detail_404_for_unknown_code(client):
    res = client.get("/api/sites/DOES_NOT_EXIST")
    assert res.status_code == 404
