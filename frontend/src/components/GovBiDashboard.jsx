import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, AlertTriangle, Download } from 'lucide-react';
import './gov-bi-dashboard.css';
import { GovAssistantSlot } from './government/GovAssistantHost';

const count = value => new Intl.NumberFormat('en-PH').format(value || 0);
const dateLabel = value => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};
const PRIORITIES = [['P5', 'P5 · Critical'], ['P4', 'P4 · Urgent'], ['P3', 'P3'], ['P2', 'P2'], ['P1', 'P1'], ['P0', 'P0'], ['unassessed', 'Not assessed']];

function DataTable({ label, columns, rows, note }) {
    return <details className="gov-bi-data-table"><summary>View {label} values</summary>
        {note && <p className="gov-bi-demand__note">{note}</p>}
        <div role="region" aria-label={`${label} values`} tabIndex={0}>
            <table><caption className="sr-only">{label} values</caption><thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
                <tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
        </div>
    </details>;
}

function ExportButton({ label, onClick, disabled = false }) {
    return (
        <button
            type="button"
            className="gov-bi-export-button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`Export ${label} to Excel (.xlsx)`}
            title={disabled ? 'Complete, current records are required for export' : `Export ${label} to Excel (.xlsx)`}
        >
            <Download size={12} aria-hidden="true" />
            <span>Export</span>
        </button>
    );
}
const CsvButton = ExportButton;

function KpiCard({ title, value, detail, url, action, segments, total, onExport, children }) {
    return <section className="gov-bi-surface gov-bi-kpi" aria-label={title}>
        <header className="gov-bi-kpi__head"><h2>{title}</h2><div className="gov-bi-head-actions"><CsvButton label={title} onClick={onExport} disabled={!onExport}/><Link to={url} aria-label={action} title={action}><ArrowUpRight size={16} aria-hidden="true"/></Link></div></header>
        <div className="gov-bi-kpi__value"><strong>{count(value)}</strong><span>{detail}</span></div>
        <div className="gov-bi-kpi__meter" role="img" aria-label={segments.map(segment => `${segment.label}: ${count(segment.value)}`).join('; ')}>
            {segments.map(segment => <span key={segment.label} className={`gov-bi-kpi__segment gov-bi-kpi__segment--${segment.kind}`} style={{ width: `${total ? segment.value / total * 100 : 0}%` }}/>) }
        </div>
        <div className="gov-bi-kpi__breakdown">{children}</div>
    </section>;
}

