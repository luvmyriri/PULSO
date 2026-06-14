import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
    LayoutDashboard, 
    TrendingUp, 
    AlertTriangle, 
    Settings,
    Users,
    Activity,
    Clock,
    CheckCircle2,
    Calendar,
    ChevronDown,
    Building2,
    HardHat,
    Droplets,
    Zap,
    Briefcase,
    Search,
    Filter,
    ClipboardCheck,
    Landmark,
    Megaphone,
    X,
    Loader2,
    LogOut,
    CheckCircle,
    Download,
    ShieldAlert,
    Brain,
    MapPin,
    ExternalLink,
    Package,
    FileText,
    RefreshCw,
    Target,
    History,
    Trash2,
    Plus,
    Send,
    ArrowRight,
    Layers,
    ShoppingCart
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';

import { API_BASE_URL } from '../utils/apiBase';

const ManagementDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'overview');


    useEffect(() => {
        if (!token || !currentUser) { navigate('/gov'); }
    }, [token, currentUser, navigate]);

    const [dateRange, setDateRange] = useState('last_90');
    const [toast, setToast] = useState({ msg: '', type: 'info' });
    const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'info' }), 3500); };

    // Data States
    const [dashStats, setDashStats] = useState(null);
    const [reportsArchive, setReportsArchive] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [advisories, setAdvisories] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [documentRegistry, setDocumentRegistry] = useState([]);
    const [timelineData, setTimelineData] = useState([]);
    const [loadingTab, setLoadingTab] = useState(false);
    
    // User Action States
    const [actionLoading, setActionLoading] = useState(null);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    
    // Create Advisory Form State
    const [showPostModal, setShowPostModal] = useState(false);
    const [newAdvisory, setNewAdvisory] = useState({ title: '', description: '', priority: 'normal', category: 'general', department: 'City Engineering' });
    const [postingAdvisory, setPostingAdvisory] = useState(false);

    // Fetch tab-specific data
    useEffect(() => {
        if (!token) return;
        
        const fetchTabData = async () => {
            if (!token) return;
            setLoadingTab(true);
            try {
                if (activeTab === 'overview') {
                    const r = await fetch(`${API_BASE_URL}/api/gov/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (r.ok) setDashStats(await r.json());
                } else if (activeTab === 'archive') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/reports-archive`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setReportsArchive(await res.json());
                } else if (activeTab === 'audit') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/audit?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setAuditLogs(await res.json());
                } else if (activeTab === 'documents') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/documents`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setDocumentRegistry(await res.json());
                } else if (activeTab === 'timeline') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/timeline?limit=30`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setTimelineData(await res.json());
                } else if (activeTab === 'users') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/users`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) {
                        const data = await res.json();
                        setUsersList(Array.isArray(data) ? data : (data?.users || []));
                    }
                } else if (activeTab === 'advisories') {
                    const res = await fetch(`${API_BASE_URL}/api/gov/advisories`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setAdvisories(await res.json());
                }
            } catch (err) { console.error("Tab fetch error:", err); }
            finally { setLoadingTab(false); }
        };

        fetchTabData();
    }, [activeTab, token]);

    const handleGenerateReport = () => {
        fetch(`${API_BASE_URL}/api/gov/analytics/export/full-report`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.blob()).then(blob => {
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'PULSO_Audit_Export.csv'; a.click();
            showToast('Export successful!');
        }).catch(() => showToast('Export failed.', 'error'));
    };

    const handleUserAction = async (userId, action) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action, reason: `Admin action via Management Dashboard` })
            });
            if (res.ok) {
                showToast(`User ${action} successful`, 'success');
                // Refresh list
                const resList = await fetch(`${API_BASE_URL}/api/gov/users`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resList.ok) {
                    const data = await resList.json();
                    setUsersList(Array.isArray(data) ? data : (data?.users || []));
                }
            } else {
                showToast('Failed to update user status.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateRole = async () => {
        if (!selectedUser || !newRole) return;
        setActionLoading(selectedUser.id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/${selectedUser.id}/role`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                showToast('Role updated successfully', 'success');
                setShowRoleModal(false);
                // Refresh list
                const resList = await fetch(`${API_BASE_URL}/api/gov/users`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resList.ok) {
                    const data = await resList.json();
                    setUsersList(Array.isArray(data) ? data : (data?.users || []));
                }
            } else {
                showToast('Failed to update role.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePostAdvisory = async (e) => {
        e.preventDefault();
        setPostingAdvisory(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/advisories`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newAdvisory)
            });
            if (res.ok) {
                const created = await res.json();
                setAdvisories(prev => [created, ...prev]);
                setShowPostModal(false);
                setNewAdvisory({ title: '', description: '', priority: 'normal', category: 'general', department: 'City Engineering' });
                showToast('Advisory broadcast successfully!', 'success');
            } else {
                showToast('Failed to post advisory.', 'error');
            }
        } catch (err) {
            showToast('Network error.', 'error');
        } finally {
            setPostingAdvisory(false);
        }
    };

    const handleDeleteAdvisory = async (id) => {
        if (!window.confirm('Are you sure you want to retract this broadcast?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/advisories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAdvisories(prev => prev.filter(a => a.id !== id));
                showToast('Broadcast retracted.', 'info');
            }
        } catch (err) {
            showToast('Failed to retract advisory.', 'error');
        }
    };

    const ICON_MAP = { HardHat, Droplets, Zap, ShieldAlert, Building2 };
    const COLOR_MAP = {
        orange: { bar: 'bg-orange-500', icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' },
        blue:   { bar: 'bg-blue-500',   icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
        yellow: { bar: 'bg-yellow-400', icon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' },
        green:  { bar: 'bg-green-500',  icon: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
        indigo: { bar: 'bg-indigo-500', icon: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' }
    };

    const kpis = [
        { label: 'Total Reports', value: dashStats?.total_reports ?? '—', trend: dashStats?.total_trend ?? '0%', icon: Activity, color: 'blue' },
        { label: 'Resolved', value: dashStats?.resolved ?? '—', trend: dashStats?.resolved_trend ?? '0%', icon: CheckCircle2, color: 'green' },
        { label: 'Pending Audit', value: dashStats?.pending_approval ?? '—', trend: 'LGU Queue', icon: Clock, color: 'orange' },
        { label: 'LGU Personnel', value: dashStats?.total_officials ?? '—', trend: 'Active', icon: HardHat, color: 'indigo' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
            <GovSidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white dark:bg-slate-900/50 border-b dark:border-slate-800 flex items-center justify-between px-8 shrink-0 relative z-40">
                    <h1 className="text-xl font-black">{
                        activeTab === 'overview' ? 'Management Dashboard' :
                        activeTab === 'archive' ? 'Reports Archive' :
                        activeTab === 'documents' ? 'Document Registry' :
                        activeTab === 'audit' ? 'Audit Command' : 
                        activeTab === 'timeline' ? 'Process Timeline' :
                        activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
                    }</h1>
                    
                    <div className="flex items-center gap-4">
                        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs font-bold">
                            <option value="last_90">Last 90 Days</option>
                            <option value="this_month">This Month</option>
                        </select>
                        <button onClick={handleGenerateReport} className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                            <Download size={14} /> Export Audit
                        </button>
                        <ThemeToggle />
                        <button onClick={() => { localStorage.clear(); navigate('/gov'); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="overview" className="max-w-7xl mx-auto space-y-8">
                                <div className="mb-2">
                                    <h2 className="text-2xl font-black flex items-center gap-2">
                                        <Activity size={24} className="text-indigo-500" />
                                        Executive Performance
                                    </h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Municipal Operational Intelligence</p>
                                </div>

                                {/* KPIs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {kpis.map((kpi, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-2 rounded-xl bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 text-${kpi.color}-600`}>
                                                    <kpi.icon size={20} />
                                                </div>
                                                <div className="text-[10px] font-black text-green-500 uppercase">{kpi.trend}</div>
                                            </div>
                                            <p className="text-2xl font-black tracking-tight">{kpi.value}</p>
                                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</h3>
                                        </div>
                                    ))}
                                </div>

                                {/* Predictive Maintenance Alerts */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-black flex items-center gap-2"><Brain size={18} className="text-purple-500" /> Predictive Maintenance Overview</h3>
                                        <button onClick={() => navigate('/gov/predictive')} className="text-xs font-black text-indigo-500 hover:underline flex items-center gap-1">Expand Insights <ArrowRight size={12}/></button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(dashStats?.predictive_alerts || []).map((alert, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-700/50">
                                                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                                                    <AlertTriangle size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xs mb-1">{alert.title}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold mb-2 flex items-center gap-1"><MapPin size={10}/>{alert.location}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black uppercase">{alert.risk_label}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">Score: {alert.risk_score}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-black flex items-center gap-2"><Layers size={18} className="text-orange-500" /> Infrastructure Stress Zones</h3>
                                            <button onClick={() => navigate('/gov/analytics')} className="text-[10px] font-black uppercase text-orange-500 tracking-widest hover:underline">Full Spatial Audit</button>
                                        </div>
                                        <div className="space-y-4">
                                            {(dashStats?.classifications || []).map((cls, i) => {
                                                const Icon = ICON_MAP[cls.icon] || AlertTriangle;
                                                const clr = COLOR_MAP[cls.color] || COLOR_MAP.orange;
                                                const pct = cls.total > 0 ? Math.round((cls.resolved / cls.total) * 100) : 0;
                                                return (
                                                    <div key={i} className="space-y-1">
                                                        <div className="flex justify-between text-[11px] font-black uppercase text-slate-500">
                                                            <span className="flex items-center gap-1.5"><Icon size={12}/>{cls.label}</span>
                                                            <span className="text-slate-900 dark:text-white">{pct}% Optimal</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full ${clr.bar} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800">
                                        <h3 className="font-black mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> Resolution Velocity (30D)</h3>
                                        <div className="h-40 flex items-end gap-1 px-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                            {(dashStats?.velocity_series || []).map((d, i) => {
                                                const maxVal = Math.max(...(dashStats?.velocity_series || [{count:1}]).map(v => v.count), 1);
                                                const h = Math.round((d.count / maxVal) * 100);
                                                return <div key={i} className="flex-1 bg-blue-500 rounded-t-sm" style={{ height: `${h}%` }} />;
                                            })}
                                        </div>
                                        <p className="mt-3 text-center text-[10px] font-black text-slate-400 tracking-widest uppercase">System Productivity Metrics</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'archive' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="archive" className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-black">Reports Archive</h2>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 font-black uppercase text-slate-500 tracking-widest border-b dark:border-slate-800">
                                        <tr><th className="px-6 py-4">Ticket</th><th className="px-6 py-4">Description</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Archived Date</th></tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {loadingTab ? <tr><td colSpan="4" className="py-20 text-center"><Loader2 size={24} className="animate-spin mx-auto text-indigo-500" /></td></tr> : 
                                            reportsArchive.length > 0 ? reportsArchive.map(rpt => (
                                            <tr key={rpt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <td className="px-6 py-4 font-black text-indigo-500">{rpt.ticket_id}</td>
                                                <td className="px-6 py-4 opacity-70 truncate max-w-md">{rpt.description}</td>
                                                <td className="px-6 py-4 text-center"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black uppercase">resolved</span></td>
                                                <td className="px-6 py-4 text-right opacity-50">{new Date(rpt.updated_at).toLocaleDateString()}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="py-20 text-center text-slate-400">Archive empty.</td></tr>}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}

                        {activeTab === 'timeline' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="timeline" className="max-w-4xl mx-auto space-y-4">
                                {loadingTab ? <div className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-indigo-500" /></div> :
                                    timelineData.length > 0 ? timelineData.map((event, idx) => (
                                    <div key={idx} className="relative flex gap-6 pl-6 before:absolute before:left-0 before:top-2 before:bottom-[-16px] before:w-px before:bg-slate-200 dark:before:bg-slate-800 last:before:hidden">
                                        <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.1)]" />
                                        <div className="py-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{new Date(event.created_at).toLocaleString()}</div>
                                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                                <div className="font-black text-sm mb-1">{event.status.replace(/_/g, ' ').toUpperCase()}</div>
                                                <p className="text-xs text-slate-500 mb-2">{event.note || 'No additional details provided.'}</p>
                                                <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full inline-block">Ref: {event.project_id ? `PROJ-${event.project_id}` : `REP-${event.report_id}`}</div>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-center py-20 text-slate-400 font-bold">No global events captured.</div>}
                            </motion.div>
                        )}

                        {activeTab === 'audit' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="audit" className="bg-slate-950 rounded-3xl p-8 font-mono text-[11px] h-[600px] overflow-y-auto border border-slate-800 shadow-2xl relative">
                                <div className="sticky top-0 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 pb-2 mb-4 text-slate-500 font-black uppercase tracking-[0.2em]">PULSO Kernel Audit Output</div>
                                {loadingTab ? <div className="py-4 text-slate-700 animate-pulse">Establishing secure link...</div> :
                                    auditLogs.length > 0 ? auditLogs.map(log => (
                                    <div key={log.id} className="flex gap-4 mb-2 hover:bg-white/5 p-1 rounded transition-colors group">
                                        <span className="text-slate-600 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                        <span className={`shrink-0 font-bold ${log.trigger_type === 'maintenance' ? 'text-blue-400' : 'text-green-500'}`}>[{log.trigger_type.toUpperCase()}]</span>
                                        <span className="text-slate-300">{log.action}</span>
                                        <span className="text-slate-600 ml-auto opacity-0 group-hover:opacity-100">AID:{log.actor_id || 'SYS'}</span>
                                    </div>
                                )) : <div className="text-slate-800">No logs found.</div>}
                            </motion.div>
                        )}

                        {activeTab === 'documents' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="documents" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {loadingTab ? <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div> :
                                    documentRegistry.length > 0 ? documentRegistry.map(doc => (
                                    <div key={doc.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 transition-all hover:scale-[1.02] group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/20 text-orange-600"><FileText size={24} /></div>
                                            <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.category}</span>
                                        </div>
                                        <h3 className="font-black text-sm mb-1 truncate">{doc.file_name}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold mb-4">{doc.document_type.replace(/_/g, ' ')}</p>
                                        <div className="border-t dark:border-slate-800 pt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-indigo-600 font-black text-[10px] uppercase flex items-center gap-1">Download <Download size={10}/></a>
                                            <span className="text-[10px] text-slate-400 font-black">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                )) : <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Registry Empty</div>}
                            </motion.div>
                        )}

                        {activeTab === 'users' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="users" className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-black">User Management</h2>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Total Personnel: {usersList.length}</span>
                                    </div>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 font-black uppercase text-slate-500 text-[10px] tracking-widest border-b dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Identity</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {loadingTab ? <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td></tr> : 
                                         usersList.length > 0 ? usersList.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {u.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-black">{u.full_name}</div>
                                                        <div className="text-[10px] opacity-40">{u.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => { setSelectedUser(u); setNewRole(u.role); setShowRoleModal(true); }}
                                                        className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[9px] font-black uppercase hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                    >
                                                        {u.role.replace(/_/g, ' ')}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${!u.is_active || u.is_suspended ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                        {u.is_suspended ? 'Suspended' : u.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {u.id !== currentUser.id && (
                                                            <>
                                                                {u.is_suspended || !u.is_active ? (
                                                                    <button 
                                                                        onClick={() => handleUserAction(u.id, 'activate')}
                                                                        disabled={actionLoading === u.id}
                                                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                        title="Activate User"
                                                                    >
                                                                        {actionLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleUserAction(u.id, 'suspend')}
                                                                        disabled={actionLoading === u.id}
                                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                        title="Suspend User"
                                                                    >
                                                                        {actionLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="py-20 text-center text-slate-400">No users found.</td></tr>}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}

                        {activeTab === 'procurement' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="procurement" className="max-w-5xl mx-auto space-y-6">
                                <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border dark:border-slate-800 text-center shadow-2xl">
                                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <ShoppingCart size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-3">Procurement Command Hub</h3>
                                    <p className="text-slate-500 text-sm mb-8 mx-auto max-w-sm">Consolidated visibility into LGU supply chain requests, biddings, and acquisition integrity (RA 9184 compliance).</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-10">
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Total Lifecycle</div>
                                            <div className="text-3xl font-black">{dashStats?.total_procurement_requests ?? '—'}</div>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Active Drafts</div>
                                            <div className="text-3xl font-black">{dashStats?.pending_procurement ?? '—'}</div>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800">
                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-[0.2em]">Sent to BOC</div>
                                            <div className="text-3xl font-black">{dashStats?.sent_to_procurement ?? '—'}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate('/gov/procurement')} className="bg-indigo-600 text-white px-10 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-transform active:scale-95">Open Procurement Suite</button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'permits' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="permits" className="max-w-5xl mx-auto space-y-6">
                                <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border dark:border-slate-800 text-center shadow-2xl">
                                    <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Briefcase size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-3">OBO Civil Registry</h3>
                                    <p className="text-slate-500 text-sm mb-8 mx-auto max-w-sm">Archival records of municipal building permits, structural inspections, and occupancy certificates.</p>
                                    <div className="p-6 inline-block rounded-[2rem] bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 text-left mb-10">
                                        <div className="text-[10px] font-black text-orange-500 uppercase mb-2 tracking-[0.1em]">Verified Engineering Records</div>
                                        <div className="text-3xl font-black text-orange-700 dark:text-orange-400">{dashStats?.total_obo_inspections ?? '—'} Registered</div>
                                    </div>
                                    <div className="block">
                                        <button onClick={() => navigate('/gov/obo')} className="bg-orange-600 text-white px-10 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-600/20 hover:scale-105 transition-transform active:scale-95">Go to Engineering Console</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'advisories' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="advisories" className="max-w-5xl mx-auto space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h2 className="text-2xl font-black flex items-center gap-2">
                                            <Megaphone size={24} className="text-red-500" />
                                            Tactical Communications
                                        </h2>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">System-wide broadcast protocol</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowPostModal(true)}
                                        className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                                    >
                                        <Plus size={16} /> New Broadcast
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {loadingTab ? (
                                        <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-red-500" size={32} /></div>
                                    ) : advisories.length > 0 ? (
                                        advisories.map((adv) => (
                                            <div key={adv.id} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${adv.priority === 'urgent' ? 'bg-red-500' : adv.priority === 'high' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                                                <div className="flex justify-between items-start mb-4 pl-2">
                                                    <div>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${adv.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            {adv.priority}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-2 tracking-widest">{adv.category}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteAdvisory(adv.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <h3 className="text-lg font-black mb-2 pl-2 dark:text-white">{adv.title}</h3>
                                                <p className="text-sm text-slate-500 mb-6 pl-2 line-clamp-3">{adv.description}</p>
                                                <div className="flex items-center justify-between pl-2 border-t dark:border-slate-800 pt-4">
                                                    <div className="text-[10px] font-bold text-slate-400">
                                                        {adv.department} • {adv.author_name || 'Senior Official'}
                                                    </div>
                                                    <div className="text-[10px] font-medium text-slate-400 tabular-nums">
                                                        {new Date(adv.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800">
                                            <Megaphone size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No Active Broadcasts</p>
                                        </div>
                                    )}
                                </div>

                                {/* POST MODAL */}
                                <AnimatePresence>
                                    {showPostModal && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                                            <motion.div 
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                onClick={() => setShowPostModal(false)}
                                                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                                            />
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                                className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border dark:border-slate-800"
                                            >
                                                <div className="h-2 bg-red-600" />
                                                <div className="p-8">
                                                    <div className="flex justify-between items-center mb-8">
                                                        <div>
                                                            <h3 className="text-2xl font-black flex items-center gap-3">
                                                                <Megaphone className="text-red-500" />
                                                                New Tactical Broadcast
                                                            </h3>
                                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Authorized Official Clearance Required</p>
                                                        </div>
                                                        <button onClick={() => setShowPostModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                                                    </div>

                                                    <form onSubmit={handlePostAdvisory} className="space-y-6">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Broadcast Title</label>
                                                            <input 
                                                                required
                                                                disabled={postingAdvisory}
                                                                value={newAdvisory.title}
                                                                onChange={e => setNewAdvisory({...newAdvisory, title: e.target.value})}
                                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 focus:ring-2 ring-red-500 transition-all font-bold"
                                                                placeholder="e.g., Scheduled Maintenance: City Grid A"
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Priority Level</label>
                                                                <select 
                                                                    value={newAdvisory.priority}
                                                                    onChange={e => setNewAdvisory({...newAdvisory, priority: e.target.value})}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 focus:ring-2 ring-red-500 transition-all font-bold text-sm"
                                                                >
                                                                    <option value="normal">Normal</option>
                                                                    <option value="high">High Priority</option>
                                                                    <option value="urgent">Urgent / Critical</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Category</label>
                                                                <select 
                                                                    value={newAdvisory.category}
                                                                    onChange={e => setNewAdvisory({...newAdvisory, category: e.target.value})}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 focus:ring-2 ring-red-500 transition-all font-bold text-sm"
                                                                >
                                                                    <option value="general">General</option>
                                                                    <option value="maintenance">Maintenance</option>
                                                                    <option value="emergency">Emergency</option>
                                                                    <option value="traffic">Traffic</option>
                                                                    <option value="water">Water / Utilities</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Public Description</label>
                                                            <textarea 
                                                                required
                                                                disabled={postingAdvisory}
                                                                value={newAdvisory.description}
                                                                onChange={e => setNewAdvisory({...newAdvisory, description: e.target.value})}
                                                                rows={4}
                                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 focus:ring-2 ring-red-500 transition-all font-medium text-sm resize-none"
                                                                placeholder="Provide clear instructions or details for the public..."
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-4 pt-4">
                                                            <button 
                                                                type="button"
                                                                disabled={postingAdvisory}
                                                                onClick={() => setShowPostModal(false)}
                                                                className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                type="submit"
                                                                disabled={postingAdvisory}
                                                                className="flex-[2] bg-red-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                {postingAdvisory ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                                                {postingAdvisory ? 'Deploying...' : 'Deploy Broadcast'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>

                                {/* ROLE MODAL */}
                                <AnimatePresence>
                                    {showRoleModal && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                            <motion.div 
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                onClick={() => setShowRoleModal(false)}
                                                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                                            />
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border dark:border-slate-800 overflow-hidden"
                                            >
                                                <div className="p-8">
                                                    <h3 className="text-xl font-black mb-1">Update Personnel Role</h3>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Modifying Clearance for {selectedUser?.full_name}</p>
                                                    
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select New Role</label>
                                                            <select 
                                                                value={newRole}
                                                                onChange={e => setNewRole(e.target.value)}
                                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-bold text-sm"
                                                            >
                                                                <option value="dispatcher">Dispatcher</option>
                                                                <option value="senior_dispatcher">Senior Dispatcher</option>
                                                                <option value="city_engineer">City Engineer</option>
                                                                <option value="project_engineer">Project Engineer</option>
                                                                <option value="admin_officer">Admin Officer</option>
                                                                <option value="manager">LGU Manager</option>
                                                                <option value="system_admin">System Admin</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 pt-8">
                                                        <button 
                                                            onClick={() => setShowRoleModal(false)}
                                                            className="flex-1 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-sans"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            onClick={handleUpdateRole}
                                                            disabled={actionLoading !== null}
                                                            className="flex-[2] bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {actionLoading === selectedUser?.id ? <Loader2 className="animate-spin" size={14} /> : 'Apply Clearance'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <AnimatePresence>
                {toast.msg && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10">
                        <CheckCircle size={20} className="text-green-500" />
                        <div className="font-bold text-sm tracking-tight">{toast.msg}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagementDashboard;
