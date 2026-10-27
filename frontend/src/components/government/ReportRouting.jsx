import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Download, Plus, RefreshCw } from 'lucide-react';
import { GovButton, GovState, GovTabs, GovTable, GovConfirm, formatDate } from './GovWorkspace';
import { governmentRequest, useGovernmentData } from '../../utils/governmentApi';
import { getAuthToken } from '../../utils/authSession';
import { API_BASE_URL } from '../../utils/apiBase';
import './report-routing.css';

const label = value => String(value || '').replaceAll('_', ' ');
const localTime = value => {
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const COMMANDS = {
    approve: ['Approve letter', 'Approve this exact letter for dispatch? A separate send or handoff step follows.'],
    return_to_draft: ['Return to draft', 'The previous approved packet stays in history. Updated content needs a new approval.'],
    send: ['Queue email', 'Send the approved PDF to the recorded office. Provider acceptance will not mean the office accepted the case.'],
    record_manual_handoff: ['Record manual handoff', 'Record the actual receiving stamp or contact reference. This does not record acceptance or resolution.'],
    acknowledge: ['Record acknowledgment', 'Record a named office acknowledgment and its reference. An automated email reply is not acceptance.'],
    decline: ['Record declined referral', 'Record why the receiving office declined responsibility. The referral can then be rerouted.'],
    record_response: ['Record external response', 'Summarize the actual response and record its reference. Report resolution remains separate.'],
    close_coordination: ['Close coordination', 'Close this referral’s follow-up task after reviewing the response. The original report stays unchanged.'],
    cancel: ['Cancel referral', 'Keep the referral history. Cancellation does not recall a message already sent.'],
    assign_owner: ['Assign follow-up owner', 'Choose the CED employee accountable for the next follow-up.'],
    follow_up: ['Record follow-up', 'Record the contact attempt, outcome and next follow-up date.'],
    confirm_sent: ['Confirm send outcome', 'Record evidence that the uncertain send was accepted. Acknowledgment is still separate.'],
    confirm_not_sent: ['Confirm not sent', 'Record evidence that the uncertain attempt was not accepted. A new explicit send can follow.'],
    verify_report_resolution: ['Verify report outcome', 'Confirm the external response addressed the reported concern. This resolves the original report and notifies its resident.'],
};
const REFERENCE_ACTIONS = new Set(['record_manual_handoff', 'acknowledge', 'decline', 'record_response', 'close_coordination', 'confirm_sent', 'confirm_not_sent', 'verify_report_resolution']);
const FOLLOW_UP_ACTIONS = new Set(['record_manual_handoff', 'acknowledge', 'decline', 'record_response', 'assign_owner', 'follow_up', 'confirm_sent']);

function ReferralDraft({ options, existing, previous, onSaved, onCancel }) {
    const heading = useRef(null);
    useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
    const [values, setValues] = useState(() => ({ recipient_id: existing?.recipient_id || '', owner_id: existing?.owner_id || '', reason: existing?.reason || '', summary: existing?.summary || '', requested_action: existing?.requested_action || '', next_follow_up_at: localTime(existing?.next_follow_up_at), disclosure_reviewed: false }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const report = options.report;
    const change = (key, value) => setValues(old => ({ ...old, [key]: value }));
    async function save(event) {
        event.preventDefault();
        setBusy(true); setError('');
        try {
            const body = { ...values, report_id: report.id, expected_report_version: report.version, recipient_id: Number(values.recipient_id), owner_id: Number(values.owner_id), next_follow_up_at: new Date(values.next_follow_up_at).toISOString(), previous_referral_id: existing?.previous_referral_id || previous || null };
            const result = await governmentRequest(existing ? `/api/gov/referrals/${existing.id}?expected_version=${existing.version}` : '/api/gov/referrals', { method: existing ? 'PUT' : 'POST', body });
            onSaved(result);
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    return <section className="gov-referral-editor" aria-labelledby="referral-draft-title">
        <h2 id="referral-draft-title" ref={heading} tabIndex={-1}>{existing ? 'Edit referral draft' : previous ? 'Prepare rerouted referral' : 'Prepare a referral'}</h2>
        {previous && <p className="gov-note">The declined or cancelled referral remains in the record. This creates a separate draft.</p>}
        <form onSubmit={save}><fieldset disabled={busy}>
            <div className="gov-referral-fields">
                <label className="gov-field">Receiving office<select required value={values.recipient_id} onChange={e => change('recipient_id', e.target.value)}><option value="">Choose verified office</option>{options.recipients.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}{!p.email ? ' · manual handoff' : ''}</option>)}</select></label>
                <label className="gov-field">CED follow-up owner<select required value={values.owner_id} onChange={e => change('owner_id', e.target.value)}><option value="">Choose accountable employee</option>{options.owners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            </div>
            <label className="gov-field">Reviewed issue summary<textarea required minLength={10} maxLength={5000} rows={4} value={values.summary} onChange={e => change('summary', e.target.value)} placeholder="Describe only the reviewed facts the receiving office needs."/></label>
            <label className="gov-field">Reason for referral<textarea required minLength={10} maxLength={2000} rows={2} value={values.reason} onChange={e => change('reason', e.target.value)}/></label>
            <label className="gov-field">Requested action<textarea required minLength={10} maxLength={3000} rows={3} value={values.requested_action} onChange={e => change('requested_action', e.target.value)}/></label>
            <label className="gov-field">Next CED follow-up <span className="gov-note">Your local time</span><input required type="datetime-local" value={values.next_follow_up_at} onChange={e => change('next_follow_up_at', e.target.value)}/></label>
            <label className="gov-referral-check"><input required type="checkbox" checked={values.disclosure_reviewed} onChange={e => change('disclosure_reviewed', e.target.checked)}/><span>I reviewed the summary for necessary disclosure. Resident identity, contact details and original photos are excluded unless expressly authorized.</span></label>
            <p className="gov-note">The referral packet contains the letter only. No resident evidence is attached automatically.</p>
            {error && <p role="alert" className="gov-error">{error}</p>}
            <div className="gov-form-actions"><GovButton disabled={busy} onClick={onCancel}>Cancel</GovButton><button className="gov-button is-primary" type="submit">{busy ? 'Saving draft…' : 'Save draft'}</button></div>
        </fieldset></form>
    </section>;
}

function RecipientDirectory({ options, onSaved }) {
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', verification_reference: '', active: true });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const change = (key, value) => setForm(old => ({ ...old, [key]: value }));
    function select(person) { setEditing(person.id); setForm({ name: person.name, email: person.email || '', phone: person.phone || '', verification_reference: person.verification_reference, active: person.active, expected_version: person.version }); }
    async function save(event) {
        event.preventDefault(); setBusy(true); setError('');
        try {
            await governmentRequest(`/api/gov/referrals/recipients${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body: { ...form, email: form.email || null, phone: form.phone || null } });
            setEditing(null); setForm({ name: '', email: '', phone: '', verification_reference: '', active: true }); onSaved();
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    return <details className="gov-referral-directory"><summary>Recipient directory · {options.recipients.length} offices</summary>
        <ul>{options.recipients.map(person => <li key={person.id}><strong>{person.name}</strong><span>{person.email || 'No verified email · manual handoff'}{person.phone && ` · ${person.phone}`}{!person.active && ' · inactive'}</span><small>{person.verification_reference}</small>{options.can_manage_directory && <GovButton onClick={() => select(person)}>Edit recipient</GovButton>}</li>)}</ul>
        {!options.recipients.length && <p>No verified recipients are configured. An administrator must record an official contact and its verification source.</p>}
        {options.can_manage_directory && <form onSubmit={save}><fieldset disabled={busy}><h3>{editing ? 'Update verified recipient' : 'Add verified recipient'}</h3>
            <label className="gov-field">Official office/company name<input required minLength={3} maxLength={180} value={form.name} onChange={e => change('name', e.target.value)}/></label>
            <div className="gov-referral-fields"><label className="gov-field">Verified email <span className="gov-note">Leave blank for manual handoff</span><input type="email" value={form.email} onChange={e => change('email', e.target.value)}/></label><label className="gov-field">Contact number<input value={form.phone} maxLength={80} onChange={e => change('phone', e.target.value)}/></label></div>
            <label className="gov-field">Verification source and date<textarea required minLength={10} maxLength={2000} rows={2} value={form.verification_reference} onChange={e => change('verification_reference', e.target.value)}/></label>
            <label className="gov-referral-check"><input type="checkbox" checked={form.active} onChange={e => change('active', e.target.checked)}/>Active recipient</label>
            <p className="gov-note">Changing a contact invalidates unsent approvals that used its previous version.</p>
            {error && <p role="alert" className="gov-error">{error}</p>}<button type="submit" className="gov-button">{busy ? 'Saving…' : 'Save verified contact'}</button>
        </fieldset></form>}
    </details>;
}

function ReferralLetter({ item }) {
    const packet = item.packet;
    return <details className="gov-referral-letter" open><summary>Letter preview · {item.approved_at ? 'approved packet' : 'draft'}</summary><article aria-label="Referral letter preview">
        <p>City of Caloocan · City Engineering Department</p><h3>Request for coordination / referral</h3>
        <p>{item.approved_at ? 'Approved for dispatch' : 'Draft — not approved or sent'}<br/>{item.reference} · {packet.prepared_date}</p>
        <p><strong>To: {packet.recipient_name}</strong><br/>{packet.recipient_email || 'No verified email — manual handoff required'}<br/>{packet.recipient_phone}</p>
        <p>Subject: Referral of report {item.ticket_id}</p><p>Dear Receiving Office:</p>
        <p>The City Engineering Department requests your review and appropriate action on the concern described below.</p>
        {[['Recorded location', packet.location], ['Concern and reviewed facts', packet.summary], ['Reason for referral', packet.reason], ['Requested action', packet.requested_action]].map(([title, value]) => <section key={title}><h4>{title}</h4><p>{value}</p></section>)}
        <p>Please acknowledge receipt and advise whether your office accepts responsibility. Kindly quote the referral reference in your response and provide your own reference number, assigned contact, and any next steps.</p>
        <p>CED coordination owner: {packet.owner_name}<br/>CED follow-up scheduled: {packet.follow_up_label}<br/>Reply to: {packet.reply_to || 'To be configured before dispatch'}</p>
        <p>Prepared by: {packet.prepared_by}<br/>{packet.approver_name ? `Approved for dispatch by: ${packet.approver_name}` : 'Approval: pending'}</p>
        <small>Approval is recorded in PULSO. No reproduced signature or receiving-office acceptance is implied. Enclosures: this referral letter only.</small>
    </article></details>;
}

export default function ReportRouting({ reportId, startNew = false, onChanged }) {
    const [params, setParams] = useSearchParams();
    const selectedId = params.get('referral');
    const view = params.get('routingView') || 'all';
    const page = Number(params.get('referralPage')) || 1;
    const detail = useGovernmentData(selectedId ? `/api/gov/referrals/${selectedId}?report_id=${reportId}` : null);
    const sourceId = reportId;
    const options = useGovernmentData(`/api/gov/referrals/options${sourceId ? `?report_id=${sourceId}` : ''}`);
    const list = useGovernmentData(`/api/gov/referrals?view=${encodeURIComponent(view)}&page=${page}${reportId ? `&report_id=${reportId}` : ''}`);
    const [editing, setEditing] = useState(startNew);
    const [command, setCommand] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const commandForm = useRef(null);
    const detailHeading = useRef(null);
    const returnFocus = useRef(null);
    const item = detail.data;
    useEffect(() => { if (!editing && item?.id) detailHeading.current?.focus({ preventScroll: true }); }, [item?.id, editing]);
    const previous = params.get('previous');
    function change(values) { const next = new URLSearchParams(params); Object.entries(values).filter(([key]) => key !== 'report').forEach(([rawKey, value]) => { const key = rawKey === 'view' ? 'routingView' : rawKey === 'page' ? 'referralPage' : rawKey; if (value == null) next.delete(key); else next.set(key, value); }); setParams(next); setEditing(false); setError(''); }
    function refresh() { list.reload(); detail.reload(); options.reload(); onChanged?.(); }
    function closeDetails() { change({ referral: null }); setTimeout(() => returnFocus.current?.focus({ preventScroll: true }), 0); }
    function saved(result) { change({ referral: result.id, report: null, previous: null }); setEditing(false); refresh(); setNotice('Referral draft saved. Approval and sending are separate steps.'); }
    function start(value) { setCommand(value); setReason(''); setReference(''); setFollowUp(''); setOwnerId(''); setConfirmed(false); setError(''); }
    async function execute() {
        if (!commandForm.current?.reportValidity()) return;
        setBusy(true); setError('');
        try {
            await governmentRequest(`/api/gov/referrals/${item.id}/commands`, { method: 'POST', body: {
                action: command, expected_version: item.version, reason, reference: reference || null,
                owner_id: ownerId ? Number(ownerId) : null, next_follow_up_at: followUp ? new Date(followUp).toISOString() : null,
                expected_packet_hash: command === 'approve' ? item.preview_hash : item.packet_hash,
                report_issue_addressed: confirmed, expected_report_version: item.report_version,
            } });
            setNotice(`${COMMANDS[command][0]}: recorded.`); setCommand(''); refresh();
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    async function download(packetId = null) {
        setBusy(true); setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/referrals/${item.id}${packetId ? `/packets/${packetId}` : ''}/letter`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
            if (!response.ok) throw new Error('The letter could not be downloaded. Refresh the referral and try again.');
            const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `${item.reference}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    }
    return <section className="report-routing" aria-label="Report routing and follow-up">
        <div className="gov-referral-source"><h3>Office handoffs</h3><GovButton onClick={refresh}><RefreshCw size={15}/>Refresh routing</GovButton></div>
        {notice && <p role="status" className="gov-note">{notice}</p>}
        <GovState loading={options.loading && !options.data} error={options.error} onRetry={options.reload}/>
        {options.data && !options.error && <>
            {!options.data.approval_configured && <p className="gov-referral-notice">Outgoing approval authority has not been configured. Drafts and letter previews remain available.</p>}
            {!options.data.transport_ready && <p className="gov-note">Referral email is disabled or the sending mailbox is not configured. No email can be queued.</p>}
            {options.data.report && <div className="gov-referral-source">{!editing && !item && options.data.can_create && <GovButton primary onClick={() => setEditing(true)}><Plus size={15}/>Route to another office</GovButton>}</div>}
            {editing && options.data.report && <ReferralDraft key={item ? `${item.id}:${item.version}` : `new:${reportId}:${previous || ''}`} options={options.data} existing={item?.status === 'draft' ? item : null} previous={previous ? Number(previous) : null} onSaved={saved} onCancel={() => setEditing(false)}/>}
            {!editing && <>
                <GovTabs label="Referral queues" value={view} onChange={value => change({ view: value, page: null })} items={[{ value: 'all', label: 'All referrals' }, { value: 'mine', label: 'Assigned to me' }, { value: 'overdue', label: 'Follow-up overdue' }]}/>
                <GovState loading={list.loading && !list.data} error={list.error} onRetry={list.reload}/>
                {!list.error && list.data && <div className={`gov-referrals-layout ${selectedId ? 'has-detail' : ''}`}>
                    <GovTable label="External referral queue" rows={list.data.items} rowKey={row => row.id} selected={Number(selectedId)} onSelect={(row, trigger) => { returnFocus.current = trigger; change({ referral: row.id }); }} pagination={{ total: list.data.total, page, onChange: value => change({ page: value }) }} emptyMessage="No referrals in this queue" columns={[
                        { key: 'reference', label: 'Referral', render: row => <>{row.reference}<small>{row.ticket_id} · {row.recipient_name}</small></> },
                        { key: 'owner_name', label: 'CED owner' },
                        { key: 'status', label: 'Coordination', render: row => <>{label(row.status)}<small>Email: {label(row.transport)}</small></> },
                        { key: 'next_follow_up_at', label: 'Follow-up', render: row => <>{formatDate(row.next_follow_up_at)}{row.overdue && <small className="gov-referral-overdue">Overdue</small>}</> },
                    ]}/>
                    {selectedId && <section className="gov-referral-detail" aria-label="Selected external referral">
                        <div className="gov-referral-detail__heading"><h2 ref={detailHeading} tabIndex={-1}>{item?.reference || 'Referral details'}</h2><GovButton onClick={closeDetails}>Close details</GovButton></div>
                        <GovState loading={detail.loading && !item} error={detail.error} onRetry={detail.reload}/>
                        {item && !detail.error && <>
                            <dl className="gov-facts"><dt>Coordination</dt><dd>{label(item.status)}</dd><dt>Email transport</dt><dd>{label(item.transport)}{item.transport_error && <small>{label(item.transport_error)}</small>}</dd><dt>Receiving office</dt><dd>{item.recipient_name}</dd><dt>CED owner</dt><dd>{item.owner_name}</dd><dt>Follow-up</dt><dd>{formatDate(item.next_follow_up_at)}{item.overdue && ' · overdue'}</dd><dt>Report</dt><dd><Link to={`/gov/reports/${item.report_id}`}>{item.ticket_id}</Link> · {label(item.report_status)}</dd>{item.previous_referral_id && <><dt>Previous referral</dt><dd><button className="gov-text-button" onClick={() => change({ referral: item.previous_referral_id })}>Open previous referral</button></dd></>}</dl>
                            <p className="gov-note">Sending, acknowledgment and issue resolution are separate. No resident evidence is attached automatically.</p>
                            {item.approved_at && !item.recipient_current && item.status === 'approved' && <p role="alert" className="gov-error">The directory contact changed. Return to draft and approve the current recipient before dispatch.</p>}
                            <div className="gov-form-actions"><GovButton disabled={busy} onClick={() => download()}><Download size={15}/>Download {item.approved_at ? 'approved' : 'draft'} PDF</GovButton>
                                {item.allowed_actions.includes('edit') && <GovButton onClick={() => setEditing(true)}>Edit draft</GovButton>}
                                {item.allowed_actions.includes('reroute') && <GovButton onClick={() => change({ referral: null, report: item.report_id, previous: item.id })}>Prepare reroute</GovButton>}
                            </div>
                            <ReferralLetter item={item}/>
                            <div className="gov-form-actions">{item.allowed_actions.filter(action => COMMANDS[action]).map(action => <GovButton key={action} disabled={busy || (action === 'send' && !options.data.transport_ready)} primary={['approve', 'send'].includes(action)} onClick={() => start(action)}>{COMMANDS[action][0]}</GovButton>)}</div>
                            {item.status === 'draft' && options.data.can_approve && !item.allowed_actions.includes('approve') && <p className="gov-note">A different delegated employee must approve the draft.</p>}
                            {error && !command && <p role="alert" className="gov-error">{error}</p>}
                            <details className="gov-referral-history"><summary>Activity and dispatch history</summary><ol>{item.events.map(entry => <li key={entry.id}><strong>{label(entry.action)}</strong><time>{formatDate(entry.created_at)} · {entry.actor_name}</time><p>{entry.note}</p>{entry.facts.reference && <small>Reference: {entry.facts.reference}</small>}</li>)}</ol>{item.deliveries.map(delivery => <p key={delivery.id} className="gov-note">Attempt {delivery.id} · {label(delivery.status)} · {formatDate(delivery.created_at)}<br/>{delivery.message_id}</p>)}{item.approved_packets.map(packet => <p key={packet.id}><GovButton disabled={busy} onClick={() => download(packet.id)}>Approved PDF · {formatDate(packet.approved_at)}</GovButton></p>)}</details>
                        </>}
                    </section>}
                </div>}
            </>}
            <RecipientDirectory options={options.data} onSaved={options.reload}/>
        </>}
        <GovConfirm open={Boolean(command)} title={COMMANDS[command]?.[0] || ''} confirmLabel={COMMANDS[command]?.[0]} busy={busy} error={error} onClose={() => setCommand('')} onConfirm={execute}>
            <p>{COMMANDS[command]?.[1]}</p>{command === 'send' && <p><strong>{item?.recipient_name}</strong><br/>{item?.recipient_email}<br/>Attachment: {item?.reference}.pdf</p>}
            <form ref={commandForm} onSubmit={e => e.preventDefault()}>
                {command === 'assign_owner' && <label className="gov-field">CED follow-up owner<select required value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">Choose employee</option>{options.data?.owners.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
                <label className="gov-field">{command === 'record_response' ? 'Reviewed external response' : 'Decision / follow-up notes'}<textarea required minLength={10} maxLength={3000} rows={3} value={reason} onChange={e => setReason(e.target.value)}/></label>
                {REFERENCE_ACTIONS.has(command) && <label className="gov-field">Receiving-office / evidence reference<input required minLength={3} maxLength={255} value={reference} onChange={e => setReference(e.target.value)}/></label>}
                {FOLLOW_UP_ACTIONS.has(command) && <label className="gov-field">Next CED follow-up <span className="gov-note">Your local time</span><input required type="datetime-local" value={followUp} onChange={e => setFollowUp(e.target.value)}/></label>}
                {command === 'verify_report_resolution' && <label className="gov-referral-check"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I independently verified that the response addressed the reported concern.</label>}
            </form>
        </GovConfirm>
    </section>;
}
