import { exportToStyledXLSX } from './xlsxExport.js';
import { downloadCsv } from './csvExport.js';

const ZONE = 'Asia/Manila';

const PRIORITIES = [
    ['P5', 'P5 · Critical'], ['P4', 'P4 · Urgent'], ['P3', 'P3'],
    ['P2', 'P2'], ['P1', 'P1'], ['P0', 'P0'], ['unassessed', 'Not assessed'],
];

function asOfParts(value) {
    const instant = value ? new Date(value) : null;
    if (!instant || Number.isNaN(instant.getTime())) return { label: '', date: 'undated' };
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return {
        label: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
        date: `${parts.year}-${parts.month}-${parts.day}`,
    };
}

const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : '';

export function buildOverviewCsv(data, kind, { days = 14 } = {}) {
    if (!data?.relationships || !data?.totals) throw new Error('Complete overview records are required for export.');
    const scope = data.scope || 'Scope not recorded';
    const asOf = asOfParts(data.as_of);
    const context = [scope, asOf.label];
    const filename = `PULSO_Operations_${kind}${kind === 'intake' ? `_${days}d` : ''}_${asOf.date}`;
    const metricHeaders = ['Measure', 'Count', 'Unit', 'Scope', 'As of (Asia/Manila)', 'Definition'];
    const metric = (measure, value, unit, definition) => [measure, number(value), unit, ...context, definition];
    const relation = data.relationships;
    const totals = data.totals;
    let headers;
    let rows;

    switch (kind) {
        case 'open_reports':
            headers = metricHeaders;
            rows = [
                metric('Open reports', relation.open_reports, 'reports', 'All-age reports currently open in the permitted scope.'),
                metric('With current work', relation.reports_with_current_work, 'reports', 'Distinct open reports linked to a current work order.'),
                metric('Without current work', relation.reports_without_current_work, 'reports', 'Open reports with no current linked work order; they may still be in review.'),
            ];
            break;
        case 'current_work_orders':
            headers = metricHeaders;
            rows = [
                metric('Current work orders', relation.current_work_orders, 'orders', 'All current work orders in the permitted scope.'),
                metric('Blocked', relation.blocked_orders, 'orders', 'Current work orders with a recorded blocker.'),
                metric('For verification', relation.awaiting_verification, 'orders', 'Current work orders awaiting independent completion review.'),
                metric('Other current work', Number(relation.current_work_orders) - Number(relation.blocked_orders) - Number(relation.awaiting_verification), 'orders', 'Current work orders outside the blocked and verification groups.'),
            ];
            break;
        case 'needs_triage':
            headers = metricHeaders;
            rows = [
                metric('Needs triage or owner', totals.unreviewed_reports, 'reports', 'Open reports awaiting review, assessment, or a review owner.'),
                metric('Other open reports', Number(relation.open_reports) - Number(totals.unreviewed_reports), 'reports', 'Open reports outside the triage or owner queue.'),
                metric('All open reports', relation.open_reports, 'reports', 'All-age open report workload.'),
            ];
            break;
        case 'attention':
            headers = ['Queue', 'Count', 'Unit', 'Scope', 'As of (Asia/Manila)', 'Definition'];
            rows = [
                metric('Needs triage or owner', totals.unreviewed_reports, 'reports', 'Open reports needing a review decision or owner.'),
                metric('Urgent P4–P5', totals.urgent_reports, 'reports', 'Open reports with staff-assessed P4 or P5 priority.'),
                metric('Blocked work', totals.blocked_work_orders, 'orders', 'Current work orders with a blocker.'),
                metric('Awaiting verification', totals.awaiting_verification, 'orders', 'Current work orders pending completion review.'),
            ];
            if (Array.isArray(data.asset_exceptions)) rows.push(metric('Infrastructure exceptions shown', data.asset_exceptions.length, 'exceptions', 'Visible infrastructure exceptions in this overview.'));
            if (Array.isArray(data.update_exceptions)) rows.push(metric('Public updates shown', data.update_exceptions.length, 'updates', 'Visible public update exceptions in this overview.'));
            break;
        case 'areas':
            headers = ['Recorded barangay', 'Open reports', 'With current work', 'Without current work', 'Scope', 'As of (Asia/Manila)'];
            rows = (data.areas || []).map(area => [area.barangay, number(area.count), number(area.with_work_count), number(area.without_work_count), ...context]);
            break;
        case 'priorities':
            headers = ['Staff priority', 'Open reports', 'With current work', 'Without current work', 'Scope', 'As of (Asia/Manila)'];
            rows = PRIORITIES.map(([key, label]) => [label, number(data.priorities?.[key]), number(data.priority_work?.[key]?.with_work), number(data.priority_work?.[key]?.without_work), ...context]);
            break;
        case 'intake':
            if (![7, 14].includes(days)) throw new Error('Choose a supported intake period.');
            headers = ['Date (Asia/Manila)', 'Reports received', 'Scope', 'As of (Asia/Manila)', 'Definition'];
            rows = (data.report_intake?.series || []).slice(-days).map(point => [point.date, number(point.count), ...context, 'Daily submissions; includes reports now closed.']);
            break;
        case 'work_stages':
            headers = ['Work-order stage', 'Current orders', 'Scope', 'As of (Asia/Manila)'];
            rows = (data.work_stages || []).map(stage => [stage.label, number(stage.count), ...context]);
            break;
        case 'summary': {
            headers = ['Section', 'Category', 'Measure', 'Count', 'Unit', 'Scope', 'As of (Asia/Manila)'];
            rows = [];
            const add = (section, category, measure, value, unit) => rows.push([section, category, measure, number(value), unit, ...context]);
            for (const row of buildOverviewCsv(data, 'open_reports').rows) add('Reports', 'All open', row[0], row[1], row[2]);
            for (const row of buildOverviewCsv(data, 'current_work_orders').rows) add('Work orders', 'Current', row[0], row[1], row[2]);
            for (const row of buildOverviewCsv(data, 'attention').rows) add('Attention', 'Queue', row[0], row[1], row[2]);
            for (const row of buildOverviewCsv(data, 'areas').rows) {
                add('Area', row[0], 'Open reports', row[1], 'reports');
                add('Area', row[0], 'With current work', row[2], 'reports');
                add('Area', row[0], 'Without current work', row[3], 'reports');
            }
            for (const row of buildOverviewCsv(data, 'priorities').rows) {
                add('Priority', row[0], 'Open reports', row[1], 'reports');
                add('Priority', row[0], 'With current work', row[2], 'reports');
                add('Priority', row[0], 'Without current work', row[3], 'reports');
            }
            for (const row of buildOverviewCsv(data, 'work_stages').rows) add('Work stage', row[0], 'Current orders', row[1], 'orders');
            for (const row of buildOverviewCsv(data, 'intake', { days: 14 }).rows) add('Intake', row[0], 'Reports received', row[1], 'reports');
            break;
        }
        default:
            throw new Error('Unknown overview export.');
    }
    return { headers, rows, filename };
}

