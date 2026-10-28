import ExcelJS from 'exceljs/dist/exceljs.min.js';

/**
 * Neutralizes potential formula injection tokens (CWE-1236) in exported strings.
 */
function sanitizeCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
        return "'" + str;
    }
    return str;
}

/**
 * Returns semantic fill and text colors based on status or priority value.
 */
function getSemanticStyle(val) {
    if (!val) return null;
    const v = String(val).toLowerCase().trim().replace(/[\s_-]+/g, ' ');

    // Success: Resolved, Completed, Approved, Verified, On track
    if (['resolved', 'completed', 'approved', 'verified', 'on track', 'yes'].includes(v)) {
        return {
            fill: 'FFDCFCE7', // Emerald 100
            font: { bold: true, color: { argb: 'FF166534' } } // Emerald 800
        };
    }
    // Danger / Critical / Overdue: Critical, High, Urgent, P5, P4, Overdue, Rejected
    if (['critical', 'high', 'urgent', 'p5', 'p4', 'overdue', 'rejected', 'failed'].includes(v)) {
        return {
            fill: 'FFFEE2E2', // Rose 100
            font: { bold: true, color: { argb: 'FF991B1B' } } // Rose 800
        };
    }
    // Warning / In-Review: Medium, P3, P2, Needs review, Pending, Awaiting, Waiting
    if (['medium', 'p3', 'p2', 'needs review', 'pending', 'waiting on others', 'awaiting verification', 'needs information', 'not assessed'].includes(v)) {
        return {
            fill: 'FFFEF3C7', // Amber 100
            font: { bold: true, color: { argb: 'FF92400E' } } // Amber 800
        };
    }
    // Active / Routine: In progress, Assigned, Low, P1, P0, Received
    if (['in progress', 'assigned', 'dispatched', 'low', 'p1', 'p0', 'received', 'all work'].includes(v)) {
        return {
            fill: 'FFDBEAFE', // Blue 100
            font: { bold: true, color: { argb: 'FF1E40AF' } } // Blue 800
        };
    }
    return null;
}

/**
 * Core export function that renders a high-fidelity, styled .xlsx workbook.
 */
export async function exportToStyledXLSX({
    title = 'OPERATIONS DOCKET',
    subtitle = 'CITY GOVERNMENT OF CALOOCAN • CITY ENGINEERING DEPARTMENT',
    scope = 'Authorized LGU Scope',
    filename = 'PULSO_Export',
    sheetName = 'Docket',
    columns = [],
    rows = []
}) {
    if (!columns.length) return false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PULSO — City Engineering Department Management System';
    wb.lastModifiedBy = 'PULSO Government Portal';
    wb.created = new Date();
    wb.properties.date1904 = false;

    const ws = wb.addWorksheet(sheetName.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
    });

    const colCount = columns.length;
    const lastColLetter = ws.getColumn(colCount).letter;

    // ── Row 1: Government Masthead (Sub-title / LGU Unit) ──
    ws.mergeCells(`A1:${lastColLetter}1`);
    const cellA1 = ws.getCell('A1');
    cellA1.value = subtitle.toUpperCase();
    cellA1.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } };
    cellA1.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 19;

    // ── Row 2: Document Title Banner ──
    ws.mergeCells(`A2:${lastColLetter}2`);
    const cellA2 = ws.getCell('A2');
    cellA2.value = title.toUpperCase();
    cellA2.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    cellA2.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(2).height = 25;

    // ── Row 3: Metadata Context Line ──
    ws.mergeCells(`A3:${lastColLetter}3`);
    const cellA3 = ws.getCell('A3');
    const manilaTime = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    cellA3.value = `Exported: ${manilaTime} (Asia/Manila)  •  Records: ${rows.length}  •  Scope: ${scope}  •  Classification: Official LGU Civic Record`;
    cellA3.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    cellA3.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(3).height = 18;

    // ── Row 4: Spacer ──
    ws.getRow(4).height = 8;

    // ── Row 5: Column Headers ──
    const headerRow = ws.getRow(5);
    headerRow.height = 27;

    columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
        cell.alignment = {
            vertical: 'middle',
            horizontal: col.align || (col.key === 'title' || col.key === 'issue' || col.key === 'address' ? 'left' : 'center'),
            wrapText: true
        };
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF2563EB' } }, // Field Blue Signature Cut
            top: { style: 'thin', color: { argb: 'FF0F172A' } },
            left: { style: 'thin', color: { argb: 'FF1E293B' } },
            right: { style: 'thin', color: { argb: 'FF1E293B' } }
        };
    });

    // ── Row 6+: Data Rows ──
    rows.forEach((rowObj, rIdx) => {
        const row = ws.getRow(6 + rIdx);
        row.height = 22;
        const isZebra = rIdx % 2 === 1;
        const defaultBg = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';

        columns.forEach((col, cIdx) => {
            const cell = row.getCell(cIdx + 1);
            const rawVal = Array.isArray(rowObj) ? rowObj[cIdx] : rowObj[col.key];
            const cleanVal = sanitizeCell(rawVal);
            cell.value = cleanVal;
            cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
            cell.alignment = {
                vertical: 'middle',
                horizontal: col.align || (col.key === 'title' || col.key === 'issue' || col.key === 'address' || col.key === 'task' ? 'left' : 'center'),
                wrapText: Boolean(col.wrapText)
            };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };

            // Semantic status & priority pill highlighting
            if (col.isStatus || col.isPriority || col.key === 'status' || col.key === 'priority' || col.key === 'severity') {
                const style = getSemanticStyle(cleanVal);
                if (style) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
                    cell.font = { ...cell.font, ...style.font };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } };
                }
            } else if (col.isId || col.key === 'ticket_id' || col.key === 'id') {
                cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } };
            } else {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: defaultBg } };
            }
        });
    });

    // ── Calculate dynamic column widths ──
    columns.forEach((col, idx) => {
        let maxLen = (col.header || '').length;
        rows.forEach(r => {
            const val = Array.isArray(r) ? r[idx] : r[col.key];
            if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxLen) maxLen = len;
            }
        });
        const assignedWidth = col.width || Math.min(Math.max(maxLen + 4, 12), 48);
        ws.getColumn(idx + 1).width = assignedWidth;
    });

    // ── Generate and trigger download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
}

