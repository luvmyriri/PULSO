import { createElement, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight, Building2, ChevronRight, CirclePause, ClipboardCheck, ClipboardList,
    Clock3, Download, Droplet, FileText, Info, Layers, MapPinned, MessageSquare, Search, TriangleAlert, Wrench,
} from 'lucide-react';
import OverviewAreaMap from './OverviewAreaMap';
import './gov-bi-dashboard.css';
import { GovAssistantSlot } from './government/GovAssistantHost';
import { GovButton } from './government/GovWorkspace';

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

function ExportButton({ label, format, onClick, disabled = false }) {
    return (
        <button
            type="button"
            className="gov-bi-export-button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`Export ${label} as ${format === 'csv' ? 'CSV' : 'Excel workbook'}`}
            title={disabled ? 'Complete, current records are required for export' : `Export ${label} as ${format === 'csv' ? 'CSV' : 'Excel workbook'}`}
        >
            {format === 'csv' ? 'CSV' : 'Excel'}
        </button>
    );
}
function ExportActions({ label, onExport }) {
    return <span className="gov-bi-export-actions" role="group" aria-label={`Export ${label}`}>
        <ExportButton label={label} format="csv" onClick={onExport && (() => onExport('csv'))} disabled={!onExport}/>
        <ExportButton label={label} format="xlsx" onClick={onExport && (() => onExport('xlsx'))} disabled={!onExport}/>
    </span>;
}

function ExportMenu({ label, onExport }) {
    return onExport && <details className="gov-bi-export-menu">
        <summary aria-label={`Export ${label}`} title={`Export ${label}`}><Download size={14} aria-hidden="true"/></summary>
        <div><ExportActions label={label} onExport={onExport}/></div>
    </details>;
}