function KpiSummary({ data, onExport }) {
    const relation = data.relationships;
    const open = relation.open_reports;
    const work = relation.current_work_orders;
    const needsReview = data.totals.unreviewed_reports;
    const otherWork = Math.max(0, work - relation.blocked_orders - relation.awaiting_verification);
    return <div className="gov-bi-kpis" aria-label="Operational key indicators">
        <KpiCard title="Open reports" value={open} detail="Current report workload" url="/gov/reports?overview=open" action="Open all open reports" onExport={onExport && (() => onExport('open_reports'))} total={open} segments={[
            { label: 'With current work', value: relation.reports_with_current_work, kind: 'active' },
            { label: 'Without current work', value: relation.reports_without_current_work, kind: 'neutral' },
        ]}>
            <Link to="/gov/reports?overview=with_work"><i className="gov-bi-kpi__key gov-bi-kpi__key--active" aria-hidden="true"/>{count(relation.reports_with_current_work)} with work</Link>
            <Link to="/gov/reports?overview=without_work"><i className="gov-bi-kpi__key gov-bi-kpi__key--neutral" aria-hidden="true"/>{count(relation.reports_without_current_work)} without</Link>
        </KpiCard>
        <KpiCard title="Current work orders" value={work} detail="Across permitted records" url="/gov/work-orders?tab=current" action="Open current work orders" onExport={onExport && (() => onExport('current_work_orders'))} total={work} segments={[
            { label: 'Blocked', value: relation.blocked_orders, kind: 'warning' },
            { label: 'For verification', value: relation.awaiting_verification, kind: 'active' },
            { label: 'Other current work', value: otherWork, kind: 'neutral' },
        ]}>
            <Link to="/gov/work-orders?tab=blocked"><i className="gov-bi-kpi__key gov-bi-kpi__key--warning" aria-hidden="true"/>{count(relation.blocked_orders)} blocked</Link>
            <Link to="/gov/work-orders?tab=completed_pending_review"><i className="gov-bi-kpi__key gov-bi-kpi__key--active" aria-hidden="true"/>{count(relation.awaiting_verification)} for verification</Link>
            <span><i className="gov-bi-kpi__key gov-bi-kpi__key--neutral" aria-hidden="true"/>{count(otherWork)} other</span>
        </KpiCard>
        <KpiCard title="Needs triage or owner" value={needsReview} detail="Of currently open reports" url="/gov/reports?overview=triage" action="Open reports needing triage or an owner" onExport={onExport && (() => onExport('needs_triage'))} total={open} segments={[
            { label: 'Needs triage or owner', value: needsReview, kind: 'active' },
            { label: 'Other open reports', value: Math.max(0, open - needsReview), kind: 'neutral' },
        ]}>
            <span><i className="gov-bi-kpi__key gov-bi-kpi__key--active" aria-hidden="true"/>{count(needsReview)} of {count(open)} open</span>
            <Link to="/gov/reports?overview=triage">Open queue <ArrowUpRight size={13} aria-hidden="true"/></Link>
        </KpiCard>
    </div>;
}

function AttentionPanel({ data, onExport }) {
    const items = [
        { label: 'Needs triage or owner', count: data.totals.unreviewed_reports, url: '/gov/reports?overview=triage', detail: 'Open reports' },
        { label: 'Urgent P4–P5', count: data.totals.urgent_reports, url: '/gov/reports?overview=urgent', detail: 'Open reports' },
        { label: 'Blocked work', count: data.totals.blocked_work_orders, url: '/gov/work-orders?tab=blocked', detail: 'Current orders' },
        { label: 'Awaiting verification', count: data.totals.awaiting_verification, url: '/gov/work-orders?tab=completed_pending_review', detail: 'Current orders' },
    ];
    return <aside className="gov-bi-surface gov-bi-attention" aria-labelledby="gov-bi-attention-title">
        <header className="gov-bi-surface__head"><div><h2 id="gov-bi-attention-title">Needs attention</h2><p>Recorded queues to inspect next</p></div><div className="gov-bi-head-actions"><CsvButton label="needs attention queues" onClick={onExport && (() => onExport('attention'))} disabled={!onExport}/><AlertTriangle size={19} aria-hidden="true"/></div></header>
        <div className="gov-bi-attention__list">{items.map(item => <Link key={item.label} to={item.url} className="gov-bi-attention__row"><span><strong>{item.label}</strong><small>{item.detail}</small></span><span className="gov-bi-attention__count">{count(item.count)}<ArrowUpRight size={13} aria-hidden="true"/></span></Link>)}</div>
        {(Array.isArray(data.asset_exceptions) || Array.isArray(data.update_exceptions)) && <div className="gov-bi-attention__related">
            {Array.isArray(data.asset_exceptions) && <Link to="/gov/assets">{count(data.asset_exceptions.length)} infrastructure exceptions shown <ArrowUpRight size={13}/></Link>}
            {Array.isArray(data.update_exceptions) && <Link to="/gov/announcements">{count(data.update_exceptions.length)} public updates shown <ArrowUpRight size={13}/></Link>}
        </div>}
    </aside>;
}

