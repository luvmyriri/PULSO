import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    Download,
    Eye,
    FileCheck,
    Filter,
    History,
    Inbox,
    Layers,
    Lock,
    MapPin,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    UploadCloud,
    X,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import SearchInput from '../components/SearchInput';
import './records-workspace.css';

const RECORDS_TABS = [
    { key: 'documents', label: 'Working documents', mode: 'docs' },
    { key: 'official', label: 'Official records', mode: 'docs' },
    { key: 'timeline', label: 'Process timeline', mode: 'audit' },
    { key: 'audit', label: 'Audit trail', mode: 'audit' },
    { key: 'registry', label: 'Records registry', mode: 'docs' },
];

const INITIAL_DOCS = [
    {
        id: 1,
        record_id: 'DOC-2026-0412',
        title: 'Morning Field Sheet – May 15, 2026',
        version: 'v2.3',
        classification: 'Internal',
        owner: 'Luis Morales',
        office: 'Field Operations Team',
        linked_object: 'WO-2026-1182',
        location: '176 Deparo St., Brgy. 176, North Caloocan City',
        doc_type: 'Field sheet',
        file_format: 'PDF (3.4 MB)',
        legal_hold: 'None',
        retention: '7 years (Review 2033)',
        updated_at: 'May 15, 2026 08:21 AM PHT',
        integrity: 'verified',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        versions: [
            { version: 'v2.3', time: 'May 15, 2026 08:21 AM PHT', author: 'Luis Morales (Engineer II)', note: 'Added drainage notes p.2 & verified water flow' },
            { version: 'v2.2', time: 'May 15, 2026 07:40 AM PHT', author: 'Luis Morales (Engineer II)', note: 'Corrected geographic coordinates for inlet #4' },
            { version: 'v2.1', time: 'May 15, 2026 07:05 AM PHT', author: 'Luis Morales (Engineer II)', note: 'Initial field capture and evidence photo sync' },
        ],
        notes: 'Governed field inspection notes for drainage clearing and culvert desilting. Includes before/after spatial stamps.',
    },
    {
        id: 2,
        record_id: 'DOC-2026-0408',
        title: 'Inspection Notes – Camarin St. Drain',
        version: 'v1.0',
        classification: 'Official',
        owner: 'Marga Dela Cruz',
        office: 'Quality & Inspection Division',
        linked_object: 'WO-2026-1165',
        location: 'Camarin Rd., Brgy. 172, North Caloocan City',
        doc_type: 'Inspection report',
        file_format: 'PDF (2.1 MB)',
        legal_hold: 'None',
        retention: '5 years (Review 2031)',
        updated_at: 'May 15, 2026 07:58 AM PHT',
        integrity: 'verified',
        checksum: '7d557c4587c6999e03d4a2a6b281f08c3e8006d649d21160a36efd8d7b3eb6c3',
        versions: [
            { version: 'v1.0', time: 'May 15, 2026 07:58 AM PHT', author: 'Marga Dela Cruz (Engineer II)', note: 'Initial sign-off and baseline hydrostatic measurement' },
        ],
        notes: 'Formal hydraulic capacity inspection report for Camarin drainage artery following heavy precipitation.',
    },
    {
        id: 3,
        record_id: 'DOC-2026-0397',
        title: 'Drainage Survey Pickets & Elevation Matrix',
        version: 'v2.1',
        classification: 'Internal',
        owner: 'Ramon Cruz',
        office: 'Survey & Planning Division',
        linked_object: 'PRJ-2026-0045',
        location: '10th Ave., Brgy. 167, North Caloocan City',
        doc_type: 'Topographic survey',
        file_format: 'DWG/PDF (14.8 MB)',
        legal_hold: 'None',
        retention: '10 years (Permanent)',
        updated_at: 'May 14, 2026 05:12 PM PHT',
        integrity: 'verified',
        checksum: 'a8f5f167f44f4964e6c998dee827110c01759f37efcf4489a2eb2d3deca7c83f',
        versions: [
            { version: 'v2.1', time: 'May 14, 2026 05:12 PM PHT', author: 'Ramon Cruz (Surveyor)', note: 'Benchmark adjusted against NAMRIA geodetic monument' },
            { version: 'v2.0', time: 'May 12, 2026 02:30 PM PHT', author: 'Ramon Cruz (Surveyor)', note: 'Initial total station survey capture' },
        ],
        notes: 'Topographic level survey and benchmark reference table for North Caloocan drainage expansion capital project.',
    },
    {
        id: 4,
        record_id: 'REC-2025-0211',
        title: 'Work Order Closeout Package & Certificate',
        version: 'v1.2',
        classification: 'Official',
        owner: 'Ana Reyes',
        office: 'Office of the City Engineer',
        linked_object: 'WO-2026-1170',
        location: 'Bagumbong Rd., Brgy. 170, North Caloocan City',
        doc_type: 'Completion certificate',
        file_format: 'PDF (5.6 MB)',
        legal_hold: 'None',
        retention: '10 years (Review 2036)',
        updated_at: 'May 14, 2026 04:42 PM PHT',
        integrity: 'verified',
        checksum: '8f434346648f6b96df89dda901c5176b10e6d0ceec3e6a88b0a1d600e60ab62b',
        versions: [
            { version: 'v1.2', time: 'May 14, 2026 04:42 PM PHT', author: 'Ana Reyes (Senior Engineer)', note: 'Certified and endorsed by City Engineer' },
            { version: 'v1.1', time: 'May 13, 2026 11:15 AM PHT', author: 'Field Supervisor Team A', note: 'Added contractor punch list clearance' },
        ],
        notes: 'Statutory certificate of project completion and warranty acceptance for Bagumbong arterial rehabilitation.',
    },
    {
        id: 5,
        record_id: 'DOC-2025-0366',
        title: 'Depot Fleet & Equipment Checklist',
        version: 'v1.1',
        classification: 'Internal',
        owner: 'Jon Cruz',
        office: 'Depot Fleet Operations',
        linked_object: 'ASSET-EQP-0136',
        location: 'North Caloocan Central Depot, Brgy. 175',
        doc_type: 'Fleet checklist',
        file_format: 'XLSX (1.2 MB)',
        legal_hold: 'None',
        retention: '3 years (Review 2029)',
        updated_at: 'May 14, 2026 11:20 AM PHT',
        integrity: 'needs_review',
        checksum: '6e04d49d9c22998a183597dcf56b8568c8b4226d9cfd1b827e69a03e1e247472',
        versions: [
            { version: 'v1.1', time: 'May 14, 2026 11:20 AM PHT', author: 'Jon Cruz (Technician II)', note: 'Odometer corrected following maintenance cycle' },
            { version: 'v1.0', time: 'May 10, 2026 08:00 AM PHT', author: 'Jon Cruz (Technician II)', note: 'Quarterly fleet inspection' },
        ],
        notes: 'Excavator and backhoe operational health log. Flagged for review due to pending mechanical sign-off.',
    },
];