function DemandChart({ data, onExport }) {
    const [view, setView] = useState(() => data.areas?.length ? 'areas' : 'priority');
    const areas = data.areas || [];
    const shown = areas.slice(0, 6);
    const areaMax = Math.max(1, ...shown.map(item => item.count));
    const shownPriorities = PRIORITIES.filter(([key]) => data.priorities?.[key]);
    const priorityMax = Math.max(1, ...shownPriorities.map(([key]) => data.priorities[key]));
    const splitBar = (withWork, withoutWork, max, label, filter) => <span className="gov-bi-demand__track" role="group" aria-label={`${label}: ${count(withWork)} with current work, ${count(withoutWork)} without current work`}>
        {[['with', withWork], ['without', withoutWork]].filter(([, value]) => value > 0).map(([kind, value]) => {
            const props = { className: `gov-bi-demand__${kind}`, style: { width: `${value / max * 100}%` } };
            return filter
                ? <Link key={kind} {...props} to={`/gov/reports?overview=${kind}_work&${filter}`} aria-label={`${label}: open ${count(value)} reports ${kind} current work`}/>
                : <span key={kind} {...props} aria-hidden="true"/>;
        })}
    </span>;
    const areaFilter = area => area.url === '/gov/reports?overview=unlocated' ? null : `area=${encodeURIComponent(area.barangay)}`;
    return <Panel id="demand" className="gov-bi-demand" description={view === 'areas' ? 'Current workload by recorded area' : 'Current workload by recorded priority'} actions={<div className="gov-bi-head-actions">
        <div className="gov-bi-period" role="group" aria-label="Report breakdown">{[['areas', 'Areas'], ['priority', 'Priority']].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div>
        <ExportMenu label={`open reports by ${view === 'areas' ? 'area' : 'priority'}`} onExport={onExport && (format => onExport(view === 'areas' ? 'areas' : 'priorities', format))}/>
    </div>}>
        <div className="gov-bi-demand__legend"><span><i className="gov-bi-demand__key gov-bi-demand__key--with" aria-hidden="true"/>With current work</span><span><i className="gov-bi-demand__key gov-bi-demand__key--without" aria-hidden="true"/>Without current work</span></div>
        {view === 'areas' ? <>
            {shown.length ? <div className="gov-bi-demand__bars">{shown.map(area => <div key={area.barangay} className="gov-bi-demand__row"><Link to={area.url}>{area.barangay}</Link>{splitBar(area.with_work_count, area.without_work_count, areaMax, area.barangay, areaFilter(area))}<strong>{count(area.count)}</strong></div>)}</div> : <p className="gov-bi-empty">No open reports have a recorded area in this scope.</p>}
            {data.coverage?.unlocated_reports > 0 && <Link className="gov-bi-demand__missing" to="/gov/reports?overview=unlocated">{count(data.coverage.unlocated_reports)} open reports have no recorded area <ArrowUpRight size={13} aria-hidden="true"/></Link>}
            <DataTable note="Reports without current work may still be in review." label="area and current work" columns={['Recorded area', 'Open reports', 'With current work', 'Without current work']} rows={areas.map(area => {
                const filter = areaFilter(area);
                const values = [['with', area.with_work_count], ['without', area.without_work_count]];
                return [area.barangay, count(area.count), ...values.map(([kind, value]) => filter
                    ? <Link key={kind} to={`/gov/reports?overview=${kind}_work&${filter}`}>{count(value)}</Link>
                    : count(value))];
            })}/>
        </> : <>
            {shownPriorities.length ? <div className="gov-bi-demand__bars">{shownPriorities.map(([key, label]) => {
                const split = data.priority_work[key];
                return <div key={key} className="gov-bi-demand__row"><Link to={`/gov/reports?overview=priority&priority=${encodeURIComponent(key)}`}>{label}</Link>{splitBar(split.with_work, split.without_work, priorityMax, label, `priority=${encodeURIComponent(key)}`)}<strong>{count(data.priorities?.[key])}</strong></div>;
            })}</div> : <p className="gov-bi-empty">No open reports are recorded in this scope.</p>}
            <DataTable note="Without current work may still be in review. Counts show distinct open reports, not overdue work." label="priority and current work" columns={['Priority', 'Open reports', 'With current work', 'Without current work']} rows={PRIORITIES.map(([key, label]) => [label, count(data.priorities?.[key]), <Link key="with" to={`/gov/reports?overview=with_work&priority=${encodeURIComponent(key)}`}>{count(data.priority_work[key].with_work)}</Link>, <Link key="without" to={`/gov/reports?overview=without_work&priority=${encodeURIComponent(key)}`}>{count(data.priority_work[key].without_work)}</Link>])}/>
        </>}
    </Panel>;
}

const PANELS = [
    ['areas', 'Work orders by area'], ['inventory', 'Infrastructure status'], ['intake', 'Service requests'],
    ['trend', 'Work order trend'], ['types', 'Reports by type'], ['stages', 'Work progress by stage'],
    ['performance', 'Key performance indicators'], ['timeline', 'Project timeline'], ['resources', 'Resource utilization'],
    ['actions', 'Quick actions'], ['alerts', 'Alerts and notifications'], ['infrastructure', 'City infrastructure at a glance'],
];
const DEMAND_PANEL = ['demand', 'Open report demand'];
const PANEL_TITLES = Object.fromEntries([...PANELS, DEMAND_PANEL]);
const COLORS = ['green', 'blue', 'orange', 'slate', 'mint', 'steel'];
const panelId = id => `overview-${id}`;

export function OverviewSearch({ canViewDemand }) {
    const [query, setQuery] = useState('');
    const [message, setMessage] = useState('');
    const options = useId();
    const panels = canViewDemand ? [...PANELS, DEMAND_PANEL] : PANELS;
    function submit(event) {
        event.preventDefault();
        const keyword = query.trim().toLowerCase();
        if (!keyword) return;
        const match = panels.find(([, title]) => title.toLowerCase().includes(keyword));
        if (!match) {
            setMessage('No matching dashboard panel.');
            return;
        }
        const panel = document.getElementById(panelId(match[0]));
        panel?.focus({ preventScroll: true });
        panel?.scrollIntoView({ block: 'nearest' });
        setMessage('');
    }
    return <form className="gov-overview-search" role="search" onSubmit={submit}>
        <label className="gov-search">
            <Search size={15} aria-hidden="true"/>
            <span className="sr-only">Find a dashboard panel</span>
            <input type="search" value={query} list={options} placeholder="Find a dashboard panel" onChange={event => { setQuery(event.target.value); setMessage(''); }}/>
        </label>
        <datalist id={options}>{panels.map(([id, title]) => <option key={id} value={title}/>)}</datalist>
        <span role="status" className={message ? 'gov-overview-search__message' : 'sr-only'}>{message}</span>
    </form>;
}

export function OverviewLoading() {
    return <div className="gov-bi-dashboard" role="status">
        <span className="sr-only">Loading operations overview</span>
        <div className="gov-bi-kpis" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => <div className="gov-bi-surface gov-bi-kpi gov-bi-skeleton" key={i}><span/><span/></div>)}
        </div>
        <div className="gov-bi-workbench" aria-hidden="true">
            {[PANELS.slice(0, 9), PANELS.slice(9)].map((panels, index) => <div className={index ? 'gov-bi-rail' : 'gov-bi-charts'} key={index}>
                {panels.map(([id]) => <div className="gov-bi-surface gov-bi-skeleton" key={id}><span/><span/></div>)}
            </div>)}
        </div>
    </div>;
}

