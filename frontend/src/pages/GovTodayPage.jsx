import { useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, Download } from 'lucide-react';
import { GovWorkspace, GovButton, GovSearch, GovStatus, GovState, GovTabs, GovTable, GovDetail, formatDate } from '../components/government/GovWorkspace';
import { useGovernmentData } from '../utils/governmentApi';
import { exportWorkQueueToXLSX } from '../utils/xlsxExport';
import ReportPriority from '../components/government/ReportPriority';

const BUCKETS = [{ value: 'all', label: 'All work' }, { value: 'assigned_to_me', label: 'Assigned to me' }, { value: 'needs_my_review', label: 'Needs review' }, { value: 'waiting_on_others', label: 'Waiting on others' }, { value: 'review_overdue', label: 'Review overdue' }, { value: 'recently_completed', label: 'Completed recently' }];
const key = row => `${row.entity_type}:${row.id}`;
const reviewOverdue = row => Boolean(row.review_target?.overdue || (row.next_review_at && !['completed', 'cancelled'].includes(row.status) && new Date(row.next_review_at).getTime() < Date.now()));

export default function GovTodayPage() {
    const location = useLocation();
    const { data, loading, error, reload, fetchedAt } = useGovernmentData('/api/gov/operations/today');
    const [params, setParams] = useSearchParams();
    const returnFocus = useRef(null);
    const [exporting, setExporting] = useState(false);
    const bucket = params.get('bucket') || 'all';
    const search = params.get('search') || '';
    const items = data?.needs_attention || [];
    const rows = items.filter(t => (bucket === 'all' || (bucket === 'review_overdue' ? reviewOverdue(t) : t.task_bucket === bucket)) && `${t.ticket_id} ${t.title} ${t.barangay || ''}`.toLowerCase().includes(search.toLowerCase()));
    const selected = rows.find(row => key(row) === params.get('selected'));
    const recordUrl = selected?.entity_type === 'report'
        ? `/gov/reports/${selected.id}?from=${encodeURIComponent(location.pathname + location.search)}`
        : selected?.entity_type === 'referral'
            ? `${selected.action_url}&from=${encodeURIComponent(location.pathname + location.search)}`
            : selected?.action_url;
    function change(name, value) { setParams(p => { const n = new URLSearchParams(p); value ? n.set(name, value) : n.delete(name); return n; }, { replace: name === 'search' }); }
    function close() { change('selected', ''); requestAnimationFrame(() => returnFocus.current?.focus()); }

    async function handleExportXLSX() {
        if (!rows.length || exporting) return;
        setExporting(true);
        try {
            await exportWorkQueueToXLSX(rows, bucket);
        } finally {
            setExporting(false);
        }
    }

    return <GovWorkspace className="gov-today-workspace" title="My work" description="Assigned tasks and decisions waiting for your review." actions={<>
        <GovSearch value={search} onChange={v => change('search', v)} placeholder="Search ticket, task or location" />
        <div className="gov-page-actions__group">
            {fetchedAt && <span className="gov-muted">Updated {fetchedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</span>}
            <GovButton
                onClick={handleExportXLSX}
                disabled={loading || !rows.length || exporting}
                title={rows.length ? `Export ${rows.length} task(s) to Excel (.xlsx)` : 'No tasks to export'}
                aria-label="Export to Excel"
            >
                <Download size={14} aria-hidden="true" />
                <span>{exporting ? 'Exporting…' : 'Export'}</span>
            </GovButton>
            <GovButton onClick={reload} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Refresh</GovButton>
        </div>
    </>}>
        <GovTabs label="Work queues" value={bucket} onChange={v => { change('bucket', v); }} items={BUCKETS.map(b => ({ ...b, count: error || !data ? null : b.value === 'all' ? items.length : b.value === 'review_overdue' ? items.filter(reviewOverdue).length : data.inbox_counts?.[b.value] || 0 }))} />
        {data?.routing_enabled===false&&data?.can_route_reports&&<p className="gov-note" role="status">Automatic report assignment is paused. Incoming reports need a manual review owner.</p>}
        <GovState loading={loading && !data} error={error} onRetry={reload} />
        {!error && data && <>
            <div className={`gov-record-layout ${selected ? 'has-detail' : ''}`}>
                <GovTable label="Your work queue" rows={rows} rowKey={key} selected={selected ? key(selected) : null} onSelect={(row, trigger) => { returnFocus.current = trigger; change('selected', key(row)); }} emptyMessage={search ? 'No tasks match your search' : 'No work in this queue'} columns={[
                    { key: 'ticket_id', label: 'Task', render: r => <>{r.ticket_id}<small>{r.title}</small></> },
                    { key: 'task_bucket', label: 'Queue', render: r => BUCKETS.find(b => b.value === r.task_bucket)?.label || 'Review' },
                    { key: 'barangay', label: 'Location' },
                    { key: 'priority', label: 'Priority', render: r=>r.entity_type==='report'?<ReportPriority grade={r.priority}/>:<GovStatus value={r.priority}/> },
                    { key: 'status', label: 'Status', render: r => <GovStatus value={r.status} /> },
                    { key: 'updated_at', label: 'Updated', render: r => <>{formatDate(r.updated_at)}{r.review_target&&<small>{r.review_target.overdue?'Review overdue':'Review due'} · {formatDate(r.review_target.due_at)}</small>}{r.next_review_at&&<small>{reviewOverdue(r)?'Review overdue':'Review due'} · {formatDate(r.next_review_at)}</small>}</> },
                ]} />
                {selected && <GovDetail title={selected.title} onClose={close} actions={<Link className="gov-button is-primary" to={recordUrl}>{selected.recommended_action}<ArrowUpRight size={15} /></Link>}>
                    <section><GovStatus value={selected.status} /><p className="gov-note">{selected.ticket_id}</p><dl className="gov-facts"><dt>Location</dt><dd>{selected.barangay || 'Not recorded'}</dd><dt>Owner</dt><dd>{selected.assigned_to_name || 'Shared review queue'}</dd><dt>Priority</dt><dd>{selected.entity_type==='report'?<ReportPriority grade={selected.priority}/>:<GovStatus value={selected.priority}/>}</dd><dt>Updated</dt><dd>{formatDate(selected.updated_at)}</dd>{selected.review_target&&<><dt>Initial review target</dt><dd>{formatDate(selected.review_target.due_at)}{selected.review_target.overdue&&<small>Overdue</small>}</dd></>}</dl></section>
                    <section><h3>Why this is here</h3><p>{selected.why_in_inbox}</p><h3>Next step</h3><p>{selected.recommended_action}. Open the record to inspect the evidence and available actions.</p></section>
                </GovDetail>}
            </div>
        </>}
    </GovWorkspace>;
}