export function exportOverviewCSV(data, kind, options = {}) {
    const { headers, rows, filename } = buildOverviewCsv(data, kind, options);
    return downloadCsv(headers, rows, filename);
}

/**
 * Exports overview datasets as an artistic, professionally styled .xlsx spreadsheet.
 */
export async function exportOverviewXLSX(data, kind, options = {}) {
    const { headers, rows, filename } = buildOverviewCsv(data, kind, options);

    const kindTitles = {
        open_reports: 'OPEN REPORTS WORKLOAD',
        current_work_orders: 'CURRENT WORK ORDERS DISPATCH',
        needs_triage: 'TRIAGE & UNREVIEWED REPORTS QUEUE',
        attention: 'ATTENTION REQUIRED QUEUES',
        intake: 'DAILY REPORT INTAKE TRENDS',
        areas: 'OPEN REPORTS BY BARANGAY AREA',
        priorities: 'OPEN REPORTS BY ASSESSED PRIORITY',
        work_stages: 'CURRENT WORK ORDERS BY STAGE',
        summary: 'OPERATIONS COMPREHENSIVE EXECUTIVE SUMMARY'
    };

    const columns = headers.map((h, i) => {
        const isNumeric = ['Count', 'Open reports', 'With current work', 'Without current work', 'Reports received', 'Current orders'].includes(h);
        return {
            header: h,
            key: `c_${i}`,
            align: isNumeric ? 'right' : (h.includes('Scope') || h.includes('As of') || h.includes('Unit') ? 'center' : 'left'),
            width: h.length > 20 ? 26 : Math.max(h.length + 5, 14)
        };
    });

    const dataRows = rows.map(r => {
        const row = {};
        r.forEach((val, i) => { row[`c_${i}`] = val; });
        return row;
    });

    return exportToStyledXLSX({
        title: `OPERATIONS OVERVIEW — ${kindTitles[kind] || 'SUMMARY'}`,
        subtitle: 'CITY GOVERNMENT OF CALOOCAN • CITY ENGINEERING DEPARTMENT',
        scope: data.scope || 'Authorized Scope',
        filename,
        sheetName: (kindTitles[kind] || kind).slice(0, 31),
        columns,
        rows: dataRows
    });
}