function Panel({ id, description, actions, children, className = '' }) {
    return <section className={`gov-bi-surface gov-bi-panel ${className}`} id={panelId(id)} tabIndex={-1} aria-labelledby={`${panelId(id)}-title`}>
        <header className="gov-bi-surface__head">
            <div><h2 id={`${panelId(id)}-title`}>{PANEL_TITLES[id]}</h2><p>{description}</p></div>
            {actions}
        </header>
        {children}
    </section>;
}

function Badge({ icon, tone = 'orange' }) {
    return <span className={`gov-bi-badge is-${tone}`} aria-hidden="true">{createElement(icon, { size: 17 })}</span>;
}
function DrillLink({ to, children }) {
    return to && <Link className="gov-bi-text-link" to={to}>{children}<ArrowUpRight size={12} aria-hidden="true"/></Link>;
}

function Ring({ rows, total, label }) {
    let offset = 0;
    const segments = rows.map(([value, tone]) => {
        const start = offset;
        offset += 100 * value / total;
        return `var(--bi-${tone}) ${start}% ${Math.min(100, offset)}%`;
    });
    return <div className="gov-bi-ring" aria-hidden="true" style={total > 0 && segments.length ? { backgroundImage: `conic-gradient(${segments.join(',')})` } : undefined}>
        <div>{label && <><strong>{count(total)}</strong><small>{label}</small></>}</div>
    </div>;
}

function Kpis({ data, has, onExport }) {
    const { relationships: r, totals, dashboard } = data;
    const completion = dashboard?.work?.completion;
    const eligible = completion?.eligible;
    const percent = eligible ? Math.round(1000 * completion.completed / eligible) / 10 : null;
    const cards = [
        { title: 'Open reports', value: r.open_reports, detail: `${count(r.reports_with_current_work)} with work · ${count(r.reports_without_current_work)} without`, icon: ClipboardList, tone: 'orange', to: has('reports') && '/gov/reports?overview=open', kind: 'open_reports' },
        { title: 'Active work orders', value: r.current_work_orders, detail: `${count(r.blocked_orders)} blocked · ${count(r.awaiting_verification)} for verification`, icon: Wrench, tone: 'blue', to: has('work-orders') && '/gov/work-orders?tab=current', kind: 'current_work_orders' },
        { title: 'Projects in progress', value: dashboard?.projects?.in_progress, detail: dashboard?.projects ? 'Recorded delivery stages' : 'Project records unavailable', icon: Layers, tone: 'green', to: has('projects') && '/gov/projects' },
        { title: 'Needs attention', value: totals.unreviewed_reports, detail: 'Reports awaiting triage or a review owner', icon: TriangleAlert, tone: 'warning', to: has('reports') && '/gov/reports?overview=triage', kind: 'needs_triage' },
        { title: 'Completion rate', value: percent == null ? null : `${percent}%`, detail: eligible ? `${count(completion.completed)} of ${count(eligible)} orders opened in 30 days` : completion ? 'No eligible orders opened in 30 days' : 'Completion records unavailable', icon: ClipboardCheck, tone: 'green', ratio: percent },
    ];
    return <div className="gov-bi-kpis" aria-label="Operational indicators">{cards.map(card => <section className="gov-bi-surface gov-bi-kpi" key={card.title}>
        <Badge icon={card.icon} tone={card.tone}/>
        <div>
            <h2>{card.to ? <Link to={card.to}>{card.title}</Link> : card.title}</h2>
            <strong>{card.value == null ? '—' : typeof card.value === 'number' ? count(card.value) : card.value}</strong>
            <small>{card.detail}</small>
        </div>
        {card.ratio != null && <div className="gov-bi-kpi__ring"><Ring rows={[[card.ratio, 'green'], [100 - card.ratio, 'track']]} total={100}/></div>}
        {card.kind && onExport && <div className="gov-bi-kpi__export"><ExportMenu label={card.title.toLowerCase()} onExport={format => onExport(card.kind, format)}/></div>}
    </section>)}</div>;
}

