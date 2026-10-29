from datetime import datetime, timedelta, timezone
import httpx
import testing_hazard_context as testing


def test_testing_forecasts_opt_in_cache_and_partial_coverage(monkeypatch):
    testing._cache.clear()
    monkeypatch.delenv('PULSO_PREDICTIVE_TESTING', raising=False)
    assert testing.forecast_context(14.75, 121.03)['status'] == 'disabled'
    monkeypatch.setenv('PULSO_PREDICTIVE_TESTING', 'true')
    assert testing.forecast_context(1, 2)['status'] == 'insufficient_location'
    now = datetime(2026, 10, 29, 0, tzinfo=timezone.utc)
    calls = []
    def response(request):
        calls.append(request.url)
        assert 'apikey' not in request.url.params
        if 'flood-api' in str(request.url):
            return httpx.Response(200, json={'daily': {'time': [], 'river_discharge': []}})
        return httpx.Response(200, json={
            'latitude': 14.75, 'longitude': 121.03,
            'hourly_units': {'precipitation': 'mm'},
            'hourly': {'time': [(now + timedelta(hours=h)).isoformat() for h in range(72)], 'precipitation': [1] * 72}})
    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        result = testing.forecast_context(14.75, 121.03, client, now)
        assert result['mode'] == 'testing' and result['status'] == 'partial'
        assert result['signals'][0]['value'] == 72
        assert result['signals'][1]['status'] == 'unavailable'
        assert len(calls) == 2
        result['signals'][0]['value'] = 999
        again = testing.forecast_context(14.75, 121.03, client, now)
        assert again['signals'][0]['value'] == 72
        assert len(calls) == 2
