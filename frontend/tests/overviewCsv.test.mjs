import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOverviewCsv } from '../src/utils/overviewCsv.js';
import { escapeCsvCell, serializeCsv } from '../src/utils/csvExport.js';

const overview = {
    as_of: '2026-10-28T07:00:00Z', scope: 'North Caloocan district',
    relationships: { open_reports: 2, reports_with_current_work: 1, reports_without_current_work: 1, current_work_orders: 3, blocked_orders: 1, awaiting_verification: 1 },
    totals: { unreviewed_reports: 1, urgent_reports: 1, blocked_work_orders: 1, awaiting_verification: 1 },
    areas: [{ barangay: 'Barangay 171', count: 2, with_work_count: 1, without_work_count: 1 }],
    priorities: { P5: 1, P4: 0, P3: 0, P2: 0, P1: 0, P0: 0, unassessed: 1 },
    priority_work: { P5: { with_work: 1, without_work: 0 }, unassessed: { with_work: 0, without_work: 1 } },
    report_intake: { series: Array.from({ length: 14 }, (_, index) => ({ date: `2026-10-${String(index + 15).padStart(2, '0')}`, count: index === 13 ? 2 : 0 })) },
    work_stages: [{ key: 'open', label: 'For assignment', count: 1 }, { key: 'active', label: 'In progress', count: 2 }],
};

test('each overview KPI has a rectangular numeric CSV with scope and Manila freshness', () => {
    for (const kind of ['open_reports', 'current_work_orders', 'needs_triage']) {
        const csv = buildOverviewCsv(overview, kind);
        assert.ok(csv.rows.length > 1);
        assert.ok(csv.rows.every(row => row.length === csv.headers.length));
        assert.ok(csv.rows.every(row => typeof row[1] === 'number'));
        assert.ok(csv.rows.every(row => row[3] === 'North Caloocan district' && row[4] === '2026-10-28 15:00'));
        assert.match(csv.filename, /2026-10-28$/);
    }
});

test('chart exports respect the visible period and include all recorded areas', () => {
    assert.equal(buildOverviewCsv(overview, 'intake', { days: 7 }).rows.length, 7);
    assert.equal(buildOverviewCsv(overview, 'intake', { days: 14 }).rows.length, 14);
    assert.deepEqual(buildOverviewCsv(overview, 'areas').rows[0].slice(0, 4), ['Barangay 171', 2, 1, 1]);
    assert.equal(buildOverviewCsv(overview, 'priorities').rows.length, 7);
});

test('summary uses one measure per row and does not mix unrelated count columns', () => {
    const csv = buildOverviewCsv(overview, 'summary');
    assert.deepEqual(csv.headers.slice(0, 5), ['Section', 'Category', 'Measure', 'Count', 'Unit']);
    assert.ok(csv.rows.every(row => row.length === csv.headers.length));
    assert.ok(csv.rows.some(row => row[0] === 'Intake' && row[2] === 'Reports received' && row[3] === 2));
    assert.ok(csv.rows.some(row => row[0] === 'Area' && row[1] === 'Barangay 171' && row[2] === 'Without current work' && row[3] === 1));
});

test('CSV cells preserve quoted place names and neutralize spreadsheet formulas', () => {
    assert.equal(escapeCsvCell('Barangay "A", 171'), '"Barangay ""A"", 171"');
    assert.equal(escapeCsvCell('=SUM(1,2)'), '"\'=SUM(1,2)"');
    assert.equal(escapeCsvCell('  =SUM(1,2)'), '"\'  =SUM(1,2)"');
    assert.equal(escapeCsvCell(-5), '"-5"');
});

test('each exported KPI serializes as an Excel-friendly rectangular CSV', () => {
    for (const kind of ['open_reports', 'current_work_orders', 'needs_triage', 'attention', 'areas', 'priorities', 'intake', 'work_stages', 'summary']) {
        const { headers, rows } = buildOverviewCsv(overview, kind);
        const csv = serializeCsv(headers, rows);
        const lines = csv.slice(1).split('\r\n');
        assert.equal(csv.charCodeAt(0), 0xFEFF);
        assert.equal(lines.length, rows.length + 1);
        assert.ok(lines[0].includes('"Scope"'));
        assert.ok(lines.every(line => line.length > 0));
    }
});