function Distribution({ rows, noun }) {
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    if (!total) return <p className="gov-bi-empty">No {noun} are recorded in this scope.</p>;
    const ordered = [...rows].sort((a, b) => b.count - a.count);
    const leading = ordered.slice(0, 5);
    const tail = ordered.slice(5).reduce((sum, row) => sum + row.count, 0);
    const visible = tail ? [...leading, { label: 'Other recorded values', count: tail }] : leading;
    return <>
        <div className="gov-bi-distribution">
            <Ring rows={visible.map((row, i) => [row.count, COLORS[i]])} total={total} label={noun}/>
            <ul className="gov-bi-legend" aria-label={`${count(total)} ${noun}`}>{visible.map(({ label, count: value }, i) => <li key={i}>
                <i className={`gov-bi-dot is-${COLORS[i]}`} aria-hidden="true"/><span>{label}</span><strong>{count(value)}</strong>
            </li>)}</ul>
        </div>
        {tail > 0 && <DataTable label={noun} columns={['Recorded value', 'Count']} rows={ordered.map(row => [row.label, count(row.count)])}/>}
    </>;
}

function Trend({ id, series, lines, onExport }) {
    const [days, setDays] = useState(id === 'intake' ? 14 : 30);
    const points = series?.slice(-days) || [];
    const totals = lines.map(({ key }) => points.reduce((sum, point) => sum + point[key], 0));
    const max = Math.max(2, Math.ceil(Math.max(0, ...points.flatMap(point => lines.map(({ key }) => point[key]))) / 2) * 2);
    const paths = lines.map(({ key }) => points.map((point, index) =>
        `${index ? 'L' : 'M'} ${4 + index * 312 / Math.max(1, points.length - 1)} ${68 - point[key] / max * 65}`).join(' '));
    const periods = (id === 'intake' ? [7, 14] : [7, 14, 30]).filter(value => value <= (series?.length ?? 0));
    return <Panel id={id} description={id === 'intake' ? 'Incoming resident reports · Manila time' : 'Orders created and completed · Manila time'} actions={<div className="gov-bi-head-actions">
        {periods.length > 1 && <select className="gov-bi-select" aria-label={`${PANEL_TITLES[id]} period`} value={days} onChange={event => setDays(Number(event.target.value))}>
            {periods.map(value => <option key={value} value={value}>{value} days</option>)}
        </select>}
        <ExportMenu label={`${days}-day incoming reports`} onExport={onExport && (format => onExport('intake', format, { days }))}/>
    </div>}>
        {!points.length ? <p className="gov-bi-empty">Daily records are unavailable.</p> : <>
            <div className="gov-bi-trend-summary" aria-live="polite">{lines.map(({ label, tone }, index) => <span key={label}><i className={`gov-bi-dot is-${tone}`} aria-hidden="true"/><strong>{count(totals[index])}</strong> {label.toLowerCase()}</span>)}</div>
            <div className="gov-bi-trend" aria-hidden="true">
                <div className="gov-bi-trend__ticks"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
                <svg viewBox="0 0 320 70" preserveAspectRatio="none" focusable="false">
                    <path className="gov-bi-gridline" d="M0 2H320 M0 35H320 M0 68H320"/>
                    <g key={days} className="gov-bi-trend__series">
                        <path className="gov-bi-area" d={`${paths[0]} L ${points.length > 1 ? 316 : 4} 68 H4Z`}/>
                        {paths.map((path, index) => <path key={lines[index].key} className={`gov-bi-line is-${lines[index].tone}`} d={path}/>)}
                    </g>
                </svg>
                <div className="gov-bi-trend__dates"><span>{dateLabel(points[0].date)}</span><span>{dateLabel(points.at(-1).date)}</span></div>
            </div>
            <DataTable label="daily" columns={['Date', ...lines.map(line => line.label)]} rows={points.map(point => [dateLabel(point.date), ...lines.map(line => count(point[line.key]))])}/>
        </>}
    </Panel>;
}

