import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, RefreshCw, Search, X } from 'lucide-react';
import GovSidebar from '../GovSidebar';
import GovUserDropdown from '../GovUserDropdown';
import GovNotificationDropdown from '../GovNotificationDropdown';
import ThemeToggle from '../ThemeToggle';
import { getAuthUser } from '../../utils/authSession';
import './gov-workspace.css';

export function GovWorkspace({ title, description, parent, actions, children, className = '' }) {
    const [navOpen, setNavOpen] = useState(false);
    const dialog = useRef(null);
    const trigger = useRef(null);
    const location = useLocation();
    const user = getAuthUser();
    useEffect(() => { setNavOpen(false); }, [location.pathname, location.search]);
    useEffect(() => {
        const el = dialog.current;
        if (navOpen && !el.open) el.showModal();
        if (!navOpen && el.open) el.close();
    }, [navOpen]);
    return <div className={`gov-core-workspace ${className}`}>
        <a className="gov-skip" href="#gov-main">Skip to workspace</a>
        <div className="gov-core-workspace__nav"><GovSidebar currentUser={user} responsive={false} /></div>
        <dialog ref={dialog} className="gov-nav-dialog" aria-label="Government navigation" onClose={() => { setNavOpen(false); trigger.current?.focus(); }} onClick={e => { if (e.target === e.currentTarget) setNavOpen(false); }}>
            <button className="gov-button gov-nav-close" onClick={() => setNavOpen(false)}><X size={16} /> Close navigation</button>
            <GovSidebar currentUser={user} responsive={false} onTabChange={() => setNavOpen(false)} />
        </dialog>
        <div className="gov-core-workspace__body">
            <GovPageHeader title={title} description={description} parent={parent} user={user} navigation={<button ref={trigger} className="gov-button gov-menu-trigger" onClick={() => setNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>}/>
            {actions && <div className="gov-page-actions">{actions}</div>}
            <main id="gov-main" tabIndex={-1} className="gov-page-content">{import.meta.env.DEV && <p className="gov-development-note">Local development · records are not verified city data.</p>}{children}</main>
        </div>
    </div>;
}

export function GovPageHeader({title, description, parent, user, navigation}) {
    return <header className="gov-page-header">
        {navigation}
        <div className="gov-page-heading">
            {parent && <div className="gov-breadcrumb"><Link to={parent.to}>{parent.label}</Link><span aria-hidden="true">/</span><span>{title}</span></div>}
            <h1>{title}</h1>{description && <p>{description}</p>}
        </div>
        <div className="gov-page-header__account"><GovNotificationDropdown/><ThemeToggle responsiveBreakpoint="xl"/><GovUserDropdown currentUser={user}/></div>
    </header>;
}

export function GovButton({ children, primary, className = '', ...props }) {
    return <button type="button" className={`gov-button ${primary ? 'is-primary' : ''} ${className}`} {...props}>{children}</button>;
}

export function GovSearch({ value, onChange, placeholder = 'Search records', label = placeholder }) {
    return <label className="gov-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{label}</span><input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

export function GovSelect({ label, value, onChange, options, ...props }) {
    return <label className="gov-filter"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)} {...props}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

export function GovStatus({ value, label }) {
    const text = label || String(value || 'Not recorded').replaceAll('_', ' ');
    const tone = /^(resolved|completed|published|approved)$/.test(value) ? 'success' : /^(critical|rejected|withdrawn|failed)$/.test(value) ? 'danger' : /^(high|blocked|needs_information|in_review|awaiting_verification|completed_pending_review|rework_required)$/.test(value) ? 'warning' : 'neutral';
    return <span className={`gov-status is-${tone}`}><span aria-hidden="true" />{text}</span>;
}

export function GovState({ loading, error, empty, title = 'No records here yet', children, onRetry }) {
    const location=useLocation();
    if (loading) return <div className="gov-state" role="status" aria-live="polite"><div className="gov-loading-line" /><p>Loading records…</p></div>;
    if (error) return <div className="gov-state gov-state--error" role="alert"><h2>We couldn’t load this view</h2><p>{error}</p>{error==='Your session has expired. Sign in again to continue.' ? <Link className="gov-button is-primary" to={`/gov?returnTo=${encodeURIComponent(location.pathname+location.search)}`}>Sign in again</Link> : onRetry && <GovButton onClick={onRetry}><RefreshCw size={15} /> Try again</GovButton>}</div>;
    if (empty) return <div className="gov-state"><h2>{title}</h2>{children && <p>{children}</p>}</div>;
    return null;
}

export function GovTabs({ items, value, onChange, label }) {
    return <nav className="gov-view-tabs" aria-label={label}>{items.map(item => item.to ? <Link key={item.value} to={item.to} aria-current={value === item.value ? 'page' : undefined} className={value === item.value ? 'is-selected' : ''}>{item.label}</Link> : <button key={item.value} type="button" onClick={() => onChange(item.value)} aria-pressed={value === item.value} className={value === item.value ? 'is-selected' : ''}>{item.label}{item.count != null && <span>{item.count}</span>}</button>)}</nav>;
}

export function GovDetail({ title, onClose, children, actions }) {
    const heading = useRef(null);
    useEffect(() => { heading.current?.focus({ preventScroll: window.innerWidth >= 1280 }); }, [title]);
    return <section className="gov-record-detail" aria-label={title}>
        <header><div><button className="gov-text-button gov-detail-back" onClick={onClose}><ArrowLeft size={16} /> Back to list</button><h2 ref={heading} tabIndex={-1}>{title}</h2></div><GovButton onClick={onClose} aria-label="Close record details"><X size={18} /></GovButton></header>
        <div className="gov-record-detail__content">{children}</div>
        {actions && <footer>{actions}</footer>}
    </section>;
}

export function GovTable({ columns, rows, rowKey, selected, onSelect, label, emptyMessage = 'No matching records', pageSize = 15, pagination }) {
    const [page, setPage] = useState(1);
    const total = pagination?.total ?? rows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(pagination?.page ?? page, pages);
    const setCurrent = pagination?.onChange ?? setPage;
    const visible = pagination ? rows : rows.slice((current - 1) * pageSize, current * pageSize);
    return <div className="gov-record-table">
        <div className="gov-table-scroll" role="region" aria-label={label} tabIndex={0}>
            <table><caption className="sr-only">{label}</caption><thead><tr>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
                <tbody>{visible.map(row => <GovRecordRow key={rowKey(row)} row={row} columns={columns} selected={selected===rowKey(row)} onSelect={onSelect}/>)}{!rows.length && <tr><td colSpan={columns.length}><GovState empty title={emptyMessage}>Change the filters or search to see other records.</GovState></td></tr>}</tbody>
            </table>
        </div>
        <div className="gov-table-footer"><span>{total ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} of ${total}` : '0 records'}</span><div><GovButton aria-label="Previous page" disabled={current === 1} onClick={() => setCurrent(current - 1)}><ChevronLeft size={16} /></GovButton><span>Page {current} of {pages}</span><GovButton aria-label="Next page" disabled={current >= pages} onClick={() => setCurrent(current + 1)}><ChevronRight size={16} /></GovButton></div></div>
    </div>;
}

export function GovRecordRow({row,columns,selected,onSelect}) {
    function open(event) {
        if(event.target.closest('button,a,input,select,textarea,summary,label,[role="button"],[role="checkbox"],[role="link"],[role="switch"],[contenteditable="true"]')||window.getSelection()?.toString())return;
        const trigger=event.currentTarget.querySelector('.gov-record-link');
        trigger?.focus({preventScroll:true});
        onSelect(row,trigger);
    }
    return <tr className={`${selected?'is-selected':''} ${onSelect?'is-openable':''}`} onClick={onSelect?open:undefined}>
        {columns.map((column,index)=><td key={column.key} data-label={column.label}>{index===0&&onSelect?<button type="button" className="gov-record-link" onClick={event=>onSelect(row,event.currentTarget)} aria-expanded={selected}>{column.render?column.render(row):row[column.key]}</button>:<div className="gov-cell-value">{column.render?column.render(row):row[column.key]??'Not recorded'}</div>}</td>)}
    </tr>;
}

export function GovConfirm({ open, title, children, confirmLabel = 'Confirm', onConfirm, onClose, busy, error, className = '' }) {
    const titleId = useId();
    const ref = useRef(null);
    const priorFocus = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        if (!open) return;
        priorFocus.current = document.activeElement;
        const fallback = dialog.closest('.gov-record-detail, .report-docket')?.querySelector('h2[tabindex]');
        if (!dialog.open) dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
            const destination = priorFocus.current?.isConnected ? priorFocus.current : fallback;
            if (destination?.isConnected) destination.focus({ preventScroll: true });
        };
    }, [open]);
    return <dialog className={`gov-confirm ${className}`} ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><h2 id={titleId}>{title}</h2>{children}{error && <p role="alert" className="gov-error">{error}</p>}<div className="gov-form-actions"><GovButton disabled={busy} onClick={onClose}>Cancel</GovButton><GovButton primary disabled={busy} onClick={onConfirm}>{busy ? 'Saving…' : confirmLabel}</GovButton></div></dialog>;
}

export function formatDate(value) { return value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'; }
export function reportUrl(id) { return `/gov/reports?reportId=${encodeURIComponent(id)}`; }
