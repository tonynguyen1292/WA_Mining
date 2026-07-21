"""The /api-wide `Cache-Control: no-store` middleware (app.main).

The export route had this header first (with its own test in
test_export.py); sprint-review risk R4 was that the *JSON* endpoints
relied on browsers' default XHR caching behavior instead of saying
anything. These tests pin the middleware's three behaviors: stamp every
/api response, defer to a route's own Cache-Control, leave non-/api
paths alone.
"""


def test_json_api_responses_are_not_cacheable(client):
    for path in ("/api/sites", "/api/kpis", "/api/meta/filters", "/api/sites/S001"):
        res = client.get(path)
        assert res.status_code == 200
        assert res.headers["cache-control"] == "no-store", path


def test_error_responses_under_api_are_not_cacheable_either(client):
    # A cached 404 would be just as misleading as cached data: a site
    # that appears in a future snapshot would keep 404ing from cache.
    res = client.get("/api/sites/NOPE")
    assert res.status_code == 404
    assert res.headers["cache-control"] == "no-store"


def test_route_level_header_wins_over_the_middleware(client):
    # The export sets its own no-store at the route; the middleware must
    # not stack a second value onto it ("no-store, no-store"). Asserting
    # the exact single value catches both clobbering and duplication.
    res = client.get("/api/sites/export")
    assert res.headers["cache-control"] == "no-store"
    assert res.headers["cache-control"].count("no-store") == 1


def test_health_is_outside_the_api_prefix_and_unstamped(client):
    # /health is an infrastructure probe, not a data endpoint -- if a
    # cache wants to serve it, nothing is at stake. It doubles as proof
    # the middleware scopes to /api rather than blanketing the app.
    res = client.get("/health")
    assert res.status_code == 200
    assert "cache-control" not in res.headers