function WorkAreas({ scope, has }) {
    return <Panel id="areas" description="Current orders within your permitted areas" actions={<DrillLink to={has('reports') && '/gov/map'}>Open reports map</DrillLink>}>
        <OverviewAreaMap scope={scope}/>
    </Panel>;
}

function WorkStages({ data, has, onExport }) {
    const stages = data.work_stages;
    const total = data.relationships.current_work_orders;
    const max = Math.max(1, ...stages.map(stage => stage.count));
    return <Panel id="stages" description={`${count(total)} current work orders`} actions={<div className="gov-bi-head-actions">
        <DrillLink to={has('work-orders') && '/gov/work-orders?tab=current'}>View orders</DrillLink>
        <ExportMenu label="current work by stage" onExport={onExport && (format => onExport('work_stages', format))}/>
    </div>}>
        {total ? <ul className="gov-bi-stage-list">{stages.map(({ key, label, count: value, url }) => <li key={key}>
            {url && has('work-orders') ? <Link to={url}>{label}</Link> : <span>{label}</span>}
            <span className="gov-bi-track" aria-hidden="true"><i className={key === 'blocked' ? 'is-orange' : 'is-green'} style={{ width: `${100 * value / max}%` }}/></span>
            <strong>{count(value)}</strong>
        </li>)}</ul> : <p className="gov-bi-empty">No current work orders in this scope.</p>}
    </Panel>;
}

function ProjectTimeline({ projects, has, asOf }) {
    const date = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
    const start = Date.parse(asOf);
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    return <Panel id="timeline" description="Recorded reviews in the next 30 days" actions={<DrillLink to={has('projects') && '/gov/projects'}>View projects</DrillLink>}>
        {!projects ? <p className="gov-bi-empty">Project review dates are unavailable.</p> : projects.reviews.length ? <ul className="gov-bi-timeline">
            {projects.reviews.map(review => <li key={review.url}>
                <Clock3 size={14} aria-hidden="true"/>
                {has('projects') ? <Link to={review.url}>{review.title}</Link> : <span>{review.title}</span>}
                <time dateTime={review.date}>{date.format(new Date(review.date))}</time>
                {Number.isFinite(start) && <span className="gov-bi-track" aria-hidden="true"><i style={{ '--review-position': `${Math.min(100, Math.max(0, (Date.parse(review.date) - start) / windowMs * 100))}%` }}/></span>}
            </li>)}
        </ul> : <p className="gov-bi-empty">No upcoming project reviews are recorded.</p>}
    </Panel>;
}

function Performance({ completion, feedback }) {
    const rate = completion?.eligible ? `${(100 * completion.completed / completion.eligible).toFixed(1)}%` : '—';
    const tiles = [
        ['Average response time', '—', 'No governed response measure'],
        ['Work-order completion', rate, '30-day intake cohort'],
        ['On-time delivery', '—', 'Due-date coverage unavailable'],
        ['Resident feedback', feedback?.count ? `${feedback.average.toFixed(1)} / 5` : '—',
            feedback ? `${count(feedback.count)} rated reports opened in 30 days` : 'Feedback unavailable'],
    ];
    return <Panel id="performance" description="Service measures within your scope">
        <div className="gov-bi-mini-grid">{tiles.map(([label, value, note]) => <div className="gov-bi-mini" key={label}>
            <strong>{value}</strong><span>{label}</span><small>{note}</small>
        </div>)}</div>
    </Panel>;
}

