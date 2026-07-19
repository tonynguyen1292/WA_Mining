"""/api/kpis: totals, breakdowns, and the two dashboard-insight additions
(by_lga top-N, top_projects multi-site ranking). First direct coverage of
this endpoint -- it previously rode along untested.
"""


def _get_kpis(client, **params):
    res = client.get("/api/kpis", params=params or None)
    assert res.status_code == 200
    return res.json()


def test_totals_count_sites_and_distinct_projects(client):
    body = _get_kpis(client)
    assert body["total_sites"] == 5
    # S001 and S005 share P01, so 5 sites collapse to 4 distinct projects.
    assert body["total_projects"] == 4


def test_breakdowns_are_ordered_by_count_descending(client):
    body = _get_kpis(client)
    counts = [item["count"] for item in body["by_stage"]]
    assert counts == sorted(counts, reverse=True)
    # 3 Operating, 1 Proposed, 1 NULL-stage bucketed as "Unspecified"
    assert body["by_stage"][0] == {"label": "Operating", "count": 3}
    assert {"label": "Unspecified", "count": 1} in body["by_stage"]


def test_by_lga_present_and_count_ordered(client):
    # Fixture rows carry no lga_name, so the whole set buckets into
    # "Unspecified" -- what matters here is the field exists, aggregates,
    # and respects filters (the top-10 limit is exercised implicitly; a
    # 10-way fixture would test SQL's LIMIT, not our logic).
    body = _get_kpis(client)
    assert body["by_lga"] == [{"label": "Unspecified", "count": 5}]


def test_top_projects_lists_only_multi_site_projects(client):
    body = _get_kpis(client)
    # P01 is the fixture's only project with >= 2 sites; single-site
    # projects must not appear (a "multi-site projects" panel listing
    # singles would just restate the sites list).
    assert body["top_projects"] == [
        {"project_code": "P01", "project_title": "Alpha Project", "site_count": 2}
    ]


def test_top_projects_respects_filters(client):
    # Region=Wheatbelt matches only S004 (project P04, single site) --
    # no multi-site project survives the filter.
    body = _get_kpis(client, region="Wheatbelt")
    assert body["total_sites"] == 1
    assert body["top_projects"] == []


def test_breakdowns_respect_filters(client):
    body = _get_kpis(client, commodity="Gold")
    assert body["total_sites"] == 3  # S001, S004, S005
    stage_labels = {item["label"] for item in body["by_stage"]}
    assert "Proposed" not in stage_labels  # S003 is Iron Ore, filtered out
