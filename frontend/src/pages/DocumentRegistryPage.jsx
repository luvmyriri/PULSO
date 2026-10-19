import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Search, Filter, FileText, Download, Trash2, Eye, RefreshCw, X, 
    ChevronDown, Shield, ShieldAlert, ShieldCheck, Lock, Unlock, 
    Clock, AlertCircle, CheckCircle2, FileWarning, Fingerprint, ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';
import { getToken } from '../utils/auth';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import TablePagination from '../components/TablePagination';

export default function DocumentRegistryPage({ workspace }) {
    const location = useLocation();
    const token = getToken();
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });
    
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ by_target_model: {}, by_document_type: {} });
    
    const [filters, setFilters] = useState(() => {
        const params = new URLSearchParams(location.search);
        return {
            target_model: params.get('target_model') || '',
            document_type: params.get('document_type') || '',
            search: params.get('search') || ''
        };
    });
    const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
    
    const targetModelOptions = [
        { value: '', label: 'All Models' },
        { value: 'ProjectRequest', label: 'Infrastructure Projects' },
        { value: 'WorkOrder', label: 'Work Orders' },
        { value: 'ProcurementRequest', label: 'Procurement' },
        { value: 'OBOInspection', label: 'OBO Inspections' }
    ];
    
    const documentTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'survey_report', label: 'Survey Report' },
        { value: 'topo_map', label: 'Topographical Map' },
        { value: 'geotechnical_test', label: 'Geotechnical Test' },
        { value: 'prelim_survey', label: 'Preliminary Survey' },
        { value: 'design_plans', label: 'Design Plans' },
        { value: 'detailed_estimate', label: 'Detailed Estimate' },
        { value: 's_curve', label: 'S-Curve Chart' },
        { value: 'abc', label: 'Approved Budget (ABC)' },
        { value: 'pow', label: 'Program of Works' },
        { value: 'itb', label: 'Invitation to Bid' },
        { value: 'bac_resolution', label: 'BAC Resolution' },
        { value: 'contract', label: 'Contract Agreement' },
        { value: 'ntp', label: 'Notice to Proceed' },
        { value: 'perf_bond', label: 'Performance Bond' },
        { value: 'car_insurance', label: 'CAR/CAS Insurance' },
        { value: 'job_order', label: 'Job Order' },
        { value: 'quotations_3', label: '3 Quotations' },
        { value: 'final_photo', label: 'Final Photo' },
        { value: 'completion_report', label: 'Completion Report' },
        { value: 'materials_test', label: 'Materials Test' },
        { value: 'as_built_plan', label: 'As-Built Plan' },
        { value: 'coa_inspection', label: 'COA Inspection' },
        { value: 'emergency_memo', label: 'Emergency Memo' },
        { value: 'fund_certification', label: 'Fund Certification' },
        { value: 'direct_negotiation_record', label: 'Direct Negotiation' },
        { value: 'emergency_pow', label: 'Emergency POW' }
    ];

    const fetchCounts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/registry/counts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCounts(data);
            }
        } catch (err) {
            console.error('Failed to fetch counts:', err);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.target_model) params.append('target_model', filters.target_model);
            if (filters.document_type) params.append('document_type', filters.document_type);
            if (filters.search) params.append('search', filters.search);
            params.append('limit', pagination.limit);
            params.append('offset', pagination.offset);
            
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/registry?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.documents || []);
                setPagination(prev => ({ ...prev, total: data.total }));
            }
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounts();
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [filters, pagination.limit, pagination.offset]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, offset: 0 }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, offset: 0 }));
        fetchDocuments();
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-PH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownload = async (docId, fileName) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/get/${docId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Download failed. You might not have permission.');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleLegalHold = async (docId, currentHold) => {
        if (!['system_admin', 'manager', 'city_engineer', 'division_chief'].includes(currentUser?.role)) {
            alert("Unauthorized: Only Admins or Chiefs can manage Legal Holds.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/${docId}/legal-hold`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ legal_hold: !currentHold })
            });

            if (res.ok) {
                // Update local state
                setDocuments(docs => docs.map(d => d.id === docId ? { ...d, legal_hold: !currentHold } : d));
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to update legal hold.");
            }
        } catch (err) {
            console.error("Legal hold error:", err);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Are you sure you want to PERMANENTLY delete this record? This action is irreversible and logged for audit.")) return;

        try {
             const res = await fetch(`${API_BASE_URL}/api/gov/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setDocuments(docs => docs.filter(d => d.id !== docId));
                fetchCounts();
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to delete document.");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const getConfidentialityBadge = (level) => {
        switch(level) {
            case 'Confidential':
                return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-black uppercase ring-1 ring-inset ring-red-500/20"><ShieldAlert size={10} /> Confidential</span>;
            case 'Restricted':
                return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-black uppercase ring-1 ring-inset ring-amber-500/20"><ShieldCheck size={10} /> Restricted</span>;
            default:
                return <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black uppercase ring-1 ring-inset ring-emerald-500/20"><CheckCircle2 size={10} /> Public</span>;
        }
    };

    const getRetentionLabel = (policy) => {
        const labels = {
            'PERPETUAL': 'Perpetual Archive',
            '10_YEARS': '10-Year Lifecycle',
            '5_YEARS': '5-Year Lifecycle',
            '2_YEARS': '2-Year Lifecycle'
        };
        return labels[policy] || policy;
    };

    const getExpiryStatus = (expiryDate, isHold) => {
        if (isHold) return <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"><Lock size={12} /> Legal Hold</span>;
        if (!expiryDate) return <span className="text-slate-400 italic">No Expiry</span>;
        
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <span className="text-red-500 font-bold flex items-center gap-1"><FileWarning size={12} /> Expired</span>;
        if (diffDays < 30) return <span className="text-orange-500 font-bold flex items-center gap-1"><Clock size={12} /> {diffDays}d left</span>;
        
        return <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium"><Clock size={12} /> {expiry.toLocaleDateString()}</span>;
    };

    const totalDocs = Object.values(counts.by_target_model || {}).reduce((a, b) => a + b, 0);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <GovSidebar activeTab="document-registry" currentUser={currentUser} />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 relative z-50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Records & Compliance" current="Document Registry" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap flex items-center gap-2 mt-0.5">
                            <FileText className="text-orange-600 dark:text-orange-400" size={22} />
                            Document Registry & Archive
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Centralized repository of all secured documents with SHA-256 fingerprint verification
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-black text-indigo-600">{totalDocs}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Total Documents</div>
                        </div>
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </div>
            </div>

            {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 p-4">
                {Object.entries(counts.by_target_model || {}).map(([model, count]) => (
                    <div key={model} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            {model === 'ProjectRequest' ? 'Projects' : 
                             model === 'WorkOrder' ? 'Work Orders' :
                             model === 'ProcurementRequest' ? 'Procurement' : 'OBO Inspections'}
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by filename or SHA-256 hash..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filters.target_model}
                        onChange={(e) => handleFilterChange('target_model', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {targetModelOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={filters.document_type}
                        onChange={(e) => handleFilterChange('document_type', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
                    >
                        {documentTypeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button 
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        <Search size={16} />
                        Search
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            setFilters({ target_model: '', document_type: '', search: '' });
                            setPagination(prev => ({ ...prev, offset: 0 }));
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        <X size={16} />
                        Clear
                    </button>
                </form>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <FileText size={48} className="mb-4" />
                        <p className="font-bold">No documents found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Document Details</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Policy & Risk</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Target Model</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Integrity Hash</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Retention / Hold</th>
                                    <th className="text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {documents.map((doc, idx) => (
                                    <tr key={doc.id || idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${doc.legal_hold ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                    <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={doc.file_name}>
                                                        {doc.file_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                            {doc.document_type?.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                                                            {formatFileSize(doc.file_size_bytes)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1.5 align-start">
                                                {getConfidentialityBadge(doc.confidentiality)}
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-1 uppercase tracking-wider">
                                                    {getRetentionLabel(doc.retention_policy)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">
                                                    {doc.target_model}
                                                </span>
                                                <span className="text-[10px] font-bold text-indigo-500">
                                                    ID: #{doc.target_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 group cursor-help" title={doc.sha256_hash}>
                                                <Fingerprint size={12} className="text-indigo-500" />
                                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                                    {doc.sha256_hash?.substring(0, 16)}...
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(doc.sha256_hash);
                                                        alert("SHA-256 Hash copied to clipboard for independent verification.");
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <ExternalLink size={10} className="text-slate-400" />
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                Registry Logged: {new Date(doc.uploaded_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="text-xs font-semibold">
                                                    {getExpiryStatus(doc.expiry_date, doc.legal_hold)}
                                                </div>
                                                {['system_admin', 'manager', 'city_engineer', 'division_chief'].includes(currentUser?.role) && (
                                                    <button 
                                                        onClick={() => toggleLegalHold(doc.id, doc.legal_hold)}
                                                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                                                            doc.legal_hold 
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {doc.legal_hold ? <Lock size={10} /> : <Unlock size={10} />}
                                                        LEGAL HOLD: {doc.legal_hold ? "ACTIVE" : "OFF"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleDownload(doc.id, doc.file_name)}
                                                    className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm"
                                                    title="Download (Validated Session)"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                {['system_admin', 'manager'].includes(currentUser?.role) && (
                                                    <button 
                                                        onClick={() => handleDelete(doc.id)}
                                                        disabled={doc.legal_hold}
                                                        className={`p-2 rounded-lg transition-all shadow-sm ${
                                                            doc.legal_hold 
                                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' 
                                                            : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                                                        }`}
                                                        title={doc.legal_hold ? "Deletion Blocked by Legal Hold" : "Secure Delete"}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pagination.total > 0 && (
                            <TablePagination
                                page={Math.floor(pagination.offset / pagination.limit) + 1}
                                pageSize={pagination.limit}
                                total={pagination.total}
                                itemLabel="documents"
                                onPageChange={(newPage) => setPagination(prev => ({ ...prev, offset: (newPage - 1) * prev.limit }))}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
    );
}