function Attention({ data, has, onExport }) {
    const { totals } = data;
    const items = [
        ['Needs triage or owner', totals.unreviewed_reports, 'Open reports', ClipboardList, 'orange', has('reports') && '/gov/reports?overview=triage'],
        ['Urgent P4–P5', totals.urgent_reports, 'Open reports', TriangleAlert, 'warning', has('reports') && '/gov/reports?overview=urgent'],
        ['Blocked work', totals.blocked_work_orders, 'Current orders', CirclePause, 'blue', has('work-orders') && '/gov/work-orders?tab=blocked'],
        ['Awaiting verification', totals.awaiting_verification, 'Current orders', ClipboardCheck, 'green', has('work-orders') && '/gov/work-orders?tab=completed_pending_review'],
    ];
    return <Panel id="alerts" description="Recorded queues to inspect next" actions={<div className="gov-bi-head-actions">
        <DrillLink to={has('my-work') && '/gov/my-work'}>My work</DrillLink>
        <ExportMenu label="needs attention queues" onExport={onExport && (format => onExport('attention', format))}/>
    </div>}>
        <ul className="gov-bi-alerts">{items.map(([label, value, detail, icon, tone, url]) => {
            const row = <><Badge icon={icon} tone={tone}/><span><b>{label}</b><small>{detail}</small></span><strong>{count(value)}</strong>{url && <ChevronRight size={13} aria-hidden="true"/>}</>;
            return <li key={label}>{url ? <Link className="gov-bi-alert" to={url}>{row}</Link> : <div className="gov-bi-alert">{row}</div>}</li>;
        })}</ul>
        <div className="gov-bi-attention__related">
            {Array.isArray(data.asset_exceptions) && has('assets') && <DrillLink to="/gov/assets">{count(data.asset_exceptions.length)} flagged assets shown</DrillLink>}
            {Array.isArray(data.update_exceptions) && has('announcements') && <DrillLink to="/gov/announcements">{count(data.update_exceptions.length)} updates in review shown</DrillLink>}
        </div>
    </Panel>;
}

function QuickActions({ has, onExport }) {
    const routes = [
        ['work-orders', 'Work orders', '/gov/work-orders', Wrench, 'blue'],
        ['reports', 'Reports map', '/gov/map', MapPinned, 'orange'],
        ['records', 'Documents', '/gov/records-workspace?view=documents', FileText, 'blue'],
    ];
    return <Panel id="actions" description="Open your next workspace">
        <div className="gov-bi-quick">
            {routes.filter(([module]) => has(module)).map(([module, title, to, icon, tone]) => <Link className="gov-button" key={module} to={to}><Badge icon={icon} tone={tone}/>{title}</Link>)}
            <GovButton onClick={() => onExport?.('summary', 'csv')} disabled={!onExport}><Badge icon={Download} tone="green"/>Export CSV</GovButton>
        </div>
    </Panel>;
}

const ASSET_TILES = [
    ['Road assets', /^(road|roads|road network)$/, MapPinned],
    ['Bridges', /^bridges?$/, Layers],
    ['Drainage assets', /^drainage( systems?)?$/, Droplet],
    ['Buildings and facilities', /^(public )?(buildings?|facilit(y|ies))$/, Building2],
];

function Infrastructure({ inventory, has }) {
    const categories = Object.entries(inventory?.categories ?? {});
    const tiles = ASSET_TILES.map(([label, match, icon], index) => ({
        label, icon, tone: ['orange', 'blue', 'green', 'blue'][index],
        total: categories.reduce((sum, [key, value]) => sum + (match.test(key.trim().toLowerCase()) ? value : 0), 0),
    }));
    const other = inventory ? inventory.total - tiles.reduce((sum, tile) => sum + tile.total, 0) : 0;
    return <Panel id="infrastructure" description={inventory ? `${count(inventory.total)} registered assets in scope` : 'Recorded infrastructure inventory'} actions={<DrillLink to={has('assets') && '/gov/assets'}>Inventory</DrillLink>}>
        <img className="gov-bi-infrastructure-art" src="/caloocan-city-hall.jpg" alt="" loading="lazy"/>
        {inventory ? <>
            <div className="gov-bi-mini-grid">{tiles.map(({ label, total, icon, tone }) =>
                <div className="gov-bi-mini gov-bi-mini--asset" key={label}><Badge icon={icon} tone={tone}/><div><strong>{count(total)}</strong><span>{label}</span></div></div>
            )}</div>
            {categories.length > 0 && <div className="gov-bi-infrastructure-breakdown">
                {other > 0 && <span><strong>{count(other)}</strong> other assets</span>}
                <DataTable label="asset category" columns={['Recorded category', 'Assets']} rows={categories.map(([name, value]) => [name, count(value)])}/>
            </div>}
        </> : <p className="gov-bi-empty">Inventory totals are unavailable.</p>}
    </Panel>;
}

