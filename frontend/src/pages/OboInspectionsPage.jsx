import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    FileCheck,
    FileImage,
    Inbox,
    MapPin,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import OboScheduleModal from '../components/modals/OboScheduleModal';
import OboFindingsModal from '../components/modals/OboFindingsModal';
import OboTechnicalReviewModal from '../components/modals/OboTechnicalReviewModal';
import OboNewApplicationModal from '../components/modals/OboNewApplicationModal';
import { API_BASE_URL } from '../utils/apiBase';
import './obo-inspections.css';

const OBO_TABS = [
    { key: 'all', label: 'All applications' },
    { key: 'technical_review', label: 'Technical review' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'inspection_complete', label: 'Inspection complete' },
    { key: 'notices', label: 'Non-compliant (Notices)' },
    { key: 'permits_issued', label: 'Permits issued' },
    { key: 'cleared', label: 'Cleared' },
];

const OBO_PULSELINE_STEPS = [
    { key: 'application_received', label: 'Application' },
    { key: 'technical_review', label: 'Tech Review' },
    { key: 'inspection_scheduled', label: 'Scheduled' },
    { key: 'inspection_complete', label: 'Inspection' },
    { key: 'permit_issued', label: 'Permit / Notice' },
    { key: 'cleared', label: 'Cleared' },
];

const SAMPLE_OBO_INSPECTIONS = [
    {
        id: 312,
        obo_number: 'OBO-2026-0312',
        applicant_name: 'Maria Santos / Apex Commercial Corp.',
        applicant_contact: '0917-889-1234',
        property_address: '176 Deparo St., Brgy. 176, North Caloocan City',
        barangay: 'Barangay 176',
        inspection_type: 'building',
        status: 'inspection_scheduled',
        assigned_inspector_id: 101,
        assigned_inspector_name: 'Engr. Ramon Cruz',
        inspection_date: '2026-05-16T09:30:00Z',
        findings: 'Preliminary site inspection indicates partial structural column alignment in place. Awaiting formal setback measurement test.',
        is_compliant: true,
        violation_details: null,
        source_report_id: 822,
        arch_review: 'approved',
        civil_review: 'approved',
        elec_review: 'pending',
        sani_review: 'approved',
        mech_review: 'pending',
        order_of_payment_fee: 14500.0,
        payment_status: 'paid',
        evidence_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&q=80&w=800',
        created_at: '2026-05-14T08:00:00Z',
        updated_at: '2026-05-15T08:21:00Z',
    },
    {
        id: 308,
        obo_number: 'OBO-2026-0308',
        applicant_name: 'Juan Dela Cruz (Residential Owner)',
        applicant_contact: '0922-456-7890',
        property_address: 'Camarin Rd., Brgy. 172, North Caloocan City',
        barangay: 'Barangay 172',
        inspection_type: 'electrical',
        status: 'notice_issued',
        assigned_inspector_id: 102,
        assigned_inspector_name: 'Engr. Marga Dela Cruz',
        inspection_date: '2026-05-14T14:00:00Z',
        findings: 'Exposed secondary service entrance drop wire crossing pedestrian sidewalk without protective conduit clearance.',
        is_compliant: false,
        violation_details: 'Sec. 301 Violation — Non-compliant service drop clearance (< 4.5m above roadway). Rectification required within 5 calendar days.',
        source_report_id: null,
        arch_review: 'approved',
        civil_review: 'approved',
        elec_review: 'rejected',
        sani_review: 'approved',
        mech_review: 'approved',
        order_of_payment_fee: 4800.0,
        payment_status: 'pending',
        evidence_url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&q=80&w=800',
        created_at: '2026-05-12T10:15:00Z',
        updated_at: '2026-05-14T15:30:00Z',
    },
    {
        id: 301,
        obo_number: 'OBO-2026-0301',
        applicant_name: 'St. Jude Commercial Complex Ltd.',
        applicant_contact: '0918-999-5555',
        property_address: 'St. Jude St., Brgy. 165, North Caloocan City',
        barangay: 'Barangay 165',
        inspection_type: 'mechanical',
        status: 'permit_issued',
        assigned_inspector_id: 103,
        assigned_inspector_name: 'Engr. Luis Morales',
        inspection_date: '2026-05-11T11:00:00Z',
        findings: 'HVAC chiller system and fire suppression mechanical pumps passed pressure and ventilation acoustic tests.',
        is_compliant: true,
        violation_details: null,
        source_report_id: null,
        arch_review: 'approved',
        civil_review: 'approved',
        elec_review: 'approved',
        sani_review: 'approved',
        mech_review: 'approved',
        order_of_payment_fee: 32000.0,
        payment_status: 'paid',
        evidence_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800',
        created_at: '2026-05-08T09:00:00Z',
        updated_at: '2026-05-13T16:00:00Z',
    },
    {
        id: 295,
        obo_number: 'OBO-2026-0295',
        applicant_name: 'Bagumbong Multi-Unit Townhomes',
        applicant_contact: '0919-333-2211',
        property_address: 'Bagumbong Rd., Brgy. 170, North Caloocan City',
        barangay: 'Barangay 170',
        inspection_type: 'building',
        status: 'application_received',
        assigned_inspector_id: null,
        assigned_inspector_name: null,
        inspection_date: null,
        findings: null,
        is_compliant: null,
        violation_details: null,
        source_report_id: null,
        arch_review: 'pending',
        civil_review: 'pending',
        elec_review: 'pending',
        sani_review: 'pending',
        mech_review: 'pending',
        order_of_payment_fee: 28500.0,
        payment_status: 'pending',
        evidence_url: null,
        created_at: '2026-05-15T07:30:00Z',
        updated_at: '2026-05-15T07:30:00Z',
    },
    {
        id: 288,
        obo_number: 'OBO-2026-0288',
        applicant_name: 'Deparo Industrial Storage Whse',
        applicant_contact: '0917-555-8888',
        property_address: '10th Ave., Brgy. 167, North Caloocan City',
        barangay: 'Barangay 167',
        inspection_type: 'sanitary',
        status: 'cleared',
        assigned_inspector_id: 104,
        assigned_inspector_name: 'Engr. Ana Reyes',
        inspection_date: '2026-05-09T10:00:00Z',
        findings: '3-chamber grease trap and sewer line connection compliant with RA 9275 Clean Water Act regulations.',
        is_compliant: true,
        violation_details: null,
        source_report_id: null,
        arch_review: 'approved',
        civil_review: 'approved',
        elec_review: 'approved',
        sani_review: 'approved',
        mech_review: 'approved',
        order_of_payment_fee: 18200.0,
        payment_status: 'paid',
        evidence_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800',
        created_at: '2026-05-02T08:00:00Z',
        updated_at: '2026-05-10T14:20:00Z',
    },
];