const INITIAL_AUDIT_EVENTS = [
    {
        id: 'EVT-2026-0054321',
        time: 'May 15, 08:21 AM PHT',
        event: 'Work order field update',
        state_from: 'In progress',
        state_to: 'In progress',
        actor: 'Luis Morales (Engineer II)',
        source: 'Mobile app (v3.14.2)',
        related_object: 'WO-2026-1182',
        reason: 'Update notes & photos',
        result: 'Success',
        correlation_id: '3f9ce88c-1e24-4a3b-9e8e-0a3bb2c364e5',
        signature: 'sig_ed25519_88a91f37e4c2b9a01',
        details: 'Updated drainage notes and hydrostatic flow measurement on page 2. Attached 2 geo-tagged photos.',
    },
    {
        id: 'EVT-2026-0054320',
        time: 'May 15, 07:58 AM PHT',
        event: 'Photo evidence uploaded',
        state_from: 'In progress',
        state_to: 'In progress',
        actor: 'Luis Morales (Engineer II)',
        source: 'Mobile app (v3.14.2)',
        related_object: 'WO-2026-1182',
        reason: 'Documentation proof',
        result: 'Success',
        correlation_id: '2c8be88c-1e24-4a3b-9e8e-0a3bb2c364e1',
        signature: 'sig_ed25519_77b81e26d3b1a8902',
        details: 'Uploaded 2 site photos of cleared culvert at 176 Deparo St. with GPS accuracy radius 2.4 m.',
    },
    {
        id: 'EVT-2026-0054319',
        time: 'May 15, 07:40 AM PHT',
        event: 'Status transition triggered',
        state_from: 'Assigned',
        state_to: 'In progress',
        actor: 'System (PULSO Orchestrator)',
        source: 'PULSO core service',
        related_object: 'WO-2026-1182',
        reason: 'Worker geo-fence check-in',
        result: 'Success',
        correlation_id: '1a7be88c-1e24-4a3b-9e8e-0a3bb2c364e0',
        signature: 'sig_ed25519_66c70d15c2a097803',
        details: 'Worker checked in within 50m radius of work order site. Automated dispatch timer initiated.',
    },
    {
        id: 'EVT-2026-0054318',
        time: 'May 15, 06:12 AM PHT',
        event: 'Crew assignment updated',
        state_from: 'Planned',
        state_to: 'Assigned',
        actor: 'Ana Reyes (Senior Engineer)',
        source: 'PULSO gov workspace',
        related_object: 'WO-2026-1182',
        reason: 'Reassign field crew',
        result: 'Success',
        correlation_id: '0f6be88c-1e24-4a3b-9e8e-0a3bb2c364df',
        signature: 'sig_ed25519_55d6fc04b19f86704',
        details: 'Assigned work order to Field Crew B (lead: Luis Morales) under North Caloocan Drainage Directive.',
    },
    {
        id: 'EVT-2026-0054317',
        time: 'May 14, 05:45 PM PHT',
        event: 'BoQ package approved',
        state_from: 'Design & estimate',
        state_to: 'Approval',
        actor: 'City Engineer Office',
        source: 'PULSO gov workspace',
        related_object: 'PRJ-2026-0045',
        reason: 'Formal budget certification',
        result: 'Success',
        correlation_id: '9e5ad77b-0d13-392a-8d7d-f92aa1b253ce',
        signature: 'sig_ed25519_44e5eb93a08e75605',
        details: 'BoQ package #PRJ-2026-0045 verified at P1,245,800.00 across 24 items with statutory contingency.',
    },
    {
        id: 'EVT-2026-0054316',
        time: 'May 14, 04:30 PM PHT',
        event: 'Citizen report triaged',
        state_from: 'Received',
        state_to: 'Verified',
        actor: 'Marga Dela Cruz (Engineer II)',
        source: 'PULSO triage console',
        related_object: 'PUL-2026-0822',
        reason: 'Evidence verification',
        result: 'Success',
        correlation_id: '8d4ac66a-fc02-2819-7c6c-e81990a142bd',
        signature: 'sig_ed25519_33d4da829f7d64506',
        details: 'Verified high-risk exposed electrical wire from resident upload. Work order WO-2026-1197 generated.',
    },
];

