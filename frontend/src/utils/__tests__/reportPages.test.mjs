import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchReportPages, fetchReportMapPages } from '../reportPages.js';

const response = (rows, count = '3') => new Response(JSON.stringify(rows), { headers: { 'X-Total-Count': count, 'X-Reports-As-Of': '2026-10-29T01:00:00+00:00' } });

test('fetches all pages while retaining scope and server snapshot', async () => {
    const requests = [];
    const rows = await fetchReportPages({ baseUrl: '', token: 'test', scope: new URLSearchParams('area=171'), pageSize: 2, fetcher: async (url, options) => {
        requests.push([new URL(url, 'http://test'), options]);
        return response(requests.length === 1 ? [{id: 3}, {id: 2}] : [{id: 1}]);
    }});
    assert.deepEqual(rows.map(row => row.id), [3, 2, 1]);
    assert.equal(requests[1][0].searchParams.get('skip'), '2');
    assert.equal(requests[1][0].searchParams.get('area'), '171');
    assert.equal(requests[1][0].searchParams.get('as_of'), '2026-10-29T01:00:00+00:00');
    assert.equal(requests[1][1].headers.Authorization, 'Bearer test');
});

test('rejects an incomplete or overlapping queue instead of reporting success', async () => {
    await assert.rejects(fetchReportPages({ fetcher: async () => response([{id: 1}]), pageSize: 2 }), /complete report queue/);
    await assert.rejects(fetchReportPages({ fetcher: async () => response([{id: 1}, {id: 1}]), pageSize: 2 }), /changed while loading/);
    await assert.rejects(fetchReportPages({ fetcher: async () => response({items: []}) }), /invalid/);
});

test('map pages preserve source scope and return a complete map', async () => {
    const first = {items: [{id: 3}, {id: 2}], as_of: '2026-10-29T01:00:00+00:00', total: 3, next_skip: 2, truncated: true, asset: {id: 'test-asset'}};
    const data = await fetchReportMapPages({path: '/api/gov/report-map?overview=open&area=171', first, request: async path => {
        const url = new URL(path, 'http://test');
        assert.equal(url.searchParams.get('skip'), '2');
        assert.equal(url.searchParams.get('area'), '171');
        assert.equal(url.searchParams.get('overview'), 'open');
        assert.equal(url.searchParams.get('as_of'), first.as_of);
        return {...first, items: [{id: 1}], next_skip: null};
    }});
    assert.deepEqual(data.items.map(item => item.id), [3, 2, 1]);
    assert.deepEqual(data.asset, first.asset);
    assert.equal(data.truncated, false);
    await assert.rejects(fetchReportMapPages({path: '/api/gov/report-map', first, request: async () => ({...first, items: [{id: 2}], next_skip: null})}), /changed while loading/);
    await assert.rejects(fetchReportMapPages({path: '/api/gov/report-map', first: {...first, items: [], next_skip: null}}), /complete report map/);
});