export default function OboInspectionsPage() {
    const token = localStorage.getItem('pulso_token');
    const [params, setParams] = useSearchParams();
    const [inspections, setInspections] = useState(SAMPLE_OBO_INSPECTIONS);
    const [toastMessage, setToastMessage] = useState(null);

    // Modals
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [findingsModalOpen, setFindingsModalOpen] = useState(false);
    const [techReviewModalOpen, setTechReviewModalOpen] = useState(false);
    const [newAppModalOpen, setNewAppModalOpen] = useState(false);

    const activeTab = params.get('tab') || 'all';
    const searchQuery = params.get('search') || '';
    const typeFilter = params.get('type') || 'all';
    const selectedOboId = Number(params.get('obo')) || null;

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const fetchInspections = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/obo`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setInspections(data);
                } else {
                    setInspections(SAMPLE_OBO_INSPECTIONS);
                }
            } else {
                setInspections(SAMPLE_OBO_INSPECTIONS);
            }
        } catch {
            setInspections(SAMPLE_OBO_INSPECTIONS);
        }
    };

    useEffect(() => {
        fetchInspections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showToast = (text) => {
        setToastMessage(text);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const updateParam = (key, value) => {
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (!value || value === 'all') next.delete(key);
                else next.set(key, value);
                return next;
            },
            { replace: true }
        );
    };

    const filteredInspections = useMemo(() => {
        return inspections.filter((item) => {
            if (activeTab === 'technical_review' && item.status !== 'application_received') return false;
            if (activeTab === 'scheduled' && item.status !== 'inspection_scheduled') return false;
            if (activeTab === 'inspection_complete' && item.status !== 'inspection_complete') return false;
            if (
                activeTab === 'notices' &&
                item.status !== 'notice_issued' &&
                item.status !== 're_inspection_scheduled'
            )
                return false;
            if (activeTab === 'permits_issued' && item.status !== 'permit_issued') return false;
            if (activeTab === 'cleared' && item.status !== 'cleared') return false;

            if (typeFilter !== 'all' && item.inspection_type !== typeFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    item.obo_number?.toLowerCase().includes(q) ||
                    item.applicant_name?.toLowerCase().includes(q) ||
                    item.property_address?.toLowerCase().includes(q) ||
                    item.barangay?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [inspections, activeTab, typeFilter, searchQuery]);

    const selectedInspection = useMemo(() => {
        if (!selectedOboId) return null;
        return inspections.find((i) => i.id === selectedOboId) || null;
    }, [inspections, selectedOboId]);

    // Pulseline step index calculator
    const currentStepIndex = useMemo(() => {
        if (!selectedInspection) return 0;
        const st = selectedInspection.status;
        if (st === 'application_received') return 0;
        if (st === 'technical_review') return 1;
        if (st === 'inspection_scheduled') return 2;
        if (st === 'inspection_complete') return 3;
        if (st === 'notice_issued' || st === 'permit_issued' || st === 're_inspection_scheduled') return 4;
        if (st === 'cleared') return 5;
        return 2;
    }, [selectedInspection]);

    // Action handlers
    const handleScheduleSubmit = async (scheduleData) => {
        try {
            await fetch(`${API_BASE_URL}/api/gov/obo/${scheduleData.oboId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    assigned_inspector_id: scheduleData.assigned_inspector_id,
                    inspection_date: scheduleData.inspection_date,
                    status: 'inspection_scheduled',
                }),
            });
        } catch {
            // Local state fallback
        }

        setInspections((prev) =>
            prev.map((item) =>
                item.id === scheduleData.oboId
                    ? {
                          ...item,
                          assigned_inspector_id: scheduleData.assigned_inspector_id,
                          assigned_inspector_name: scheduleData.assigned_inspector_name,
                          inspection_date: scheduleData.inspection_date,
                          status: 'inspection_scheduled',
                          updated_at: new Date().toISOString(),
                      }
                    : item
            )
        );
        showToast(`Site inspection scheduled for ${selectedInspection?.obo_number}.`);
    };

    const handleFindingsSubmit = async (findingsData) => {
        try {
            await fetch(`${API_BASE_URL}/api/gov/obo/${findingsData.oboId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    findings: findingsData.findings,
                    is_compliant: findingsData.is_compliant,
                    violation_details: findingsData.violation_details,
                    status: findingsData.status,
                }),
            });
        } catch {
            // Local state fallback
        }

        setInspections((prev) =>
            prev.map((item) =>
                item.id === findingsData.oboId
                    ? {
                          ...item,
                          findings: findingsData.findings,
                          is_compliant: findingsData.is_compliant,
                          violation_details: findingsData.violation_details,
                          status: findingsData.status,
                          evidence_url: findingsData.evidence_url || item.evidence_url,
                          updated_at: new Date().toISOString(),
                      }
                    : item
            )
        );
        showToast(
            findingsData.is_compliant
                ? `Compliant inspection findings logged for ${selectedInspection?.obo_number}.`
                : `Notice of Violation generated for ${selectedInspection?.obo_number}.`
        );
    };

    const handleTechReviewSubmit = async ({ oboId, department, status }) => {
        try {
            await fetch(`${API_BASE_URL}/api/gov/obo/${oboId}/technical-review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ department, status }),
            });
        } catch {
            // Local state fallback
        }

        setInspections((prev) =>
            prev.map((item) => {
                if (item.id === oboId) {
                    const updateField = `${department}_review`;
                    return {
                        ...item,
                        [updateField]: status,
                        updated_at: new Date().toISOString(),
                    };
                }
                return item;
            })
        );
        showToast(`Technical evaluation for [${department.toUpperCase()}] updated to: ${status}.`);
    };

    const handleNewApplicationSubmit = async (newAppData) => {
        const tempId = Date.now();
        const newObj = {
            id: tempId,
            obo_number: `OBO-2026-${String(tempId).slice(-4)}`,
            ...newAppData,
            status: 'application_received',
            assigned_inspector_id: null,
            assigned_inspector_name: null,
            inspection_date: null,
            findings: null,
            is_compliant: null,
            violation_details: null,
            arch_review: 'pending',
            civil_review: 'pending',
            elec_review: 'pending',
            sani_review: 'pending',
            mech_review: 'pending',
            order_of_payment_fee: newAppData.inspection_type === 'building' ? 15000.0 : 6500.0,
            payment_status: 'pending',
            evidence_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/obo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newAppData),
            });
            if (res.ok) {
                const created = await res.json();
                setInspections((prev) => [created, ...prev]);
            } else {
                setInspections((prev) => [newObj, ...prev]);
            }
        } catch {
            setInspections((prev) => [newObj, ...prev]);
        }
        showToast(`New application ${newObj.obo_number} registered successfully.`);
    };

    const handleIssuePermit = async () => {
        if (!selectedInspection) return;
        try {
            await fetch(`${API_BASE_URL}/api/gov/obo/${selectedInspection.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'permit_issued' }),
            });
        } catch {
            // Local state fallback
        }

        setInspections((prev) =>
            prev.map((item) =>
                item.id === selectedInspection.id
                    ? { ...item, status: 'permit_issued', updated_at: new Date().toISOString() }
                    : item
            )
        );
        showToast(`Building / Occupancy Permit issued for ${selectedInspection.obo_number}.`);
    };

    const handleClearance = async () => {
        if (!selectedInspection) return;
        try {
            await fetch(`${API_BASE_URL}/api/gov/obo/${selectedInspection.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'cleared' }),
            });
        } catch {
            // Local state fallback
        }

        setInspections((prev) =>
            prev.map((item) =>
                item.id === selectedInspection.id
                    ? { ...item, status: 'cleared', updated_at: new Date().toISOString() }
                    : item
            )
        );
        showToast(`Final certificate & clearance granted for ${selectedInspection.obo_number}.`);
    };

    return (
        <div className="obo-page">
            <GovSidebar currentUser={currentUser} />
            <div className="obo-shell">
                <header className="obo-topbar">
                    <div>
                        <h1>Office of the Building Official (OBO)</h1>
                        <p>Building safety inspections, PD 1096 discipline evaluations, code compliance, and permits.</p>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className="citizen-reports-toast-pill" role="status">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Data as of today 08:42 AM</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="citizen-reports-icon-button"
                            onClick={fetchInspections}
                            aria-label="Refresh OBO inspections"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {/* Tabs Bar */}
                <div className="obo-tabs-bar">
                    <div className="obo-tabs-list" role="tablist">
                        {OBO_TABS.map((tab) => {
                            const count =
                                tab.key === 'all'
                                    ? inspections.length
                                    : inspections.filter((item) => {
                                          if (tab.key === 'technical_review') return item.status === 'application_received';
                                          if (tab.key === 'scheduled') return item.status === 'inspection_scheduled';
                                          if (tab.key === 'inspection_complete') return item.status === 'inspection_complete';
                                          if (tab.key === 'notices')
                                              return (
                                                  item.status === 'notice_issued' ||
                                                  item.status === 're_inspection_scheduled'
                                              );
                                          if (tab.key === 'permits_issued') return item.status === 'permit_issued';
                                          if (tab.key === 'cleared') return item.status === 'cleared';
                                          return true;
                                      }).length;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab.key}
                                    className={`obo-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                    onClick={() => {
                                        updateParam('tab', tab.key);
                                        updateParam('obo', null);
                                    }}
                                >
                                    {tab.label}
                                    <span className="obo-tab-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        className="work-orders-create-btn"
                        onClick={() => setNewAppModalOpen(true)}
                    >
                        <Plus size={15} /> File OBO application
                    </button>
                </div>

                <main className="obo-main">
                    {!selectedInspection ? (
                        /* ── LIST VIEW ─────────────────────────────────────────────── */
                        <>
                            <div className="obo-controls">
                                <div className="obo-filter-group">
                                    <div className="work-orders-search-box" style={{ maxWidth: 300 }}>
                                        <Search size={15} />
                                        <input
                                            type="search"
                                            placeholder="Search OBO ID, applicant, address..."
                                            className="work-orders-search-input"
                                            value={searchQuery}
                                            onChange={(e) => updateParam('search', e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="work-orders-select-filter"
                                        value={typeFilter}
                                        onChange={(e) => updateParam('type', e.target.value)}
                                    >
                                        <option value="all">All inspection types</option>
                                        <option value="building">Building / Structural</option>
                                        <option value="electrical">Electrical</option>
                                        <option value="mechanical">Mechanical</option>
                                        <option value="sanitary">Sanitary</option>
                                    </select>
                                </div>
                                <span className="work-orders-result-meta">
                                    {filteredInspections.length} applications · Updated 2m ago
                                </span>
                            </div>

                            <div className="obo-layout-split">
                                <div className="obo-table-wrapper">
                                    <table className="obo-table" aria-label="OBO inspections table">
                                        <thead>
                                            <tr>
                                                <th>OBO ID</th>
                                                <th>Applicant / Owner</th>
                                                <th>Type</th>
                                                <th>Address / Barangay</th>
                                                <th>Discipline reviews</th>
                                                <th>Status</th>
                                                <th>Inspector</th>
                                                <th>Inspection date</th>
                                                <th>Order of payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInspections.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>
                                                        <Inbox size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                                                        <strong>No OBO applications found</strong>
                                                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                                                            No inspection records match the current filter or search parameters.
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredInspections.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="obo-id-btn"
                                                                onClick={() => updateParam('obo', String(item.id))}
                                                            >
                                                                {item.obo_number}
                                                            </button>
                                                        </td>
                                                        <td>
                                                            <strong>{item.applicant_name}</strong>
                                                        </td>
                                                        <td>
                                                            <span className="gov-state-badge is-assigned">
                                                                {item.inspection_type}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: 11, color: '#475569' }}>
                                                            {item.property_address} ({item.barangay})
                                                        </td>
                                                        <td>
                                                            <div className="obo-discipline-chips">
                                                                <span className={`obo-chip is-${item.arch_review || 'pending'}`}>
                                                                    ARC
                                                                </span>
                                                                <span className={`obo-chip is-${item.civil_review || 'pending'}`}>
                                                                    STR
                                                                </span>
                                                                <span className={`obo-chip is-${item.elec_review || 'pending'}`}>
                                                                    ELE
                                                                </span>
                                                                <span className={`obo-chip is-${item.sani_review || 'pending'}`}>
                                                                    SAN
                                                                </span>
                                                                <span className={`obo-chip is-${item.mech_review || 'pending'}`}>
                                                                    MEC
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`gov-state-badge is-${item.status}`}>
                                                                {item.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td>{item.assigned_inspector_name || 'Unassigned'}</td>
                                                        <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                                                            {item.inspection_date
                                                                ? new Date(item.inspection_date).toLocaleDateString([], {
                                                                      month: 'short',
                                                                      day: 'numeric',
                                                                  })
                                                                : '—'}
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap', fontSize: 11, fontWeight: 700 }}>
                                                            ₱{(item.order_of_payment_fee || 0).toLocaleString()} (
                                                            <span
                                                                style={{
                                                                    color: item.payment_status === 'paid' ? '#059669' : '#d97706',
                                                                }}
                                                            >
                                                                {item.payment_status || 'pending'}
                                                            </span>
                                                            )
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right Rail Summary */}
                                <aside className="obo-rail-summary">
                                    <div className="obo-summary-card">
                                        <h4>Upcoming inspections (Today)</h4>
                                        <strong>OBO-2026-0312 (Commercial structure)</strong>
                                        <p>176 Deparo St. · Assigned: Engr. Ramon Cruz (09:30 AM)</p>
                                        <button
                                            type="button"
                                            className="work-orders-summary-card-link"
                                            onClick={() => updateParam('obo', '312')}
                                        >
                                            Open inspection docket →
                                        </button>
                                    </div>

                                    <div className="obo-summary-card">
                                        <h4>Active violation notice</h4>
                                        <strong>OBO-2026-0308 (Service drop hazard)</strong>
                                        <p>Camarin Rd. · Non-compliant service drop clearance. 5-day deadline.</p>
                                        <button
                                            type="button"
                                            className="work-orders-summary-card-link"
                                            onClick={() => updateParam('obo', '308')}
                                        >
                                            Review violation details →
                                        </button>
                                    </div>

                                    <div className="obo-summary-card">
                                        <h4>Statutory compliance summary</h4>
                                        <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Compliant permits issued:</span>
                                                <strong style={{ color: '#059669' }}>18 this week</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Under technical review:</span>
                                                <strong style={{ color: '#0284c7' }}>7 pending</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Notices served:</span>
                                                <strong style={{ color: '#dc2626' }}>3 active</strong>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </>
                    ) : (
                        /* ── DETAIL DOCKET VIEW ────────────────────────────────────── */
                        <article className="obo-docket-container">
                            <div className="wo-docket-breadcrumb-bar">
                                <div className="wo-docket-breadcrumbs">
                                    <button
                                        type="button"
                                        className="wo-docket-btn-back"
                                        onClick={() => updateParam('obo', null)}
                                    >
                                        <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        OBO Inspections
                                    </button>
                                    <span>/</span>
                                    <strong>{selectedInspection.obo_number}</strong>
                                    <span className="gov-state-badge is-assigned">
                                        {selectedInspection.inspection_type}
                                    </span>
                                </div>
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                    Applied: {new Date(selectedInspection.created_at).toLocaleDateString()} · Applicant:{' '}
                                    {selectedInspection.applicant_name}
                                </span>
                            </div>

                            <div className="wo-docket-header-row">
                                <div className="wo-docket-title-area">
                                    <h2>
                                        {selectedInspection.obo_number}{' '}
                                        <span className={`gov-state-badge is-${selectedInspection.status}`}>
                                            {selectedInspection.status.replace(/_/g, ' ')}
                                        </span>
                                    </h2>
                                    <p>
                                        {selectedInspection.property_address} ({selectedInspection.barangay})
                                    </p>
                                </div>
                                <div className="wo-docket-actions-row">
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        onClick={() => setScheduleModalOpen(true)}
                                    >
                                        <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        Schedule inspection
                                    </button>
                                    <button
                                        type="button"
                                        className="gov-btn-secondary"
                                        onClick={() => setFindingsModalOpen(true)}
                                    >
                                        <FileCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                                        Record findings
                                    </button>
                                    {selectedInspection.is_compliant && selectedInspection.status !== 'permit_issued' && (
                                        <button
                                            type="button"
                                            className="gov-btn-primary"
                                            style={{ background: '#059669', borderColor: '#059669' }}
                                            onClick={handleIssuePermit}
                                        >
                                            <ShieldCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                                            Issue Permit
                                        </button>
                                    )}
                                    {selectedInspection.status === 'permit_issued' && (
                                        <button
                                            type="button"
                                            className="gov-btn-primary"
                                            onClick={handleClearance}
                                        >
                                            <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                            Grant Clearance
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 2px Pulseline Lifecycle Tracker */}
                            <div className="wo-pulseline-bar-box" aria-label="OBO Statutory Lifecycle">
                                <div className="wo-pulseline-track">
                                    <div
                                        className="wo-pulseline-fill"
                                        style={{
                                            width: `${(currentStepIndex / (OBO_PULSELINE_STEPS.length - 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                                <div className="wo-pulseline-steps">
                                    {OBO_PULSELINE_STEPS.map((st, idx) => {
                                        const isDone = idx <= currentStepIndex;
                                        const isCurrent = idx === currentStepIndex;
                                        return (
                                            <div
                                                key={st.key}
                                                className={`wo-pulseline-step${isDone ? ' is-done' : ''}${
                                                    isCurrent ? ' is-current' : ''
                                                }`}
                                            >
                                                <span className="wo-pulseline-dot" />
                                                <span className="wo-pulseline-label">{st.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2-Column Docket Grid */}
                            <div className="obo-docket-grid">
                                {/* Left Column */}
                                <div className="obo-docket-col">
                                    <div className="obo-card">
                                        <h4>Property & Applicant Scope</h4>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <MapPin size={16} className="text-sky-600" />
                                            <strong>{selectedInspection.property_address}</strong>
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 4 }}>
                                            <div>
                                                <span style={{ color: '#64748b' }}>Applicant: </span>
                                                <strong>{selectedInspection.applicant_name}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b' }}>Contact: </span>
                                                <strong>{selectedInspection.applicant_contact || 'N/A'}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b' }}>Barangay: </span>
                                                <strong>{selectedInspection.barangay}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b' }}>Inspection Category: </span>
                                                <strong style={{ textTransform: 'capitalize' }}>
                                                    {selectedInspection.inspection_type}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PD 1096 Technical Disciplines Review Matrix */}
                                    <div className="obo-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4>PD 1096 Technical Disciplines Review Matrix</h4>
                                            <button
                                                type="button"
                                                className="work-orders-table-btn-link"
                                                style={{ fontSize: 11 }}
                                                onClick={() => setTechReviewModalOpen(true)}
                                            >
                                                + Evaluate discipline
                                            </button>
                                        </div>

                                        <div className="obo-discipline-grid">
                                            <div className="obo-discipline-row">
                                                <span className="obo-discipline-name">1. Architectural Review (Sec. 302)</span>
                                                <span className={`obo-chip is-${selectedInspection.arch_review || 'pending'}`}>
                                                    {(selectedInspection.arch_review || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="obo-discipline-row">
                                                <span className="obo-discipline-name">2. Civil / Structural Engineering</span>
                                                <span className={`obo-chip is-${selectedInspection.civil_review || 'pending'}`}>
                                                    {(selectedInspection.civil_review || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="obo-discipline-row">
                                                <span className="obo-discipline-name">3. Electrical Engineering (PEC)</span>
                                                <span className={`obo-chip is-${selectedInspection.elec_review || 'pending'}`}>
                                                    {(selectedInspection.elec_review || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="obo-discipline-row">
                                                <span className="obo-discipline-name">4. Sanitary / Plumbing (NPCP)</span>
                                                <span className={`obo-chip is-${selectedInspection.sani_review || 'pending'}`}>
                                                    {(selectedInspection.sani_review || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="obo-discipline-row">
                                                <span className="obo-discipline-name">5. Mechanical Engineering (PSME)</span>
                                                <span className={`obo-chip is-${selectedInspection.mech_review || 'pending'}`}>
                                                    {(selectedInspection.mech_review || 'pending').toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Field Evidence & Plans Aperture Card */}
                                    <div className="obo-card">
                                        <h4>Field Evidence & Building Plans</h4>
                                        <div className="wo-evidence-aperture">
                                            {selectedInspection.evidence_url ? (
                                                <img
                                                    src={selectedInspection.evidence_url}
                                                    alt="OBO site evidence"
                                                    className="wo-evidence-img"
                                                />
                                            ) : (
                                                <div className="citizen-report-empty-evidence">
                                                    <FileImage size={24} /> No site inspection photo attached yet.
                                                </div>
                                            )}
                                            <div className="wo-evidence-meta">
                                                <span>OBO Inspection Evidence • True Color Aperture</span>
                                                <span>Source: Inspector Mobile Terminal</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="obo-docket-col">
                                    {/* Inspector & Schedule */}
                                    <div className="obo-card">
                                        <h4>Assigned Inspector & Schedule</h4>
                                        <p>
                                            <strong>Inspector: </strong>
                                            {selectedInspection.assigned_inspector_name || 'Unassigned'}
                                        </p>
                                        <p>
                                            <strong>Inspection Date: </strong>
                                            {selectedInspection.inspection_date
                                                ? new Date(selectedInspection.inspection_date).toLocaleString([], {
                                                      dateStyle: 'medium',
                                                      timeStyle: 'short',
                                                  })
                                                : 'Pending schedule'}
                                        </p>
                                    </div>

                                    {/* Findings & Violations */}
                                    <div className="obo-card">
                                        <h4>Inspection Findings & Code Compliance</h4>
                                        <p>
                                            <strong>Compliance Status: </strong>
                                            {selectedInspection.is_compliant === true ? (
                                                <span style={{ color: '#059669', fontWeight: 700 }}>
                                                    <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                                                    Compliant (Passed)
                                                </span>
                                            ) : selectedInspection.is_compliant === false ? (
                                                <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                                    <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4 }} />
                                                    Non-compliant (Violations flagged)
                                                </span>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>Pending site inspection</span>
                                            )}
                                        </p>
                                        {selectedInspection.findings && (
                                            <div style={{ marginTop: 6, fontSize: 12 }}>
                                                <span style={{ color: '#64748b', fontWeight: 600 }}>Technical Findings: </span>
                                                <p style={{ margin: '2px 0 0' }}>{selectedInspection.findings}</p>
                                            </div>
                                        )}
                                        {selectedInspection.violation_details && (
                                            <div
                                                style={{
                                                    background: 'rgba(220, 38, 38, 0.08)',
                                                    border: '1px solid rgba(220, 38, 38, 0.25)',
                                                    padding: 10,
                                                    borderRadius: 4,
                                                    marginTop: 8,
                                                }}
                                            >
                                                <strong style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ShieldAlert size={14} /> Notice of Violation Issued:
                                                </strong>
                                                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                                                    {selectedInspection.violation_details}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Order of Payment Box */}
                                    <div className="obo-payment-box">
                                        <h4>Order of Payment & Assessment</h4>
                                        <div className="obo-payment-row">
                                            <span>Assessment Fee:</span>
                                            <strong className="obo-payment-total">
                                                ₱{(selectedInspection.order_of_payment_fee || 0).toLocaleString()}
                                            </strong>
                                        </div>
                                        <div className="obo-payment-row">
                                            <span>Payment Status:</span>
                                            <span
                                                className={`gov-state-badge is-${
                                                    selectedInspection.payment_status === 'paid' ? 'completed' : 'assigned'
                                                }`}
                                            >
                                                {(selectedInspection.payment_status || 'pending').toUpperCase()}
                                            </span>
                                        </div>
                                        {selectedInspection.payment_status !== 'paid' && (
                                            <button
                                                type="button"
                                                className="gov-btn-secondary"
                                                style={{ marginTop: 6 }}
                                                onClick={() => {
                                                    setInspections((prev) =>
                                                        prev.map((i) =>
                                                            i.id === selectedInspection.id
                                                                ? { ...i, payment_status: 'paid' }
                                                                : i
                                                        )
                                                    );
                                                    showToast(`Payment of ₱${selectedInspection.order_of_payment_fee} verified.`);
                                                }}
                                            >
                                                <Receipt size={14} style={{ display: 'inline', marginRight: 4 }} />
                                                Verify Official Receipt (OR)
                                            </button>
                                        )}
                                    </div>

                                    {/* Activity Timeline */}
                                    <div className="obo-card">
                                        <h4>Immutable Audit & Event History</h4>
                                        <div className="wo-timeline">
                                            <div className="wo-timeline-item">
                                                <span className="wo-timeline-dot" />
                                                <div className="wo-timeline-content">
                                                    <strong>Status updated to {selectedInspection.status.replace(/_/g, ' ')}</strong>
                                                    <span>{new Date(selectedInspection.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · System</span>
                                                </div>
                                            </div>
                                            <div className="wo-timeline-item">
                                                <span className="wo-timeline-dot" />
                                                <div className="wo-timeline-content">
                                                    <strong>Application filed by {selectedInspection.applicant_name}</strong>
                                                    <span>{new Date(selectedInspection.created_at).toLocaleDateString()} · OBO Intake Clerk</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    )}
                </main>
            </div>

            {/* Modals */}
            <OboScheduleModal
                isOpen={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                inspection={selectedInspection}
                onSubmit={handleScheduleSubmit}
            />
            <OboFindingsModal
                isOpen={findingsModalOpen}
                onClose={() => setFindingsModalOpen(false)}
                inspection={selectedInspection}
                onSubmit={handleFindingsSubmit}
            />
            <OboTechnicalReviewModal
                isOpen={techReviewModalOpen}
                onClose={() => setTechReviewModalOpen(false)}
                inspection={selectedInspection}
                onSubmit={handleTechReviewSubmit}
            />
            <OboNewApplicationModal
                isOpen={newAppModalOpen}
                onClose={() => setNewAppModalOpen(false)}
                onSubmit={handleNewApplicationSubmit}
            />
        </div>
    );
}