function IntakeChart({ intake, onExport }) {
    const [days, setDays] = useState(14);
    const plot = useRef(null);
    const [plotWidth, setPlotWidth] = useState(360);
    const all = intake?.series || [];
    const points = all.slice(-days);
    const total = points.reduce((sum, point) => sum + point.count, 0);
    useEffect(() => {
        if (!plot.current) return;
        const observer = new ResizeObserver(([entry]) => setPlotWidth(Math.max(220, Math.round(entry.contentRect.width))));
        observer.observe(plot.current);
        return () => observer.disconnect();
    }, [total]);
    const previousSeven = all.slice(-14, -7).reduce((sum, point) => sum + point.count, 0);
    const lastSeven = all.slice(-7).reduce((sum, point) => sum + point.count, 0);
    const max = Math.max(4, Math.ceil(Math.max(0, ...points.map(point => point.count)) / 4) * 4);
    const left = 32, right = plotWidth - 12, top = 12, bottom = 108;
    const x = index => left + (points.length < 2 ? 0 : index / (points.length - 1)) * (right - left);
    const y = value => bottom - value / max * (bottom - top);
    const line = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.count)}`).join(' ');
    const fill = points.length ? `${line} L ${x(points.length - 1)} ${bottom} L ${left} ${bottom} Z` : '';
    const labels = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
    return <section className="gov-bi-surface gov-bi-intake" aria-labelledby="gov-bi-intake-title">
        <header className="gov-bi-surface__head"><div><h2 id="gov-bi-intake-title">Incoming reports</h2><p>Daily submissions · Asia/Manila · includes reports now closed</p></div><div className="gov-bi-head-actions"><CsvButton label={`${days}-day incoming reports`} onClick={onExport && (() => onExport('intake', { days }))} disabled={!onExport}/><div className="gov-bi-period" role="group" aria-label="Report intake period">{[7, 14].map(value => <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)}>{value} days</button>)}</div></div></header>
        <div className="gov-bi-intake__summary"><strong>{count(total)}</strong><span>received in {days} days</span><small>Last 7: {count(lastSeven)} · previous 7: {count(previousSeven)}</small></div>
        {total ? <figure ref={plot} className="gov-bi-intake__chart" aria-label={`${count(total)} reports received across the selected ${days} days. The line shows daily counts; exact values are in the table below.`}><svg viewBox={`0 0 ${plotWidth} 136`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
            {[0, .5, 1].map(fraction => { const ordinate = y(max * fraction); return <g key={fraction}><line x1={left} x2={right} y1={ordinate} y2={ordinate} className="gov-bi-gridline"/><text x={left - 9} y={ordinate + 4} textAnchor="end" className="gov-bi-axis-label">{max * fraction}</text></g>; })}
            <path d={fill} className="gov-bi-area"/><path d={line} className="gov-bi-line"/>
            {points.map((point, index) => <g key={point.date}><circle cx={x(index)} cy={y(point.count)} r="3.5" className="gov-bi-point"/>{labels.has(index) && <text x={x(index)} y="129" textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="gov-bi-axis-label">{dateLabel(point.date)}</text>}</g>)}
        </svg></figure> : <p className="gov-bi-empty">No reports were submitted in this period.</p>}
        <DataTable label="daily report intake" columns={['Date (Asia/Manila)', 'Reports received']} rows={points.map(point => [dateLabel(point.date), count(point.count)])}/>
    </section>;
}

function DemandChart({ data, onExport }) {
    const [view, setView] = useState(() => data.areas?.length ? 'areas' : 'priority');
    const areas = data.areas || [];
    const shown = areas.slice(0, 6);
    const areaMax = Math.max(1, ...shown.map(item => item.count));
    const shownPriorities = PRIORITIES.filter(([key]) => data.priorities?.[key]);
    const priorityMax = Math.max(1, ...shownPriorities.map(([key]) => data.priorities[key]));
    const splitBar = (withWork, withoutWork, max, label, filter) => <span className="gov-bi-demand__track" role="group" aria-label={`${label}: ${count(withWork)} with current work, ${count(withoutWork)} without current work`}>
        {withWork > 0 && <Link className="gov-bi-demand__with" to={`/gov/reports?overview=with_work&${filter}`} style={{ width: `${withWork / max * 100}%` }} aria-label={`${label}: open ${count(withWork)} reports with current work`} title={`${count(withWork)} with current work`}/>}
        {withoutWork > 0 && <Link className="gov-bi-demand__without" to={`/gov/reports?overview=without_work&${filter}`} style={{ width: `${withoutWork / max * 100}%` }} aria-label={`${label}: open ${count(withoutWork)} reports without current work`} title={`${count(withoutWork)} without current work`}/>}
    </span>;
    return <section className="gov-bi-surface gov-bi-demand" aria-labelledby="gov-bi-demand-title">
        <header className="gov-bi-surface__head"><div><h2 id="gov-bi-demand-title">{view === 'areas' ? 'Open reports by area' : 'Open reports by priority'}</h2><p>{view === 'areas' ? 'Up to six recorded areas' : 'Recorded staff priority'} · select a bar to inspect reports</p></div><div className="gov-bi-head-actions"><CsvButton label={`open reports by ${view === 'areas' ? 'area' : 'priority'}`} onClick={onExport && (() => onExport(view === 'areas' ? 'areas' : 'priorities'))} disabled={!onExport}/><div className="gov-bi-period" role="group" aria-label="Report breakdown">{[['areas', 'Areas'], ['priority', 'Priority']].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div></div></header>
        <div className="gov-bi-demand__legend"><span><i className="gov-bi-demand__key gov-bi-demand__key--with" aria-hidden="true"/>With current work</span><span><i className="gov-bi-demand__key gov-bi-demand__key--without" aria-hidden="true"/>Without current work</span></div>
        {view === 'areas' ? <>
            {shown.length ? <div className="gov-bi-demand__bars">{shown.map(area => <div key={area.barangay} className="gov-bi-demand__row"><Link to={area.url} title={`Open ${count(area.count)} reports in ${area.barangay}`}>{area.barangay}</Link>{splitBar(area.with_work_count, area.without_work_count, areaMax, area.barangay, `area=${encodeURIComponent(area.barangay)}`)}<strong>{count(area.count)}</strong></div>)}</div> : <p className="gov-bi-empty">No open reports have a recorded area in this scope.</p>}
            {data.coverage?.unlocated_reports > 0 && <Link className="gov-bi-demand__missing" to="/gov/reports?overview=unlocated">{count(data.coverage.unlocated_reports)} open reports have no recorded area <ArrowUpRight size={13} aria-hidden="true"/></Link>}
            <DataTable note="Without current work may still be in review. Counts show distinct open reports, not overdue work." label="area and current work" columns={['Recorded area', 'Open reports', 'With current work', 'Without current work']} rows={areas.map(area => [area.barangay, count(area.count), <Link key="with" to={`/gov/reports?overview=with_work&area=${encodeURIComponent(area.barangay)}`}>{count(area.with_work_count)}</Link>, <Link key="without" to={`/gov/reports?overview=without_work&area=${encodeURIComponent(area.barangay)}`}>{count(area.without_work_count)}</Link>])}/>
        </> : <>
            {shownPriorities.length ? <div className="gov-bi-demand__bars">{shownPriorities.map(([key, label]) => {
                const split = data.priority_work[key];
                return <div key={key} className="gov-bi-demand__row"><Link to={`/gov/reports?overview=priority&priority=${encodeURIComponent(key)}`}>{label}</Link>{splitBar(split.with_work, split.without_work, priorityMax, label, `priority=${encodeURIComponent(key)}`)}<strong>{count(data.priorities?.[key])}</strong></div>;
            })}</div> : <p className="gov-bi-empty">No open reports are recorded in this scope.</p>}
            <DataTable note="Without current work may still be in review. Counts show distinct open reports, not overdue work." label="priority and current work" columns={['Priority', 'Open reports', 'With current work', 'Without current work']} rows={PRIORITIES.map(([key, label]) => [label, count(data.priorities?.[key]), <Link key="with" to={`/gov/reports?overview=with_work&priority=${encodeURIComponent(key)}`}>{count(data.priority_work[key].with_work)}</Link>, <Link key="without" to={`/gov/reports?overview=without_work&priority=${encodeURIComponent(key)}`}>{count(data.priority_work[key].without_work)}</Link>])}/>
        </>}
    </section>;
}

function WorkStageChart({ data, onExport }) {
    const stages = data.work_stages || [];
    const total = data.relationships.current_work_orders;
    const max = Math.max(1, ...stages.map(stage => stage.count));
    return <section className="gov-bi-surface gov-bi-stage" aria-labelledby="gov-bi-stage-title">
        <header className="gov-bi-surface__head"><div><h2 id="gov-bi-stage-title">Current work by stage</h2><p>Recorded work orders, grouped by their current state</p></div><div className="gov-bi-head-actions"><CsvButton label="current work by stage" onClick={onExport && (() => onExport('work_stages'))} disabled={!onExport}/><Link to="/gov/work-orders?tab=current" className="gov-bi-text-link">All work <ArrowUpRight size={15} aria-hidden="true"/></Link></div></header>
        {total ? <div className="gov-bi-stage__plot" role="group" aria-label="Select a work stage to open its work orders">
            {stages.map(stage => {
                const content = <><strong>{count(stage.count)}</strong><span className="gov-bi-stage__slot"><span className="gov-bi-stage__bar" data-empty={stage.count === 0} style={{ height: `${stage.count ? Math.max(7, stage.count / max * 100) : 0}%` }}/></span><span className="gov-bi-stage__label">{stage.label}</span></>;
                return stage.url ? <Link key={stage.key} to={stage.url} className={`gov-bi-stage__item is-${stage.key}`} aria-label={`${stage.label}: ${count(stage.count)} work orders. Open matching work orders.`}>{content}</Link>
                    : <div key={stage.key} className={`gov-bi-stage__item is-${stage.key}`} aria-label={`${stage.label}: ${count(stage.count)} work orders`}>{content}</div>;
            })}
        </div> : <p className="gov-bi-empty">No current work orders are recorded in this scope.</p>}
        <DataTable label="current work stages" columns={['Recorded stage', 'Work orders']} rows={stages.map(stage => [stage.label, stage.url ? <Link key={stage.key} to={stage.url}>{count(stage.count)}</Link> : count(stage.count)])}/>
    </section>;
}

export default function GovBiDashboard({ data, onExport }) {
    return <div className="gov-bi-dashboard">
        <KpiSummary data={data} onExport={onExport}/>
        <div className="gov-bi-workbench">
            <div className="gov-bi-charts">
                <DemandChart data={data} onExport={onExport}/>
                <AttentionPanel data={data} onExport={onExport}/>
                <div className="gov-bi-analysis"><IntakeChart intake={data.report_intake} onExport={onExport}/><WorkStageChart data={data} onExport={onExport}/></div>
            </div>
            <GovAssistantSlot />
        </div>
        <footer className="gov-bi-footer"><span>Counts are from permitted records at the as-of time above, not a live stream.</span><details><summary>Coverage and interpretation</summary><div className="gov-bi-footer__detail"><p>{count(data.coverage?.total_open_reports - data.coverage?.unlocated_reports)} of {count(data.coverage?.total_open_reports)} open reports have a recorded barangay. {count(data.coverage?.total_open_reports - data.coverage?.unassigned_reports)} have a review owner.</p><ul>{(data.limitations || []).map(limit => <li key={limit}>{limit}</li>)}</ul></div></details></footer>
    </div>;
}
