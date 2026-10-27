import { createElement, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Plus, X, ExternalLink, Eye, PenLine, FileText, Upload, Heading2, List, Bold, MapPin, CalendarDays, Send, Save, Check, Link2, Landmark, Bell, Newspaper, Megaphone, TriangleAlert, ChevronRight } from 'lucide-react';
import { GovWorkspace, GovState, GovConfirm, reportUrl } from '../components/government/GovWorkspace';
import { governmentRequest, useGovernmentData } from '../utils/governmentApi';
import PublicationArticle from '../components/government/PublicationArticle';
import {PublicationButton, PublicationSelect, PublicationAccordion, PUBLICATION_INPUT, PUBLICATION_LABEL} from '../components/government/PublicationControls';
import './publication-editor.css';

const AMOUNT_TYPES = [{ value: 'approved_budget_for_contract', label: 'Approved budget for the contract (ABC)' }, { value: 'contract_award_amount', label: 'Awarded contract amount' }, { value: 'allocated_project_budget', label: 'Project allocation' }, { value: 'maintenance_allocation', label: 'Maintenance allocation' }];
const localDate = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

export default function GovAnnouncementEditor() {
    const { announcementId } = useParams();
    const [params] = useSearchParams();
    const id = announcementId || params.get('id');
    const record = useGovernmentData(id ? `/api/gov/announcements/${id}` : null);
    const permissions = useGovernmentData('/api/gov/announcements/permissions');
    const scope = useGovernmentData('/api/gov/announcements/scope-options');
    const loading = record.loading || permissions.loading || scope.loading;
    const error = record.error || permissions.error || scope.error;
    const allowed = id ? record.data?.allowed_actions.includes('edit') : permissions.data?.create;
    return <GovWorkspace title={id ? 'Edit publication' : 'Create a publication'} description="Write city news, issue an advisory or prepare a public announcement." parent={{ label: 'Updates', to: '/gov/announcements' }} actions={<Link className="gov-button" to={id ? `/gov/announcements?selected=${id}` : '/gov/announcements'}><ArrowLeft size={15} /> Back to updates</Link>}>
        <GovState loading={loading} error={error} onRetry={() => { record.reload(); permissions.reload(); scope.reload(); }} />
        {!loading && !error && (allowed ? <UpdateForm key={id || 'new'} initial={record.data} permissions={permissions.data} scope={scope.data} /> : <GovState empty title="This version cannot be edited">Open the update to review your available actions. Approved and published versions are protected from direct editing.</GovState>)}
    </GovWorkspace>;
}