export default function RecordsWorkspacePage({ workspace = 'records' }) {
    const prefersReducedMotion = useReducedMotion();
    const [params, setParams] = useSearchParams();
    const [docs, setDocs] = useState(INITIAL_DOCS);
    const [auditEvents] = useState(INITIAL_AUDIT_EVENTS);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [classificationFilter, setClassificationFilter] = useState('all');
    const [integrityFilter, setIntegrityFilter] = useState('all');

    // Feedback & modal states
    const [toastMessage, setToastMessage] = useState(null);
    const [copiedDocHash, setCopiedDocHash] = useState(false);
    const [copiedCorrelationId, setCopiedCorrelationId] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const recordRowRefs = useRef(new Map());
    const docketCloseRef = useRef(null);
    const [uploadForm, setUploadForm] = useState({
        title: '',
        classification: 'Internal',
        linked_object: 'WO-2026-1182',
        doc_type: 'Field sheet',
        location: '176 Deparo St., Brgy. 176',
        retention: '7 years (Review 2033)',
    });

    const activeTab = params.get('view') || 'documents';
    const isAuditMode = activeTab === 'timeline' || activeTab === 'audit';

    const selectedDocId = Number(params.get('doc')) || null;
    const selectedEventId = params.get('evt') || null;
    const activeSelectionId = isAuditMode ? selectedEventId : selectedDocId;
    const [docketLayoutOpen, setDocketLayoutOpen] = useState(Boolean(activeSelectionId));
    const showDocketLayout = docketLayoutOpen || Boolean(activeSelectionId);

    const docketMotion = prefersReducedMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.08 } },
            exit: { opacity: 0, transition: { duration: 0.08 } },
        }
        : {
            initial: { opacity: 0.96, x: 8 },
            animate: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
            },
            exit: {
                opacity: 0.96,
                x: 8,
                transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
            },
        };

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value) next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    const closeRecordsDocket = useCallback(() => {
        const key = isAuditMode ? 'evt' : 'doc';
        const closingId = isAuditMode ? selectedEventId : selectedDocId;
        setDocketLayoutOpen(true);
        setParams((current) => {
            const next = new URLSearchParams(current);
            next.delete(key);
            return next;
        }, { replace: true });
        window.requestAnimationFrame(() => recordRowRefs.current.get(`${key}:${closingId}`)?.focus());
    }, [isAuditMode, selectedDocId, selectedEventId, setParams]);

    const toggleRecordDocket = (key, id) => {
        const selectedId = key === 'evt' ? selectedEventId : selectedDocId;
        if (String(selectedId) === String(id)) {
            closeRecordsDocket();
            return;
        }
        setDocketLayoutOpen(true);
        updateParam(key, String(id));
    };

    const switchRecordsTab = (tabKey) => {
        setDocketLayoutOpen(false);
        setParams((current) => {
            const next = new URLSearchParams(current);
            next.set('view', tabKey);
            next.delete('doc');
            next.delete('evt');
            return next;
        }, { replace: true });
    };

    useEffect(() => {
        if (!activeSelectionId) return undefined;
        const focusFrame = window.requestAnimationFrame(() => docketCloseRef.current?.focus());
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeRecordsDocket();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeSelectionId, closeRecordsDocket]);

    const filteredDocs = useMemo(() => {
        return docs.filter((doc) => {
            const matchesSearch =
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.record_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.linked_object.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesClassification =
                classificationFilter === 'all' || doc.classification.toLowerCase() === classificationFilter.toLowerCase();
            const matchesIntegrity =
                integrityFilter === 'all' || doc.integrity === integrityFilter;
            return matchesSearch && matchesClassification && matchesIntegrity;
        });
    }, [docs, searchQuery, classificationFilter, integrityFilter]);

    const filteredAuditEvents = useMemo(() => {
        return auditEvents.filter((evt) => {
            return (
                evt.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                evt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                evt.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                evt.related_object.toLowerCase().includes(searchQuery.toLowerCase()) ||
                evt.correlation_id.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [auditEvents, searchQuery]);

    const selectedDoc = docs.find((d) => d.id === selectedDocId) || null;
    const selectedEvent = auditEvents.find((e) => e.id === selectedEventId) || null;

    const copyDocChecksum = () => {
        if (selectedDoc?.checksum) {
            navigator.clipboard.writeText(selectedDoc.checksum);
            setCopiedDocHash(true);
            showToast('SHA-256 integrity hash copied to clipboard.');
            setTimeout(() => setCopiedDocHash(false), 2500);
        }
    };

    const copyCorrelationId = () => {
        if (selectedEvent?.correlation_id) {
            navigator.clipboard.writeText(selectedEvent.correlation_id);
            setCopiedCorrelationId(true);
            showToast('Correlation UUID copied to clipboard.');
            setTimeout(() => setCopiedCorrelationId(false), 2500);
        }
    };

    const handleVerifyIntegrity = (doc) => {
        showToast(`Cryptographic integrity check passed: SHA-256 matches verified ledger for ${doc.record_id}.`);
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!uploadForm.title.trim()) {
            showToast('Document title is required.');
            return;
        }

        const newDoc = {
            id: Date.now(),
            record_id: `DOC-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
            title: uploadForm.title.trim(),
            version: 'v1.0',
            classification: uploadForm.classification,
            owner: currentUser?.full_name || currentUser?.username || 'Luis Morales',
            office: currentUser?.division || 'City Engineering Operations',
            linked_object: uploadForm.linked_object || 'WO-2026-1182',
            location: uploadForm.location || 'North Caloocan City',
            doc_type: uploadForm.doc_type,
            file_format: 'PDF (1.8 MB)',
            legal_hold: 'None',
            retention: uploadForm.retention,
            updated_at: 'Just now',
            integrity: 'verified',
            checksum: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
            versions: [
                {
                    version: 'v1.0',
                    time: 'Just now',
                    author: currentUser?.full_name || 'Luis Morales',
                    note: 'Initial registered upload',
                },
            ],
            notes: 'Newly registered official record with cryptographically verified checksum.',
        };

        setDocs([newDoc, ...docs]);
        setIsUploadOpen(false);
        setUploadForm({
            title: '',
            classification: 'Internal',
            linked_object: 'WO-2026-1182',
            doc_type: 'Field sheet',
            location: '176 Deparo St., Brgy. 176',
            retention: '7 years (Review 2033)',
        });
        updateParam('doc', String(newDoc.id));
        showToast(`Document ${newDoc.record_id} registered and hashed successfully.`);
    };

    const handleExportTimeline = () => {
        const rows = [
            ['Event ID', 'Timestamp (PHT)', 'Event Name', 'State From', 'State To', 'Actor', 'Source System', 'Related Object', 'Result', 'Correlation ID', 'Cryptographic Signature', 'Details'],
            ...auditEvents.map((evt) => [
                evt.id,
                evt.time,
                evt.event,
                evt.state_from,
                evt.state_to,
                evt.actor,
                evt.source,
                evt.related_object,
                evt.result,
                evt.correlation_id,
                evt.signature,
                `"${evt.details.replace(/"/g, '""')}"`,
            ]),
        ];

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `pulso_immutable_audit_timeline_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Exported immutable audit timeline (CSV) with SHA-256 correlation chain.');
    };

    return (
        <div className="records-page">
            <GovSidebar currentUser={currentUser} />
            <div className="records-shell">
                {/* Topbar */}
                <header className="records-topbar relative z-50">
                    <div className="records-topbar__title-group flex flex-col text-left">
                        <GovBreadcrumb category="Records & Compliance" current="Official Records" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Documents and official records</h1>
                        <p>Document registry, SHA-256 integrity custody, retention schedules, and immutable process audit trail.</p>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Data as of today 08:42 AM PHT</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={() => showToast('Records ledger and audit stream synchronized.')}
                            aria-label="Refresh records"
                            title="Refresh records"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Tab Bar (Image 4 Panels 1 & 2) */}
                <div className="records-tabs-bar">
                    <div className="records-tabs-list" role="tablist">
                        {RECORDS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`records-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                onClick={() => switchRecordsTab(tab.key)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="records-actions-bar">
                        {!isAuditMode ? (
                            <>
                                <button
                                    type="button"
                                    className="work-orders-create-btn"
                                    onClick={() => setIsUploadOpen(true)}
                                >
                                    <UploadCloud size={14} /> Upload document
                                </button>
                                <button
                                    type="button"
                                    className="gov-btn-secondary"
                                    onClick={() => {
                                        setUploadForm((prev) => ({ ...prev, classification: 'Official', doc_type: 'Statutory certificate' }));
                                        setIsUploadOpen(true);
                                    }}
                                >
                                    <FileCheck size={14} /> Create record
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="work-orders-create-btn"
                                onClick={handleExportTimeline}
                            >
                                <Download size={14} /> Export timeline (CSV)
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="records-controls-bar">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={!isAuditMode ? "Search records by ID, title, owner or object" : "Search timeline by event, actor or ID"}
                        ariaLabel={!isAuditMode ? "Search records by ID, title, owner or object" : "Search timeline by event, actor or ID"}
                        onClear={() => setSearchQuery('')}
                        className="w-full sm:w-[320px] md:w-[360px]"
                    />

                    {!isAuditMode && (
                        <div className="records-filter-group">
                            <label className="records-filter-label" htmlFor="filter-classification">
                                <Filter size={12} /> Classification:
                            </label>
                            <select
                                id="filter-classification"
                                value={classificationFilter}
                                onChange={(e) => setClassificationFilter(e.target.value)}
                                className="records-select"
                            >
                                <option value="all">All classifications</option>
                                <option value="Internal">Internal</option>
                                <option value="Official">Official</option>
                                <option value="Public">Public</option>
                            </select>

                            <label className="records-filter-label" htmlFor="filter-integrity">
                                Integrity:
                            </label>
                            <select
                                id="filter-integrity"
                                value={integrityFilter}
                                onChange={(e) => setIntegrityFilter(e.target.value)}
                                className="records-select"
                            >
                                <option value="all">All states</option>
                                <option value="verified">Verified</option>
                                <option value="needs_review">Needs review</option>
                            </select>
                        </div>
                    )}
                </div>

                <main className="records-main">
                    {!isAuditMode ? (
                        /* ── PANEL 1: DOCUMENTS & RECORDS REGISTRY ─────────────────────────── */
                        <div className={`records-layout-split${showDocketLayout ? ' is-docket-open' : ''}`}>
                            <Motion.section
                                layout
                                transition={{ layout: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                                className="records-queue-region"
                                aria-label="Document records"
                            >
                            <div className="records-table-wrapper">
                                <table className="records-table" aria-label="Documents registry table">
                                    <thead>
                                        <tr>
                                            <th>Record ID</th>
                                            <th>Title</th>
                                            <th>Version</th>
                                            <th>Classification</th>
                                            <th>Owner</th>
                                            <th>Linked object</th>
                                            <th>Updated (PHT)</th>
                                            <th>Retention</th>
                                            <th>Integrity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDocs.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--gov-text-secondary)' }}>
                                                    <Inbox size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                                                    No document records matching criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDocs.map((doc) => {
                                                const isSelected = doc.id === selectedDocId;
                                                return (
                                                    <tr
                                                        key={doc.id}
                                                        ref={(node) => {
                                                            if (node) recordRowRefs.current.set(`doc:${doc.id}`, node);
                                                            else recordRowRefs.current.delete(`doc:${doc.id}`);
                                                        }}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => toggleRecordDocket('doc', doc.id)}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        aria-selected={isSelected}
                                                        aria-expanded={isSelected}
                                                        aria-controls="records-document-docket"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                toggleRecordDocket('doc', doc.id);
                                                            }
                                                        }}
                                                    >
                                                        <td className="records-cell-mono">
                                                            <div className="records-signal-marker-cell">
                                                                {isSelected && <span className="records-signal-cut" />}
                                                                <span>{doc.record_id}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <strong>{doc.title}</strong>
                                                            <div style={{ fontSize: 11, color: 'var(--gov-text-secondary)' }}>{doc.doc_type}</div>
                                                        </td>
                                                        <td>
                                                            <span className="records-version-pill">{doc.version}</span>
                                                        </td>
                                                        <td>
                                                            <span className={`gov-state-badge is-${doc.classification.toLowerCase() === 'official' ? 'completed' : 'assigned'}`}>
                                                                {doc.classification}
                                                            </span>
                                                        </td>
                                                        <td>{doc.owner}</td>
                                                        <td className="records-cell-mono" style={{ color: 'var(--gov-action)' }}>
                                                            {doc.linked_object}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{doc.updated_at}</td>
                                                        <td style={{ color: 'var(--gov-text-secondary)' }}>{doc.retention}</td>
                                                        <td>
                                                            <span className={`gov-integrity-badge is-${doc.integrity}`}>
                                                                {doc.integrity === 'verified' ? (
                                                                    <ShieldCheck size={13} />
                                                                ) : (
                                                                    <ShieldAlert size={13} />
                                                                )}
                                                                {doc.integrity === 'verified' ? 'Verified' : 'Needs review'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            </Motion.section>

                            <AnimatePresence initial={false} onExitComplete={() => setDocketLayoutOpen(false)}>
                            {selectedDoc && (
                                <Motion.aside
                                    id="records-document-docket"
                                    key="records-document-docket"
                                    className="records-docket-card"
                                    role="dialog"
                                    aria-modal="false"
                                    aria-labelledby="records-document-docket-title"
                                    initial={docketMotion.initial}
                                    animate={docketMotion.animate}
                                    exit={docketMotion.exit}
                                >
                                    <div className="records-docket-header">
                                        <div className="records-docket-signal-cut" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 id="records-document-docket-title">{selectedDoc.title}</h3>
                                            <div className="records-docket-badges">
                                                <span className="records-version-pill">{selectedDoc.version}</span>
                                                <span className={`gov-state-badge is-${selectedDoc.classification.toLowerCase() === 'official' ? 'completed' : 'assigned'}`}>
                                                    {selectedDoc.classification}
                                                </span>
                                                <span className={`gov-integrity-badge is-${selectedDoc.integrity}`}>
                                                    <ShieldCheck size={12} /> {selectedDoc.integrity}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            ref={docketCloseRef}
                                            type="button"
                                            className="records-docket-close"
                                            onClick={closeRecordsDocket}
                                            aria-label="Close document details"
                                            title="Close document details"
                                        >
                                            <X size={18} aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="records-meta-grid">
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Record ID:</span>
                                            <span className="records-meta-value records-mono">{selectedDoc.record_id}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Document type:</span>
                                            <span className="records-meta-value">{selectedDoc.doc_type}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Custodian / Owner:</span>
                                            <span className="records-meta-value">{selectedDoc.owner}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Division / Office:</span>
                                            <span className="records-meta-value">{selectedDoc.office}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Linked object:</span>
                                            <span className="records-meta-value records-mono" style={{ color: 'var(--gov-action)' }}>{selectedDoc.linked_object}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Geographic scope:</span>
                                            <span className="records-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <MapPin size={12} style={{ color: 'var(--gov-pulse)', flexShrink: 0 }} />
                                                {selectedDoc.location}
                                            </span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">File format:</span>
                                            <span className="records-meta-value">{selectedDoc.file_format}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Legal hold status:</span>
                                            <span className="records-meta-value">{selectedDoc.legal_hold}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Retention rule:</span>
                                            <span className="records-meta-value">{selectedDoc.retention}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Last modified:</span>
                                            <span className="records-meta-value">{selectedDoc.updated_at}</span>
                                        </div>
                                    </div>

                                    {/* SHA-256 Checksum Container */}
                                    <div className="records-checksum-container">
                                        <div className="records-checksum-header">
                                            <span className="records-section-label">
                                                <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                SHA-256 Integrity Checksum
                                            </span>
                                            <button
                                                type="button"
                                                onClick={copyDocChecksum}
                                                className="records-copy-button"
                                                aria-label="Copy SHA-256 checksum"
                                            >
                                                <Copy size={12} /> {copiedDocHash ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <div className="records-checksum-box">{selectedDoc.checksum}</div>
                                    </div>

                                    {/* Actions */}
                                    <div className="records-docket-actions">
                                        <button
                                            type="button"
                                            className="gov-btn-primary"
                                            onClick={() => setPreviewDoc(selectedDoc)}
                                        >
                                            <Eye size={14} /> Preview document
                                        </button>
                                        <button
                                            type="button"
                                            className="gov-btn-secondary"
                                            onClick={() => showToast(`Initiating download for ${selectedDoc.record_id} (${selectedDoc.file_format})...`)}
                                        >
                                            <Download size={14} /> Download
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="records-verify-btn"
                                        onClick={() => handleVerifyIntegrity(selectedDoc)}
                                    >
                                        <ShieldCheck size={14} /> Verify cryptographic checksum against ledger
                                    </button>

                                    {/* Version History Stack */}
                                    <div className="records-version-section">
                                        <span className="records-section-label">
                                            <History size={12} style={{ display: 'inline', marginRight: 4 }} />
                                            Version history & custody log:
                                        </span>
                                        <div className="records-version-history">
                                            {selectedDoc.versions.map((v, i) => (
                                                <div key={i} className="records-version-item">
                                                    <div className="records-version-item-header">
                                                        <span className="records-version-pill">{v.version}</span>
                                                        <span className="records-version-time">{v.time}</span>
                                                    </div>
                                                    <div className="records-version-author">By {v.author}</div>
                                                    <p className="records-version-note">{v.note}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Motion.aside>
                            )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        /* ── PANEL 2: PROCESS TIMELINE & IMMUTABLE AUDIT TRAIL ─────────────────────── */
                        <div className={`records-layout-split${showDocketLayout ? ' is-docket-open' : ''}`}>
                            <Motion.section
                                layout
                                transition={{ layout: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
                                className="records-queue-region"
                                aria-label="Audit events"
                            >
                            <div className="records-table-wrapper">
                                <table className="records-table" aria-label="Audit trail table">
                                    <thead>
                                        <tr>
                                            <th>Time (PHT)</th>
                                            <th>Event ID</th>
                                            <th>Event name</th>
                                            <th>State transition</th>
                                            <th>Actor</th>
                                            <th>Source system</th>
                                            <th>Related object</th>
                                            <th>Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAuditEvents.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--gov-text-secondary)' }}>
                                                    <Inbox size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.6 }} />
                                                    No audit events matching criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAuditEvents.map((evt) => {
                                                const isSelected = evt.id === selectedEventId;
                                                return (
                                                    <tr
                                                        key={evt.id}
                                                        ref={(node) => {
                                                            if (node) recordRowRefs.current.set(`evt:${evt.id}`, node);
                                                            else recordRowRefs.current.delete(`evt:${evt.id}`);
                                                        }}
                                                        className={isSelected ? 'is-selected' : ''}
                                                        onClick={() => toggleRecordDocket('evt', evt.id)}
                                                        style={{ cursor: 'pointer' }}
                                                        tabIndex={0}
                                                        aria-selected={isSelected}
                                                        aria-expanded={isSelected}
                                                        aria-controls="records-audit-docket"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                toggleRecordDocket('evt', evt.id);
                                                            }
                                                        }}
                                                    >
                                                        <td style={{ whiteSpace: 'nowrap' }}>{evt.time}</td>
                                                        <td className="records-cell-mono">
                                                            <div className="records-signal-marker-cell">
                                                                {isSelected && <span className="records-signal-cut" />}
                                                                <span>{evt.id}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <strong>{evt.event}</strong>
                                                        </td>
                                                        <td>
                                                            <div className="records-transition-badge">
                                                                <span>{evt.state_from}</span>
                                                                <ArrowRight size={10} style={{ color: 'var(--gov-action)' }} />
                                                                <span className="records-transition-to">{evt.state_to}</span>
                                                            </div>
                                                        </td>
                                                        <td>{evt.actor}</td>
                                                        <td>
                                                            <span className="records-source-badge">{evt.source}</span>
                                                        </td>
                                                        <td className="records-cell-mono" style={{ color: 'var(--gov-action)' }}>
                                                            {evt.related_object}
                                                        </td>
                                                        <td>
                                                            <span className="gov-integrity-badge is-verified">
                                                                <Check size={12} /> {evt.result}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            </Motion.section>

                            <AnimatePresence initial={false} onExitComplete={() => setDocketLayoutOpen(false)}>
                            {selectedEvent && (
                                <Motion.aside
                                    id="records-audit-docket"
                                    key="records-audit-docket"
                                    className="records-docket-card"
                                    role="dialog"
                                    aria-modal="false"
                                    aria-labelledby="records-audit-docket-title"
                                    initial={docketMotion.initial}
                                    animate={docketMotion.animate}
                                    exit={docketMotion.exit}
                                >
                                    <div className="records-docket-header">
                                        <div className="records-docket-signal-cut" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 id="records-audit-docket-title">{selectedEvent.event}</h3>
                                            <div className="records-docket-badges">
                                                <span className="records-cell-mono">{selectedEvent.id}</span>
                                                <span className="gov-integrity-badge is-verified">
                                                    <Check size={12} /> {selectedEvent.result}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            ref={docketCloseRef}
                                            type="button"
                                            className="records-docket-close"
                                            onClick={closeRecordsDocket}
                                            aria-label="Close audit event details"
                                            title="Close audit event details"
                                        >
                                            <X size={18} aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="records-meta-grid">
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Event ID:</span>
                                            <span className="records-meta-value records-mono">{selectedEvent.id}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Timestamp (PHT):</span>
                                            <span className="records-meta-value">{selectedEvent.time}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Actor / Operator:</span>
                                            <span className="records-meta-value">{selectedEvent.actor}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Source system:</span>
                                            <span className="records-meta-value">{selectedEvent.source}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Related record:</span>
                                            <span className="records-meta-value records-mono" style={{ color: 'var(--gov-action)' }}>{selectedEvent.related_object}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">State transition:</span>
                                            <span className="records-meta-value">
                                                <span className="records-transition-badge">
                                                    <span>{selectedEvent.state_from}</span>
                                                    <ArrowRight size={10} />
                                                    <span className="records-transition-to">{selectedEvent.state_to}</span>
                                                </span>
                                            </span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Trigger reason:</span>
                                            <span className="records-meta-value">{selectedEvent.reason}</span>
                                        </div>
                                        <div className="records-meta-row">
                                            <span className="records-meta-label">Signature ref:</span>
                                            <span className="records-meta-value records-mono" style={{ fontSize: 10 }}>{selectedEvent.signature}</span>
                                        </div>
                                    </div>

                                    {/* Correlation ID Container */}
                                    <div className="records-checksum-container">
                                        <div className="records-checksum-header">
                                            <span className="records-section-label">
                                                <Layers size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                Distributed Correlation ID
                                            </span>
                                            <button
                                                type="button"
                                                onClick={copyCorrelationId}
                                                className="records-copy-button"
                                                aria-label="Copy Correlation ID"
                                            >
                                                <Copy size={12} /> {copiedCorrelationId ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <div className="records-checksum-box">{selectedEvent.correlation_id}</div>
                                    </div>

                                    {/* Audit Event Payload Details */}
                                    <div className="records-payload-box">
                                        <div className="records-section-label">Immutable Event Payload</div>
                                        <p>{selectedEvent.details}</p>
                                    </div>

                                    <div className="records-docket-actions">
                                        <button
                                            type="button"
                                            className="gov-btn-primary"
                                            onClick={() => showToast(`Verified cryptographic hash of audit block ${selectedEvent.id}.`)}
                                        >
                                            <ShieldCheck size={14} /> Verify block integrity
                                        </button>
                                    </div>
                                </Motion.aside>
                            )}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>

            {/* Document Preview Modal */}
            {previewDoc && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <div className="records-modal-card">
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    {previewDoc.record_id} — {previewDoc.title}
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Format: {previewDoc.file_format} · Custodian: {previewDoc.owner} ({previewDoc.office})
                                </div>
                            </div>
                            <button
                                type="button"
                                className="citizen-reports-icon-button"
                                onClick={() => setPreviewDoc(null)}
                                aria-label="Close preview"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="records-modal-body">
                            <div className="records-preview-sheet">
                                <div className="records-preview-watermark">PULSO OFFICIAL RECORD · CITY ENGINEERING</div>
                                <div className="records-preview-meta-row">
                                    <div><strong>Classification:</strong> {previewDoc.classification}</div>
                                    <div><strong>Version:</strong> {previewDoc.version}</div>
                                    <div><strong>Retention:</strong> {previewDoc.retention}</div>
                                </div>
                                <div style={{ marginTop: 14 }}>
                                    <strong>Document Overview & Field Notes:</strong>
                                    <p style={{ margin: '8px 0', lineHeight: 1.5 }}>{previewDoc.notes}</p>
                                </div>
                                <div style={{ marginTop: 14 }}>
                                    <strong>Geographic & Asset Binding:</strong>
                                    <p style={{ margin: '4px 0', color: 'var(--gov-text-secondary)' }}>
                                        Location: {previewDoc.location} (Linked object: {previewDoc.linked_object})
                                    </p>
                                </div>
                                <div className="records-preview-hash-box">
                                    <strong>SHA-256 Cryptographic Checksum:</strong>
                                    <div style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}>{previewDoc.checksum}</div>
                                </div>
                            </div>
                        </div>
                        <div className="records-modal-footer">
                            <button
                                type="button"
                                className="gov-btn-secondary"
                                onClick={() => setPreviewDoc(null)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="gov-btn-primary"
                                onClick={() => {
                                    showToast(`Downloading verified file ${previewDoc.record_id}...`);
                                    setPreviewDoc(null);
                                }}
                            >
                                <Download size={14} /> Download official copy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Upload / Registration Modal */}
            {isUploadOpen && (
                <div className="records-modal-overlay" role="dialog" aria-modal="true">
                    <form className="records-modal-card" onSubmit={handleUploadSubmit}>
                        <div className="records-modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                                    Register new document / official record
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--gov-text-secondary)', marginTop: 2 }}>
                                    Records are hashed with SHA-256 upon submission and logged in the immutable audit ledger.
                                </div>
                            </div>
                            <button
                                type="button"
                                className="citizen-reports-icon-button"
                                onClick={() => setIsUploadOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="records-modal-body">
                            <div className="records-form-grid">
                                <div>
                                    <label className="records-form-label" htmlFor="upload-title">
                                        Document title *
                                    </label>
                                    <input
                                        id="upload-title"
                                        type="text"
                                        required
                                        className="records-form-input"
                                        placeholder="e.g., Drainage Hydrostatic Inspection Report"
                                        value={uploadForm.title}
                                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label className="records-form-label" htmlFor="upload-classification">
                                            Classification
                                        </label>
                                        <select
                                            id="upload-classification"
                                            className="records-form-input"
                                            value={uploadForm.classification}
                                            onChange={(e) => setUploadForm({ ...uploadForm, classification: e.target.value })}
                                        >
                                            <option value="Internal">Internal</option>
                                            <option value="Official">Official</option>
                                            <option value="Public">Public</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="records-form-label" htmlFor="upload-doc-type">
                                            Document type
                                        </label>
                                        <select
                                            id="upload-doc-type"
                                            className="records-form-input"
                                            value={uploadForm.doc_type}
                                            onChange={(e) => setUploadForm({ ...uploadForm, doc_type: e.target.value })}
                                        >
                                            <option value="Field sheet">Field sheet</option>
                                            <option value="Inspection report">Inspection report</option>
                                            <option value="Topographic survey">Topographic survey</option>
                                            <option value="Completion certificate">Completion certificate</option>
                                            <option value="Fleet checklist">Fleet checklist</option>
                                            <option value="BoQ Estimate Package">BoQ Estimate Package</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label className="records-form-label" htmlFor="upload-linked">
                                            Linked object (Work Order / Project)
                                        </label>
                                        <input
                                            id="upload-linked"
                                            type="text"
                                            className="records-form-input"
                                            placeholder="e.g., WO-2026-1182"
                                            value={uploadForm.linked_object}
                                            onChange={(e) => setUploadForm({ ...uploadForm, linked_object: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="records-form-label" htmlFor="upload-retention">
                                            Retention rule
                                        </label>
                                        <select
                                            id="upload-retention"
                                            className="records-form-input"
                                            value={uploadForm.retention}
                                            onChange={(e) => setUploadForm({ ...uploadForm, retention: e.target.value })}
                                        >
                                            <option value="3 years (Review 2029)">3 years (Review 2029)</option>
                                            <option value="5 years (Review 2031)">5 years (Review 2031)</option>
                                            <option value="7 years (Review 2033)">7 years (Review 2033)</option>
                                            <option value="10 years (Permanent)">10 years (Permanent)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="records-form-label" htmlFor="upload-location">
                                        Location / Geographic scope
                                    </label>
                                    <input
                                        id="upload-location"
                                        type="text"
                                        className="records-form-input"
                                        placeholder="e.g., 176 Deparo St., Brgy. 176, North Caloocan City"
                                        value={uploadForm.location}
                                        onChange={(e) => setUploadForm({ ...uploadForm, location: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="records-modal-footer">
                            <button
                                type="button"
                                className="gov-btn-secondary"
                                onClick={() => setIsUploadOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="gov-btn-primary"
                            >
                                <UploadCloud size={14} /> Calculate SHA-256 & Register Record
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