function OverviewTools({ data, onExport, showAssistant }) {
    const [assistantOpen, setAssistantOpen] = useState(false);
    return <>
        <footer className="gov-bi-surface gov-bi-footer" aria-labelledby="overview-tools-title">
            <header className="gov-bi-surface__head">
                <div><h2 id="overview-tools-title">Overview tools</h2></div>
                <ExportMenu label="overview summary" onExport={onExport && (format => onExport('summary', format))}/>
            </header>
            <div className="gov-bi-footer__actions">
                <details><summary><Info size={14} aria-hidden="true"/> Coverage and interpretation</summary><div className="gov-bi-footer__detail">
                    <p>Counts reflect permitted records at the source time shown above.</p>
                    <ul>{(data.limitations || []).map(limit => <li key={limit}>{limit}</li>)}</ul>
                    <p>Completion is the share of non-cancelled work orders opened in the last 30 days that have a recorded completion date.</p>
                    <p>Infrastructure figures count registry records. Road length and total city coverage are separate measures.</p>
                </div></details>
                {showAssistant && <GovButton aria-expanded={assistantOpen} onClick={() => setAssistantOpen(open => !open)}><MessageSquare size={14} aria-hidden="true"/>{assistantOpen ? 'Close overview assistant' : 'Overview assistant'}</GovButton>}
            </div>
        </footer>
        {assistantOpen && <GovAssistantSlot/>}
    </>;
}

export default function GovBiDashboard({ data, modules = [], onExport, showAssistant }) {
    const has = name => modules.includes(name);
    const details = data.dashboard;
    const inventory = details?.inventory;
    const reportTypes = details?.report_types;
    return <div className="gov-bi-dashboard">
        <Kpis data={data} has={has} onExport={onExport}/>
        <div className="gov-bi-workbench">
            <div className="gov-bi-charts">
                <WorkAreas scope={details?.work?.area_map} has={has}/>
                <Panel id="inventory" description="Status recorded in the asset registry">
                    {inventory ? <Distribution rows={Object.entries(inventory.statuses).map(([key, value]) => ({ label: key.replaceAll('_', ' '), count: value }))} noun="assets"/> : <p className="gov-bi-empty">Infrastructure status is unavailable.</p>}
                </Panel>
                <Trend id="intake" series={data.report_intake.series} lines={[{ key: 'count', label: 'Received', tone: 'orange' }]} onExport={onExport}/>
                <Trend id="trend" series={details?.work?.series} lines={[{ key: 'created', label: 'Created', tone: 'orange' }, { key: 'completed', label: 'Completed', tone: 'green' }]}/>
                <Panel id="types" description="Primary category of open reports">
                    {reportTypes ? <Distribution rows={reportTypes} noun="reports"/> : <p className="gov-bi-empty">Report category totals are unavailable.</p>}
                </Panel>
                <WorkStages data={data} has={has} onExport={onExport}/>
                <Performance completion={details?.work?.completion} feedback={details?.feedback}/>
                <ProjectTimeline projects={details?.projects} has={has} asOf={data.as_of}/>
                <Panel id="resources" description="Equipment, staff, vehicles and materials">
                    <ul className="gov-bi-stage-list gov-bi-resources">{['Equipment', 'Staff', 'Vehicles', 'Materials'].map(resource => <li key={resource}>
                        <span>{resource}</span><span className="gov-bi-track" aria-hidden="true"/><span aria-label="Unavailable">—</span>
                    </li>)}</ul>
                    <p className="gov-bi-empty">Utilization requires both allocation and capacity records.</p>
                </Panel>
                {has('reports') && <DemandChart data={data} onExport={onExport}/>}
            </div>
            <aside className="gov-bi-rail" aria-label="Actions, alerts, and infrastructure">
                <QuickActions has={has} onExport={onExport}/>
                <Attention data={data} has={has} onExport={onExport}/>
                <Infrastructure inventory={inventory} has={has}/>
                <OverviewTools data={data} onExport={onExport} showAssistant={showAssistant}/>
            </aside>
        </div>
    </div>;
}