/**
 * Dedicated exporter for Government "My Work" Operations Queue
 */
export async function exportWorkQueueToXLSX(rows, bucket = 'all') {
    const bucketLabels = {
        all: 'All Work',
        assigned_to_me: 'Assigned to Me',
        needs_my_review: 'Needs Review',
        waiting_on_others: 'Waiting on Others',
        recently_completed: 'Recently Completed'
    };
    const bucketTitle = bucketLabels[bucket] || 'Work Queue';
    const dateStr = new Date().toISOString().slice(0, 10);

    const columns = [
        { header: 'Ticket ID', key: 'ticket_id', width: 17, isId: true },
        { header: 'Task / Title', key: 'title', width: 36, align: 'left' },
        { header: 'Queue', key: 'queue', width: 18 },
        { header: 'Location / Barangay', key: 'barangay', width: 22 },
        { header: 'Priority', key: 'priority', width: 14, isPriority: true },
        { header: 'Status', key: 'status', width: 16, isStatus: true },
        { header: 'Review Owner', key: 'owner', width: 22 },
        { header: 'Review Target', key: 'review_target', width: 20 },
        { header: 'Overdue State', key: 'overdue', width: 15, isPriority: true },
        { header: 'Why In Queue', key: 'why_in_inbox', width: 34, align: 'left', wrapText: true },
        { header: 'Recommended Action', key: 'action', width: 28, align: 'left' },
        { header: 'Last Updated', key: 'updated', width: 20 }
    ];

    const dataRows = (rows || []).map(r => ({
        ticket_id: r.ticket_id || '',
        title: r.title || '',
        queue: bucketLabels[r.task_bucket] || r.task_bucket || 'Review',
        barangay: r.barangay || 'Not recorded',
        priority: r.priority || '',
        status: r.status || '',
        owner: r.assigned_to_name || 'Shared review queue',
        review_target: r.review_target?.due_at ? new Date(r.review_target.due_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'None',
        overdue: r.review_target?.overdue ? 'Overdue' : (r.review_target?.due_at ? 'On track' : 'N/A'),
        why_in_inbox: r.why_in_inbox || '',
        action: r.recommended_action || '',
        updated: r.updated_at ? new Date(r.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : ''
    }));

    return exportToStyledXLSX({
        title: `OPERATIONS WORK QUEUE — ${bucketTitle.toUpperCase()}`,
        subtitle: 'CITY GOVERNMENT OF CALOOCAN • CITY ENGINEERING DEPARTMENT',
        scope: 'Authorized Work Queue',
        filename: `PULSO_Work_Queue_${bucket}_${dateStr}`,
        sheetName: bucketTitle,
        columns,
        rows: dataRows
    });
}

/**
 * Dedicated exporter for Citizen Reports Docket
 */
export async function exportCitizenReportsToXLSX(reports, filterInfo = '') {
    const dateStr = new Date().toISOString().slice(0, 10);

    const columns = [
        { header: 'Ticket ID', key: 'ticket_id', width: 17, isId: true },
        { header: 'Issue Description', key: 'issue', width: 38, align: 'left', wrapText: true },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Severity', key: 'severity', width: 14, isPriority: true },
        { header: 'Workflow Status', key: 'status', width: 16, isStatus: true },
        { header: 'Legislative District', key: 'district', width: 18 },
        { header: 'Barangay', key: 'barangay', width: 18 },
        { header: 'Specific Address', key: 'address', width: 32, align: 'left', wrapText: true },
        { header: 'Landmark', key: 'landmark', width: 22, align: 'left' },
        { header: 'Latitude', key: 'lat', width: 14, align: 'center' },
        { header: 'Longitude', key: 'lng', width: 14, align: 'center' },
        { header: 'Citizen Reporter', key: 'reporter', width: 22 },
        { header: 'Anonymous', key: 'anonymous', width: 13 },
        { header: 'Contact Method', key: 'contact', width: 22 },
        { header: 'Date Received', key: 'received', width: 20 },
        { header: 'Last Synced', key: 'updated', width: 20 }
    ];

    const dataRows = (reports || []).map(r => ({
        ticket_id: r.ticket_id || '',
        issue: r.issue || '',
        category: r.report_type || 'General',
        severity: r.severity || 'Not assessed',
        status: r.status || 'Received',
        district: r.district || 'Not recorded',
        barangay: r.barangay || 'Not recorded',
        address: r.location?.address || 'Not recorded',
        landmark: r.location?.landmark || '',
        lat: r.location?.lat ?? '',
        lng: r.location?.lng ?? '',
        reporter: r.reporter?.name || (r.reporter?.is_private ? 'Anonymous Citizen' : 'Citizen Reporter'),
        anonymous: r.reporter?.is_private ? 'Yes' : 'No',
        contact: r.reporter?.contact_method || 'Confidential',
        received: r.steps?.received || '',
        updated: r.updated || ''
    }));

    return exportToStyledXLSX({
        title: 'CITIZEN INFRASTRUCTURE INCIDENT REPORTS DOCKET',
        subtitle: 'CITY GOVERNMENT OF CALOOCAN • CITY ENGINEERING DEPARTMENT',
        scope: filterInfo || 'Caloocan City (North & South Sectors)',
        filename: `PULSO_Citizen_Reports_${dateStr}`,
        sheetName: 'Citizen Reports',
        columns,
        rows: dataRows
    });
}

/**
 * Dedicated exporter for Operations Overview Summary
 */
export async function exportOperationsOverviewToXLSX(data) {
    if (!data) return false;
    const dateStr = new Date().toISOString().slice(0, 10);

    const columns = [
        { header: 'Record Domain', key: 'domain', width: 22 },
        { header: 'Indicator / Dimension', key: 'dimension', width: 32, align: 'left' },
        { header: 'Total Count', key: 'count', width: 15, align: 'right' },
        { header: 'Active / With Work', key: 'with_work', width: 18, align: 'right' },
        { header: 'Pending / Without Work', key: 'without_work', width: 22, align: 'right' },
        { header: 'Operational Status', key: 'status', width: 20, isStatus: true }
    ];

    const rows = [];

    // KPI Totals
    if (data.relationships) {
        rows.push({
            domain: 'Key Performance',
            dimension: 'Open Citizen Reports',
            count: data.relationships.open_reports ?? 0,
            with_work: data.relationships.reports_with_current_work ?? 0,
            without_work: data.relationships.reports_without_current_work ?? 0,
            status: 'Active Workload'
        });
        rows.push({
            domain: 'Key Performance',
            dimension: 'Current Work Orders',
            count: data.relationships.current_work_orders ?? 0,
            with_work: data.relationships.current_work_orders ?? 0,
            without_work: 0,
            status: 'In Progress'
        });
    }

    if (data.totals) {
        rows.push({
            domain: 'Triage Queue',
            dimension: 'Reports Pending Owner / Triage',
            count: data.totals.unreviewed_reports ?? 0,
            with_work: 0,
            without_work: data.totals.unreviewed_reports ?? 0,
            status: data.totals.unreviewed_reports > 0 ? 'Needs Review' : 'Resolved'
        });
        rows.push({
            domain: 'Urgency Queue',
            dimension: 'Urgent Reports (P4–P5)',
            count: data.totals.urgent_reports ?? 0,
            with_work: 0,
            without_work: data.totals.urgent_reports ?? 0,
            status: data.totals.urgent_reports > 0 ? 'Critical' : 'Resolved'
        });
        rows.push({
            domain: 'Field Bottlenecks',
            dimension: 'Blocked Work Orders',
            count: data.totals.blocked_work_orders ?? 0,
            with_work: 0,
            without_work: data.totals.blocked_work_orders ?? 0,
            status: data.totals.blocked_work_orders > 0 ? 'High' : 'On Track'
        });
    }

    // Barangay Area Demand
    if (Array.isArray(data.areas)) {
        data.areas.forEach(a => {
            rows.push({
                domain: 'Barangay Demand',
                dimension: a.barangay || 'Unknown Area',
                count: a.count ?? 0,
                with_work: a.with_work_count ?? 0,
                without_work: a.without_work_count ?? 0,
                status: a.with_work_count > 0 ? 'In Progress' : (a.count > 0 ? 'Needs Review' : 'Resolved')
            });
        });
    }

    // Priority Distribution
    if (data.priorities && data.priority_work) {
        Object.entries(data.priorities).forEach(([k, count]) => {
            const work = data.priority_work[k] || {};
            rows.push({
                domain: 'Priority Workload',
                dimension: `Grade ${k.toUpperCase()}`,
                count: count ?? 0,
                with_work: work.with_work ?? 0,
                without_work: work.without_work ?? 0,
                status: ['p5', 'p4', 'critical', 'high'].includes(k.toLowerCase()) ? 'Critical' : 'Routine'
            });
        });
    }

    return exportToStyledXLSX({
        title: 'OPERATIONAL DEMAND & WORKLOAD OVERVIEW',
        subtitle: 'CITY GOVERNMENT OF CALOOCAN • CITY ENGINEERING DEPARTMENT',
        scope: data.scope || 'Caloocan City',
        filename: `PULSO_Operations_Overview_${dateStr}`,
        sheetName: 'Overview Summary',
        columns,
        rows
    });
}

/**
 * Dedicated exporter for Resident Reports
 */
export async function exportResidentReportsToXLSX(reports, residentName = 'Citizen') {
    const dateStr = new Date().toISOString().slice(0, 10);

    const columns = [
        { header: 'Ticket ID', key: 'ticket_id', width: 17, isId: true },
        { header: 'Title / Description', key: 'title', width: 36, align: 'left', wrapText: true },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Status', key: 'status', width: 16, isStatus: true },
        { header: 'Date Submitted', key: 'created_at', width: 20 },
        { header: 'Barangay', key: 'barangay', width: 18 },
        { header: 'Location / Landmark', key: 'location', width: 30, align: 'left' },
        { header: 'Last Updated', key: 'updated_at', width: 20 }
    ];

    const dataRows = (reports || []).map(r => ({
        ticket_id: r.ticket_id || r.id || 'N/A',
        title: r.title || r.description || '',
        category: r.category || r.ai_category || 'General',
        status: r.status || 'Received',
        created_at: r.created_at ? new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '',
        barangay: r.barangay || r.location_barangay || '',
        location: r.location_string || r.address || '',
        updated_at: r.updated_at ? new Date(r.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : ''
    }));

    return exportToStyledXLSX({
        title: `MY FILED CITIZEN REPORTS — ${residentName.toUpperCase()}`,
        subtitle: 'CITY GOVERNMENT OF CALOOCAN • PULSO RESIDENT SERVICES',
        scope: 'Personal Submissions',
        filename: `PULSO_My_Reports_${dateStr}`,
        sheetName: 'My Reports',
        columns,
        rows: dataRows
    });
}