export function UpdateForm({ initial, permissions, scope }) {
    const navigate = useNavigate();
    const [record, setRecord] = useState(initial);
    const bd = initial?.budget_disclosure;
    const [form, setForm] = useState(() => ({
        title_en: initial?.title_en || '', title_fil: initial?.title_fil || '', content_en: initial?.content_en || '', content_fil: initial?.content_fil || '',
        publication_format: initial?.publication_format || 'advisory', category: initial?.category || 'general_notice', priority: initial?.priority || 'normal',
        district_id: initial?.district_id ?? (!scope.citywide_allowed && scope.districts.length === 1 ? scope.districts[0].id : ''),
        target_barangays: initial?.target_barangays || [],
        publication_details: { summary_en: '', summary_fil: '', issuing_office: '', action_en: '', action_fil: '', ...initial?.publication_details, effective_from: localDate(initial?.publication_details?.effective_from), effective_until: localDate(initial?.publication_details?.effective_until) },
    }));
    const [links, setLinks] = useState(initial?.report_associations || []);
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [hasBudget, setHasBudget] = useState(bd?.amount != null);
    const [budget, setBudget] = useState({ amount: bd?.amount ?? '', amount_type: bd?.amount_type || 'approved_budget_for_contract', source_label: bd?.source_label || '', source_url: bd?.source_url || '', source_date: bd?.source_date || '', fiscal_period: bd?.fiscal_period || '', scope_caveat: bd?.scope_caveat || '', project_id: bd?.project_id || null, work_order_id: bd?.work_order_id || null, issuing_office: bd?.issuing_office || 'City Engineering Department' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [view, setView] = useState('write');
    const [language, setLanguage] = useState('en');
    const [areaSearch, setAreaSearch] = useState('');
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    const [publicSafe, setPublicSafe] = useState(false);
    const [savedMessage, setSavedMessage] = useState('');
    const [removing, setRemoving] = useState(null);
    const [dragging, setDragging] = useState(false);
    const formRef = useRef(null);
    const bodyRef = useRef(null);
    const fileRef = useRef(null);
    const details = form.publication_details;
    function field(name, value) { setSavedMessage('Unsaved changes'); setForm(f => ({ ...f, [name]: value })); }
    function detailField(name, value) { setSavedMessage('Unsaved changes'); setForm(f => ({ ...f, publication_details: { ...f.publication_details, [name]: value } })); }
    function budgetField(name, value) { setSavedMessage('Unsaved changes'); setBudget(b => ({ ...b, [name]: value })); }
    function linkField(id, name, value) { setSavedMessage('Unsaved changes'); setLinks(ls => ls.map(l => l.report_id === id ? { ...l, [name]: value } : l)); }
    function chooseFile(selected) {
        if (!selected || busy) return;
        if (selected.size > 15 * 1024 * 1024 || !/\.(pdf|png|jpe?g|webp|txt|docx|xlsx)$/i.test(selected.name)) {
            setError('Choose a PDF, image, TXT, DOCX or XLSX file up to 15 MB.'); return;
        }
        setError(''); setFile(selected); setCaption(''); setPublicSafe(false);
    }
    async function findReports() {
        setSearching(true); setHasSearched(false); setOptions([]); setError('');
        try { setOptions(await governmentRequest(`/api/gov/announcements/report-options?q=${encodeURIComponent(search)}`)); setHasSearched(true); } catch (e) { setError(e.message); } finally { setSearching(false); }
    }
    async function suggestions() {
        setSearching(true); setHasSearched(false); setOptions([]); setError('');
        try { setOptions(await governmentRequest(`/api/gov/announcements/${record.id}/suggest-reports`)); setHasSearched(true); } catch (e) { setError(e.message); } finally { setSearching(false); }
    }
    async function save(sendForReview = false, stay = false) {
        setBusy(true); setError('');
        let saved;
        try {
            const body = { ...form, publication_details: { ...details, effective_from: details.effective_from ? new Date(details.effective_from).toISOString() : null, effective_until: details.effective_until ? new Date(details.effective_until).toISOString() : null }, district_id: form.district_id === '' ? null : Number(form.district_id), target_audience: form.target_barangays.length ? 'barangay' : form.district_id ? 'district' : 'public', channels: ['web'],
                budget_disclosure: hasBudget ? { ...budget, amount: String(budget.amount), publication_format: form.publication_format, currency: 'PHP', review_state: 'draft', official_bidding_url: 'https://caloocancity.gov.ph/invitation-to-bid/' } : null,
                report_associations_input: links.map(l => ({ report_id: l.report_id, association_type: l.association_type || 'candidate', basis_reason: l.basis_reason || null })),
                ...(record ? { expected_version: record.content_version } : {}),
            };
            saved = await governmentRequest(record ? `/api/gov/announcements/${record.id}` : '/api/gov/announcements', { method: record ? 'PATCH' : 'POST', body });
            setRecord(saved);
            setSavedMessage('Draft saved');
            if (sendForReview) await governmentRequest(`/api/gov/announcements/${saved.id}/status`, { method: 'PATCH', body: { status: 'in_review', expected_version: saved.content_version } });
            if (!stay) navigate(`/gov/announcements?selected=${saved.id}`);
            return saved;
        } catch (e) { setError(`${saved ? 'Your draft was saved, but it could not be sent for review. ' : ''}${e.message}`); setConfirming(false); } finally { setBusy(false); }
    }
    async function uploadFile() {
        if (!file || !caption.trim() || !publicSafe || !formRef.current.reportValidity()) return;
        const saved = await save(false, true);
        if (!saved) return;
        setBusy(true); setError('');
        try {
            const body = new FormData(); body.append('file', file); body.append('caption', caption); body.append('public_safe', 'true'); body.append('expected_version', saved.content_version);
            const updated = await governmentRequest(`/api/gov/announcements/${saved.id}/attachments`, { method: 'POST', body });
            setRecord(updated); setFile(null); setCaption(''); setPublicSafe(false); fileRef.current.value = ''; setSavedMessage('Draft and document saved');
            if (!initial) navigate(`/gov/announcements/${updated.id}/edit`, { replace: true });
        } catch (e) { setError(`Your draft was saved. The document could not be attached: ${e.message}`); } finally { setBusy(false); }
    }
    async function removeFile() {
        setBusy(true); setError('');
        try { setRecord(await governmentRequest(`/api/gov/announcements/${record.id}/attachments/${removing.id}?expected_version=${record.content_version}`, { method: 'DELETE' })); setRemoving(null); } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    function insertText(before, after = '') {
        const input = bodyRef.current;
        const start = input.selectionStart, end = input.selectionEnd;
        const key = `content_${language}`;
        const text = form[key]; field(key, `${text.slice(0, start)}${before}${text.slice(start, end)}${after}${text.slice(end)}`);
        requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, end + before.length); });
    }
    const canonicalAreas = new Map();
    scope.barangays.filter(b => form.district_id ? b.district_id === Number(form.district_id) : scope.citywide_allowed).forEach(b => {
        const number = /^(?:barangay\s*)?(\d+)$/i.exec(b.name.trim())?.[1];
        const key = `${b.district_id}:${number || b.name.toLowerCase()}`;
        const existing = canonicalAreas.get(key);
        if (!existing || form.target_barangays.includes(b.name)) canonicalAreas.set(key, { ...b, label: number ? `Barangay ${number}` : b.name });
    });
    const areas = [...canonicalAreas.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    const wordCount=form[`content_${language}`].trim().split(/\s+/).filter(Boolean).length;
    const formats=[{value:'news',label:'News',icon:Newspaper},{value:'advisory',label:'Advisory',icon:TriangleAlert},{value:'announcement',label:'Announcement',icon:Megaphone}];
    const note='text-xs leading-relaxed text-[var(--gov-text-secondary)]';
    return <form className="publication-editor mx-auto max-w-[1440px] text-[var(--gov-text)]" ref={formRef} onSubmit={e=>{e.preventDefault();if(file)return;if(e.nativeEvent.submitter?.value==='review')setConfirming(true);else save(false);}}>
        <div className="-mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gov-rule)] bg-[var(--gov-canvas)] px-1 py-3">
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-[var(--gov-text-secondary)]" role="status"><span className={`h-2 w-2 shrink-0 rounded-full ${busy?'bg-[var(--workspace-accent)]':'bg-[var(--gov-rule)]'}`}/>{busy?'Saving…':savedMessage||'Unpublished draft'}{record&&<span className="hidden sm:inline">{record.announcement_id}</span>}</div>
            <div className="flex flex-wrap gap-2"><PublicationButton type="submit" value="draft" disabled={busy||Boolean(file)}><Save size={15}/>{busy?'Saving…':'Save draft'}</PublicationButton><PublicationButton primary type="submit" value="review" disabled={busy||Boolean(file)}><Send size={15}/>Send for review</PublicationButton></div>
        </div>
        {error&&<p className="gov-error mb-5" role="alert">{error}</p>}
        {file&&<p className="mb-4 flex items-center gap-2 text-xs text-[var(--gov-text-secondary)]" role="status"><FileText size={15}/>Attach or clear the selected document before saving or sending for review.</p>}
        <div className="publication-editor__scroll" role="region" aria-label="Publication fields" tabIndex={0}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] p-1" role="group" aria-label="Editor view">{[['write','Write',PenLine],['preview','Resident preview',Eye]].map(([value,label,Icon])=><PublicationButton key={value} quiet aria-pressed={view===value} onClick={()=>setView(value)} className={view===value?'border-[var(--gov-rule)]! bg-[var(--gov-surface)]! text-[var(--gov-text)]!':''}>{createElement(Icon,{size:15,'aria-hidden':true})}{label}</PublicationButton>)}</div>
            <div className="flex items-center gap-1" role="group" aria-label="Content language">{[['en','English'],['fil','Filipino']].map(([value,label])=><PublicationButton quiet key={value} aria-pressed={language===value} onClick={()=>setLanguage(value)} className={language===value?'bg-[var(--workspace-selection)]! text-[var(--gov-selection-ink)]!':''}>{label}{language===value&&<Check size={13}/>}</PublicationButton>)}</div>
        </div>
        {view==='preview'&&<div className="mx-auto max-w-[860px] rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface)] p-5 sm:p-10"><p className={`${note} mb-6 flex items-center gap-2`}><Eye size={15}/>Resident preview · Not published</p><PublicationArticle item={{...form,attachments:record?.attachments||[]}} language={language} draftId={record?.id}/></div>}
        <fieldset className="grid min-w-0 grid-cols-1 items-start gap-6 border-0 p-0 min-[1100px]:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_336px]" hidden={view!=='write'} disabled={view!=='write'||busy}>
            <div className="min-w-0">
                <section className="gov-surface overflow-hidden rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface)]" aria-label="Publication content">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gov-rule)] px-5 py-4 sm:px-8">
                        <div className="flex flex-wrap gap-1" role="group" aria-label="Publication format">{formats.map(({value,label,icon:Icon})=><PublicationButton key={value} quiet aria-pressed={form.publication_format===value} onClick={()=>field('publication_format',value)} className={form.publication_format===value?'bg-[var(--workspace-selection)]! text-[var(--gov-selection-ink)]!':''}>{createElement(Icon,{size:16,'aria-hidden':true})}{label}</PublicationButton>)}</div>
                    </div>
                    <div className="px-5 pb-8 pt-7 sm:px-8 sm:pt-9 lg:px-10">
                        <label className={`${PUBLICATION_LABEL} mb-6`}><span>{language==='fil'?'Pamagat sa Filipino':'Headline'}</span><input className="w-full min-w-0 border-0 border-b border-transparent bg-transparent py-2 text-[clamp(24px,2.8vw,36px)] font-semibold leading-tight tracking-tight text-[var(--gov-text)] placeholder:text-[var(--gov-text-secondary)] focus:border-[var(--workspace-accent)] focus:outline-none" required={language==='en'} minLength={3} maxLength={255} placeholder="Publication headline" value={form[`title_${language}`]} onChange={e=>field(`title_${language}`,e.target.value)}/></label>
                        <label className={`${PUBLICATION_LABEL} mb-7`}><span>{language==='fil'?'Maikling buod':'Short introduction'}</span><textarea className="w-full resize-y rounded-md border-0 bg-transparent px-0 py-2 text-base font-normal leading-relaxed text-[var(--gov-text)] placeholder:text-[var(--gov-text-secondary)] focus:outline-3 focus:outline-offset-3 focus:outline-[var(--workspace-focus)]" rows={2} maxLength={600} value={details[`summary_${language}`]} onChange={e=>detailField(`summary_${language}`,e.target.value)} placeholder="Briefly describe the update."/></label>
                        <div className="mb-2 flex items-center justify-between gap-3"><label className="text-xs font-semibold" htmlFor="publication-body">{language==='fil'?'Nilalaman':'Article body'}</label><span className="text-[11px] tabular-nums text-[var(--gov-text-secondary)]">{wordCount} {wordCount===1?'word':'words'}</span></div>
                        <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] p-1.5" role="group" aria-label="Text formatting"><PublicationButton quiet onClick={()=>insertText('## ')} aria-label="Insert heading"><Heading2 size={16}/><span className="hidden sm:inline">Heading</span></PublicationButton><PublicationButton quiet onClick={()=>insertText('**','**')} aria-label="Format selected text as bold"><Bold size={16}/><span className="hidden sm:inline">Bold</span></PublicationButton><PublicationButton quiet onClick={()=>insertText('- ')} aria-label="Insert list item"><List size={16}/><span className="hidden sm:inline">List</span></PublicationButton><span className="ml-auto hidden pr-2 text-[11px] text-[var(--gov-text-secondary)] sm:inline">Text formatting</span></div>
                        <textarea id="publication-body" ref={bodyRef} className="block min-h-80 w-full resize-y rounded-b-lg border border-[var(--gov-rule)] bg-[var(--gov-surface)] p-4 text-[15px] leading-8 text-[var(--gov-text)] placeholder:text-[var(--gov-text-secondary)] focus:outline-3 focus:outline-offset-2 focus:outline-[var(--workspace-focus)] sm:p-5" required={language==='en'} minLength={10} rows={13} value={form[`content_${language}`]} onChange={e=>field(`content_${language}`,e.target.value)} placeholder={form.publication_format==='advisory'?'Describe the affected service, location and schedule.':'Write the publication here.'}/>
                        {form.publication_format==='advisory'&&<label className={`${PUBLICATION_LABEL} mt-7`}>{language==='fil'?'Gabay sa residente':'What residents should do'}<textarea className={PUBLICATION_INPUT} rows={3} maxLength={2000} value={details[`action_${language}`]} onChange={e=>detailField(`action_${language}`,e.target.value)} placeholder="Add any instructions residents need to follow."/></label>}
                        {language==='fil'&&<p className={`${note} mt-4`}>English is shown when a Filipino translation is unavailable.</p>}
                    </div>
                </section>
                <section className="mt-7" aria-labelledby="publication-documents-heading">
                    <div className="mb-4 flex items-start gap-3"><FileText size={19} className="mt-0.5 shrink-0 text-[var(--gov-text-secondary)]"/><div><h2 id="publication-documents-heading" className="text-sm font-semibold">Documents and images</h2><p className={`${note} mt-1`}>PDFs and images display inside the published article.</p></div></div>
                    {(record?.attachments||[]).map(f=><div className="flex items-center gap-3 border-b border-[var(--gov-rule)] py-4" key={f.id}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--gov-rule)] bg-[var(--gov-surface)]"><FileText size={18}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{f.caption}</strong><small className="mt-1 block truncate text-xs text-[var(--gov-text-secondary)]">{f.name} · {f.media_type==='application/pdf'||f.media_type.startsWith('image/')?'Inline preview':'Download attachment'}</small></span><PublicationButton quiet onClick={()=>setRemoving(f)} aria-label={`Remove ${f.name}`}><X size={16}/></PublicationButton></div>)}
                    <label onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files[0]);}} className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-[var(--workspace-focus)] motion-reduce:transition-none ${dragging?'border-[var(--workspace-accent)] bg-[var(--workspace-selection)]':'border-[var(--gov-rule)] bg-[var(--gov-surface)] hover:border-[var(--workspace-accent)] hover:bg-[var(--gov-surface-subtle)]'}`}><input ref={fileRef} type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx" onChange={e=>chooseFile(e.target.files[0])}/><Upload size={24} className="text-[var(--gov-text-secondary)]"/><span className="text-sm font-semibold">Choose a file or drop it here</span><span className={note}>PDF, image, TXT, DOCX or XLSX · Up to 15 MB</span><span className="rounded-md border border-[var(--gov-rule)] bg-[var(--gov-surface)] px-3 py-2 text-xs font-semibold">Browse files</span></label>
                    {file&&<div className="mt-4 space-y-4 rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface)] p-5"><div className="flex items-center gap-3"><FileText size={18}/><p className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</p><span className="text-xs tabular-nums text-[var(--gov-text-secondary)]">{(file.size/1024/1024).toFixed(1)} MB</span></div><label className={PUBLICATION_LABEL}>Document title or image description<input className={PUBLICATION_INPUT} maxLength={500} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Title residents will see"/></label><label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[var(--gov-text-secondary)]"><input className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--workspace-accent)]" type="checkbox" checked={publicSafe} onChange={e=>setPublicSafe(e.target.checked)}/>I checked this file for private information and it is cleared for public release.</label><div className="flex flex-wrap gap-2"><PublicationButton primary disabled={busy||!publicSafe||caption.trim().length<3} onClick={uploadFile}><Upload size={15}/>Save draft and attach</PublicationButton><PublicationButton quiet disabled={busy} onClick={()=>{setFile(null);fileRef.current.value='';}}>Clear file</PublicationButton></div></div>}
                </section>
            </div>
            <aside className="gov-surface min-w-0 rounded-xl border border-[var(--gov-rule)] bg-[var(--gov-surface)] px-5 py-2 sm:px-6" aria-label="Publication settings">
                <div className="flex items-center justify-between border-b border-[var(--gov-rule)] py-4"><h2 className="text-sm font-semibold">Publication settings</h2><span className="rounded-md bg-[var(--gov-surface-subtle)] px-2 py-1 text-[11px] text-[var(--gov-text-secondary)]">Draft</span></div>
                <PublicationAccordion title="Details and schedule" icon={CalendarDays} open><label className={PUBLICATION_LABEL}>Issuing office<input className={PUBLICATION_INPUT} maxLength={200} value={details.issuing_office} onChange={e=>detailField('issuing_office',e.target.value)} placeholder="Responsible office"/></label><PublicationSelect label="Priority" value={form.priority} onChange={e=>field('priority',e.target.value)}><option value="normal">Normal information</option><option value="urgent">Urgent advisory</option><option value="emergency">Emergency notice</option></PublicationSelect>{form.publication_format==='advisory'&&<><label className={PUBLICATION_LABEL}>Effective from<input className={PUBLICATION_INPUT} type="datetime-local" value={details.effective_from||''} onChange={e=>detailField('effective_from',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Effective until<input className={PUBLICATION_INPUT} type="datetime-local" value={details.effective_until||''} onChange={e=>detailField('effective_until',e.target.value)}/></label></>}</PublicationAccordion>
                <PublicationAccordion title="Audience and location" icon={MapPin} summary={form.target_barangays.length?`${form.target_barangays.length} selected`:form.district_id?'District scope':scope.citywide_allowed?'Citywide':'Choose district'} open>
                    <PublicationSelect label="District" required={!scope.citywide_allowed} value={form.district_id} onChange={e=>{setSavedMessage('Unsaved changes');setForm(f=>({...f,district_id:e.target.value,target_barangays:[]}));}}>{scope.citywide_allowed&&<option value="">Citywide</option>}{!scope.citywide_allowed&&<option value="">Choose district</option>}{scope.districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</PublicationSelect>
                    <PublicationSelect label="Category" value={form.category} onChange={e=>field('category',e.target.value)}>{[['general_notice','General notice'],['planned_works','Planned work'],['service_interruption','Service interruption'],['progress_update','Work progress'],['work_completed','Completed work'],['advisory','Public advisory'],['news_release','News release']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</PublicationSelect>
                    <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold">Specific barangays <span className="font-normal text-[var(--gov-text-secondary)]">(optional)</span></legend><label className="relative block"><span className="sr-only">Search barangays</span><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gov-text-secondary)]"/><input className={`${PUBLICATION_INPUT} pl-9`} type="search" placeholder="Search barangays" value={areaSearch} onChange={e=>setAreaSearch(e.target.value)}/></label><div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--gov-rule)] p-1 [scrollbar-gutter:stable]">{areas.filter(b=>b.label.toLowerCase().includes(areaSearch.toLowerCase())).map(b=><label key={b.id} className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-xs transition-colors hover:bg-[var(--gov-surface-subtle)] ${form.target_barangays.includes(b.name)?'bg-[var(--workspace-selection)] font-medium':''}`}><input className="h-4 w-4 accent-[var(--workspace-accent)]" type="checkbox" checked={form.target_barangays.includes(b.name)} onChange={e=>field('target_barangays',e.target.checked?[...form.target_barangays,b.name]:form.target_barangays.filter(name=>name!==b.name))}/>{b.label}</label>)}{!areas.some(b=>b.label.toLowerCase().includes(areaSearch.toLowerCase()))&&<p className="p-3 text-xs text-[var(--gov-text-secondary)]">{form.district_id||scope.citywide_allowed?'No matching barangays.':'Choose a district to select barangays.'}</p>}</div><p className={`${note} mt-2`}>{form.target_barangays.length?`${form.target_barangays.length} barangays selected`:form.district_id||scope.citywide_allowed?'All areas in this scope':'No district selected'}</p>{form.target_barangays.length>0&&<div className="mt-3 flex flex-wrap gap-1.5">{form.target_barangays.map(name=><button type="button" key={name} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--gov-rule)] bg-[var(--gov-surface-subtle)] px-2 text-[11px]" onClick={()=>field('target_barangays',form.target_barangays.filter(n=>n!==name))} aria-label={`Remove ${name}`}>{name}<X size={12}/></button>)}</div>}</fieldset>
                </PublicationAccordion>
                <PublicationAccordion title="Related reports" icon={Link2} summary={String(links.length)}>
                    <p className={note}>Reviewed connections can notify the report owner after publication.</p><label className={PUBLICATION_LABEL}>Find a report<input className={PUBLICATION_INPUT} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticket, issue or barangay"/></label><div className="flex flex-wrap gap-2"><PublicationButton disabled={search.trim().length<2||searching} onClick={findReports}><Search size={14}/>{searching?'Searching…':'Search'}</PublicationButton>{record&&<PublicationButton disabled={searching} onClick={suggestions}>Find area matches</PublicationButton>}</div>
                    {options.length>0&&<ul className="divide-y divide-[var(--gov-rule)]">{options.filter(o=>!links.some(l=>l.report_id===o.report_id)).map(o=><li key={o.report_id} className="space-y-2 py-3"><strong className="text-xs">{o.ticket_id||`Report ${o.report_id}`}</strong><p className={note}>{o.report_title} · {o.report_barangay||'Location not recorded'}</p><PublicationButton onClick={()=>{setSavedMessage('Unsaved changes');setLinks(ls=>[...ls,{...o,association_type:'candidate',basis_reason:''}]);}}><Plus size={14}/>Add candidate</PublicationButton></li>)}</ul>}
                    {hasSearched&&!searching&&options.filter(option=>!links.some(link=>link.report_id===option.report_id)).length===0&&<p className={note} role="status">{options.length?'All matching reports are already linked.':'No matching reports.'}</p>}
                    <ul className="divide-y divide-[var(--gov-rule)]">{links.map(l=><li key={l.report_id} className="space-y-3 py-4"><div className="flex items-center justify-between gap-2"><Link className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--workspace-accent)] hover:underline" to={reportUrl(l.report_id)} target="_blank">{l.ticket_id||`Report ${l.report_id}`}<ExternalLink size={12}/></Link>{(permissions.review||l.association_type==='candidate')&&<PublicationButton quiet onClick={()=>{setSavedMessage('Unsaved changes');setLinks(ls=>ls.filter(x=>x.report_id!==l.report_id));}} aria-label={`Remove report ${l.ticket_id||l.report_id}`}><X size={14}/></PublicationButton>}</div><p className={note}>{l.report_title}</p><PublicationSelect label="Relationship" disabled={!permissions.review} value={l.association_type||'candidate'} onChange={e=>linkField(l.report_id,'association_type',e.target.value)}><option value="candidate">Candidate · internal only</option><option value="contextual_relevance">Reviewed · may be relevant</option><option value="confirmed_coverage">Reviewed · work covers report</option><option value="rejected">Not related</option><option value="revoked">Relationship revoked</option></PublicationSelect><label className={PUBLICATION_LABEL}>Review reason<input className={PUBLICATION_INPUT} disabled={!permissions.review} required={l.association_type!=='candidate'} minLength={l.association_type!=='candidate'?10:undefined} value={l.basis_reason||''} onChange={e=>linkField(l.report_id,'basis_reason',e.target.value)} placeholder="Describe the connection"/></label></li>)}</ul>{!links.length&&<p className={note}>No reports linked.</p>}
                </PublicationAccordion>
                <PublicationAccordion title="Budget disclosure" icon={Landmark} summary={hasBudget?'Included':'Optional'}>
                    <p className={note}>Display a sourced amount for public information. Financial processing stays with the responsible office.</p><label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed"><input className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--workspace-accent)]" type="checkbox" checked={hasBudget} onChange={e=>{setSavedMessage('Unsaved changes');setHasBudget(e.target.checked);}}/>Include a disclosed amount</label>
                    {hasBudget&&<><label className={PUBLICATION_LABEL}>Amount (PHP)<input className={PUBLICATION_INPUT} type="number" min="0" step="0.01" required value={budget.amount} onChange={e=>budgetField('amount',e.target.value)}/></label><PublicationSelect label="Amount type" value={budget.amount_type} onChange={e=>budgetField('amount_type',e.target.value)}>{AMOUNT_TYPES.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</PublicationSelect><label className={PUBLICATION_LABEL}>Source document title<input className={PUBLICATION_INPUT} required value={budget.source_label} onChange={e=>budgetField('source_label',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Original document URL<input className={PUBLICATION_INPUT} type="url" required value={budget.source_url} onChange={e=>budgetField('source_url',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Source date<input className={PUBLICATION_INPUT} type="date" required value={budget.source_date} onChange={e=>budgetField('source_date',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Fiscal or coverage period<input className={PUBLICATION_INPUT} value={budget.fiscal_period} onChange={e=>budgetField('fiscal_period',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Issuing office<input className={PUBLICATION_INPUT} required value={budget.issuing_office} onChange={e=>budgetField('issuing_office',e.target.value)}/></label><label className={PUBLICATION_LABEL}>Scope and caveat<textarea className={PUBLICATION_INPUT} rows={3} value={budget.scope_caveat} onChange={e=>budgetField('scope_caveat',e.target.value)}/></label></>}
                    <a className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--workspace-accent)] hover:underline" href="https://caloocancity.gov.ph/invitation-to-bid/" target="_blank" rel="noreferrer">Official bidding opportunities<ExternalLink size={12}/></a>
                </PublicationAccordion>
                <section className="flex items-start gap-2.5 py-5"><Bell size={16} className="mt-0.5 shrink-0 text-[var(--gov-text-secondary)]"/><div><h2 className="text-xs font-semibold">Resident notifications</h2><p className={`${note} mt-2`}>Reviewed report links identify residents eligible for a private notification. Their saved channel preferences apply.</p></div></section>
            </aside>
        </fieldset>
        <p className={`${note} mt-6 flex items-start gap-2 border-t border-[var(--gov-rule)] pt-5`}><ChevronRight size={15} className="mt-0.5 shrink-0"/>Sending for review does not publish this version. Approval and public release are separate decisions.</p>
        </div>
        <GovConfirm open={Boolean(removing)} title="Remove this document from the draft?" confirmLabel="Remove document" onClose={()=>setRemoving(null)} onConfirm={removeFile} busy={busy} error={error}><p>{removing?.name} will be removed from this draft. Previously published documents remain with the released version.</p></GovConfirm>
        <GovConfirm open={confirming} title="Send this update for review?" confirmLabel="Save and send for review" onClose={()=>setConfirming(false)} onConfirm={()=>save(true)} busy={busy} error={error}><p>The current content, audience, report relationships and optional disclosure will be saved for review. This does not publish the update.</p></GovConfirm>
    </form>;
}
