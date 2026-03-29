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
    CheckCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GovSidebar from '../components/GovSidebar';

// Simple bar chart placeholder since recharts is not installed yet
const MockBarChart = ({ color, values }) => (
    <div className="flex items-end gap-2 h-32 mt-4">
        {values.map((val, idx) => (
            <div key={idx} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-t-sm relative group">
                <div 
                    className={`absolute bottom-0 left-0 right-0 bg-${color}-500 rounded-t-sm transition-all duration-1000`} 
                    style={{ height: `${val}%` }}
                ></div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {val} Reports
                </div>
            </div>
        ))}
    </div>
);

const ManagementDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [token] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser] = useState(() => {
        const storedUser = localStorage.getItem('pulso_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [activeTab, setActiveTab] = useState('overview');

    // Toast
    const [toast, setToast] = useState('');
    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    // Advisory form state
    const [advisoryForm, setAdvisoryForm] = useState({
        department: '',
        title: '',
        description: '',
        priority: 'medium',
        category: 'Advisory',
        stats_affected: ''
    });
    const [postingAdvisory, setPostingAdvisory] = useState(false);

    // Users state
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (!token || !currentUser) { navigate('/gov'); }
    }, [token, currentUser, navigate]);

    useEffect(() => {
        if (activeTab === 'users' && token) {
            setLoadingUsers(true);
            fetch('http://localhost:8000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : [])
            .then(data => setUsersList(Array.isArray(data) ? data : []))
            .catch(() => setUsersList([]))
            .finally(() => setLoadingUsers(false));
        }
    }, [activeTab, token]);

    const handlePostAdvisory = async (e) => {
        e.preventDefault();
        setPostingAdvisory(true);
        try {
            const res = await fetch('http://localhost:8000/api/advisories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(advisoryForm)
            });
            if (res.ok) {
                showToast('Advisory posted successfully!');
                setAdvisoryForm({ department: '', title: '', description: '', priority: 'medium', category: 'Advisory', stats_affected: '' });
                setActiveTab('overview');
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to post advisory.');
            }
        } catch {
            showToast('Network error. Is the backend running?');
        } finally {
            setPostingAdvisory(false);
        }
    };

    // Work Order Approvals - live from API (reports with status 'pending_approval')
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);
    const [approvingId, setApprovingId] = useState(null);

    // Real KPI stats from the API
    const [reportStats, setReportStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (activeTab === 'approvals' && token) {
            setLoadingApprovals(true);
            fetch('http://localhost:8000/api/reports?status=pending_approval&limit=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : [])
            .then(data => setPendingApprovals(Array.isArray(data) ? data.filter(r => r.status === 'pending_approval') : []))
            .catch(() => setPendingApprovals([]))
            .finally(() => setLoadingApprovals(false));
        }
    }, [activeTab, token]);

    useEffect(() => {
        if (activeTab === 'overview' && token) {
            setLoadingStats(true);
            fetch('http://localhost:8000/api/reports/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : null)
            .then(data => setReportStats(data))
            .catch(() => setReportStats(null))
            .finally(() => setLoadingStats(false));
        }
    }, [activeTab, token]);

    const handleApproveReport = async (reportId) => {
        setApprovingId(reportId);
        try {
            const res = await fetch(`http://localhost:8000/api/reports/${reportId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'approved_internal' })
            });
            if (res.ok) {
                showToast('Work Order approved! Dispatcher can now dispatch a team.');
                setPendingApprovals(prev => prev.filter(r => r.id !== reportId));
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to approve.');
            }
        } catch {
            showToast('Network error.');
        } finally {
            setApprovingId(null);
        }
    };

    const handleRejectApproval = async (reportId) => {
        setApprovingId(reportId);
        try {
            const res = await fetch(`http://localhost:8000/api/reports/${reportId}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Report rejected. The resident has been notified.');
                setPendingApprovals(prev => prev.filter(r => r.id !== reportId));
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to reject.');
            }
        } catch {
            showToast('Network error.');
        } finally {
            setApprovingId(null);
        }
    };

    // KPI Data - use real stats when available, fallback display otherwise
    const kpis = [
        {
            label: 'Total Reports (All Time)',
            value: reportStats ? reportStats.total.toLocaleString() : '—',
            trend: '+12%', trendLabel: 'vs last month',
            goodTrend: true,
            Icon: Activity,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-500',
            accent: 'hover:border-blue-500/40',
            glow: 'from-blue-500/5 to-transparent',
        },
        {
            label: 'Resolved Tickets',
            value: reportStats ? reportStats.resolved.toLocaleString() : '—',
            trend: '+18%', trendLabel: 'vs last month',
            goodTrend: true,
            Icon: CheckCircle2,
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconColor: 'text-green-500',
            accent: 'hover:border-green-500/40',
            glow: 'from-green-500/5 to-transparent',
        },
        {
            label: 'Pending Approval',
            value: reportStats ? reportStats.pending_approval.toLocaleString() : '—',
            trend: '', trendLabel: 'vs last month',
            goodTrend: false,
            Icon: Clock,
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-500',
            accent: 'hover:border-orange-500/40',
            glow: 'from-orange-500/5 to-transparent',
        },
        {
            label: 'Active (Dispatched)',
            value: reportStats ? reportStats.dispatched.toLocaleString() : '—',
            trend: 'Live', trendLabel: 'vs last month',
            goodTrend: true,
            Icon: Users,
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            iconColor: 'text-indigo-500',
            accent: 'hover:border-indigo-500/40',
            glow: 'from-indigo-500/5 to-transparent',
        },
    ];

    // Permit Tracking Data
    const permits = [
        { id: 'BLD-2026-001', type: 'Building', applicant: 'MegaCorp Inc.', status: 'Pending Review', date: '2026-02-24' },
        { id: 'ELE-2026-042', type: 'Electrical', applicant: 'John Doe', status: 'Approved', date: '2026-02-23' },
        { id: 'SAN-2026-015', type: 'Sanitary', applicant: 'Fresh Eats Cafe', status: 'Under Inspection', date: '2026-02-22' },
        { id: 'OCC-2026-008', type: 'Occupancy', applicant: 'Skyline Towers', status: 'Approved', date: '2026-02-20' },
    ];

    // Mock Procurement Data
    const procurementProjects = [
        { id: 'ITB-2026-041', title: 'Rehabilitation of Drainage System - Phase 2', location: 'Barangay 176', abc: '₱ 15,450,000.00', status: 'pre_procurement', deadline: 'Aug 25, 2026' },
        { id: 'ITB-2026-038', title: 'Asphalt Overlay of Main Avenue', location: 'Victory Heights', abc: '₱ 8,200,000.00', status: 'bidding', deadline: 'Aug 18, 2026' },
        { id: 'ITB-2026-022', title: 'Construction of New Multi-Purpose Hall', location: 'Block 5', abc: '₱ 22,500,000.00', status: 'awarded', contractor: 'AlphaBuild Corp.', deadline: 'Complete' }
    ];


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-300 font-sans flex text-sm">
            
            {/* Unified Left Sidebar Navigation — role-aware */}
            <GovSidebar
                currentUser={currentUser}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />


            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* Top Header */}
                <header className="h-16 bg-white dark:bg-slate-900/50 flex items-center justify-between px-8 shrink-0 relative z-40">
                    {/* Removed subtle bottom shadow */}
                    <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                        {activeTab === 'overview' && 'Executive Performance Overview'}
                        {activeTab === 'approvals' && 'Engineering Work Order Approvals'}
                        {activeTab === 'procurement' && 'Public Bidding Pipeline (RA 9184)'}
                        {activeTab === 'permits' && 'OBO Permit Tracking Masterlist'}
                        {activeTab === 'predictive' && 'AI Predictive Maintenance Alerts'}
                        {activeTab === 'advisories' && 'Post a Public Advisory'}
                        {activeTab === 'users' && 'Registered Users'}
                    </h1>
                    
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                            <Calendar size={16}/> This Month <ChevronDown size={14}/>
                        </button>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors">
                            Generate Report
                        </button>
                        <button
                            onClick={() => { 
                                const user = JSON.parse(localStorage.getItem('pulso_user') || '{}');
                                const wasGov = user?.role && user.role !== 'resident';
                                localStorage.removeItem('pulso_token'); 
                                localStorage.removeItem('pulso_user'); 
                                navigate(wasGov ? '/gov' : '/login'); 
                            }}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={18}/>
                        </button>
                    </div>
                </header>

                {/* Dashboard Canvas */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="w-full mx-auto space-y-6">
                        
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                {/* KPI Ribbon */}
                                <div className="grid grid-cols-4 gap-6">
                                    {kpis.map((kpi, idx) => {
                                        const { Icon } = kpi;
                                        return (
                                            <div key={idx} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-all duration-200 cursor-pointer ${kpi.accent}`}>
                                                {/* Subtle gradient wash */}
                                                <div className={`absolute inset-0 bg-gradient-to-br ${kpi.glow} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

                                                {/* Icon badge — top right */}
                                                <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg} ${kpi.iconColor} shrink-0`}>
                                                    <Icon size={20} />
                                                </div>

                                                <h3 className="text-xs font-bold text-slate-500 mb-2 relative z-10 pr-12">{kpi.label}</h3>
                                                <div className="text-3xl font-display font-black text-slate-900 dark:text-white mb-3 relative z-10">{kpi.value}</div>
                                                <div className="flex items-center gap-1 text-xs font-bold relative z-10">
                                                    <TrendingUp size={12} className={kpi.goodTrend ? 'text-green-500' : 'text-orange-500'}/>
                                                    <span className={kpi.goodTrend ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                                                        {kpi.trend || '—'}
                                                    </span>
                                                    <span className="text-slate-400 font-normal">{kpi.trendLabel}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>


                                {/* Charts Area */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Reports by Utility Classification</h3>
                                        <p className="text-xs text-slate-500 mb-4">Volume of citizen AI reports resolved vs unresolved.</p>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 shrink-0 flex items-center justify-center"><Droplets size={16}/></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1"><span>Water / Drainage</span> <span>420 / 450 Resolved</span></div>
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 w-[93%]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 shrink-0 flex items-center justify-center"><Zap size={16}/></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1"><span>Electrical / Poles</span> <span>210 / 280 Resolved</span></div>
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500 w-[75%]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 text-green-600 shrink-0 flex items-center justify-center"><HardHat size={16}/></div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs font-bold mb-1"><span>Roads / Infrastructure</span> <span>472 / 554 Resolved</span></div>
                                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 w-[85%]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Resolution Velocity (30 Days)</h3>
                                        <p className="text-xs text-slate-500 mb-2">Daily completed work orders across all field fleets.</p>
                                        <div className="flex-1 flex flex-col justify-end border-b border-l border-slate-200 dark:border-slate-800 pb-2 pl-2">
                                           <MockBarChart color="indigo" values={[30, 45, 25, 60, 80, 55, 90, 40, 65, 75, 50, 85, 95, 60, 40]} />
                                        </div>
                                        <div className="text-center text-[10px] text-slate-400 font-bold mt-2 tracking-widest uppercase">Aug 1st - Aug 15th</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'predictive' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 font-bold flex items-center justify-center shrink-0">
                                            <TrendingUp size={24}/>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Predictive Maintenance Alerts</h2>
                                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                                                Our AI analysis of historical failure frequencies indicates several infrastructure nodes are approaching their <strong>Remaining Useful Life (RUL) limits</strong>. Proactive Work Orders are highly recommended to prevent catastrophic failure based on predictive modeling.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center shrink-0">
                                                    <AlertTriangle size={20}/>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Main Culvert Node #4A - High Collision Hazard</h3>
                                                    <div className="text-xs font-semibold text-slate-500">Location: Highway 5 Intersection • Utility: Drainage/Structure</div>
                                                </div>
                                            </div>
                                            <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Critical Risk (92%)</span>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                                            Historical data shows this culvert requires median structural repairs every 4.2 years. We are currently at year 3.9, and adjacent citizen reports indicate early-stage asphalt cracking.
                                        </p>
                                        <div className="flex gap-3">
                                            <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-4 py-2 rounded-lg transition-colors">View AI Analysis</button>
                                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow font-bold px-4 py-2 rounded-lg transition-colors">Generate Proactive Work Order</button>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-xl p-5 shadow-sm opacity-80">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center shrink-0">
                                                    <AlertTriangle size={20}/>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Transformer T-Sigma - Overload Warning</h3>
                                                    <div className="text-xs font-semibold text-slate-500">Location: Substation Alpha • Utility: Electrical</div>
                                                </div>
                                            </div>
                                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Medium Risk (65%)</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-4 py-2 rounded-lg transition-colors">View AI Analysis</button>
                                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow font-bold px-4 py-2 rounded-lg transition-colors">Generate Proactive Work Order</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'permits' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 relative z-10">
                                    {/* Removed fading border */}
                                    <div className="relative w-64">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search Application ID..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                    </div>
                                    <button className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                        <Filter size={16}/> Filter
                                    </button>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-4">Tracking ID</th>
                                            <th className="p-4">Applicant / Entity</th>
                                            <th className="p-4">Permit Category</th>
                                            <th className="p-4">Filing Date</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {permits.map((permit, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{permit.id}</td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                            <Building2 size={16}/>
                                                        </div>
                                                        {permit.applicant}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-semibold text-slate-500">{permit.type}</td>
                                                <td className="p-4 text-slate-500">{permit.date}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                        permit.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        permit.status === 'Pending Review' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                        {permit.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-sm">Review</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}
                        {activeTab === 'approvals' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 mb-6">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Managerial Assessment Queue</h2>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        These reports have been verified by the Command Center. Review, then approve for internal dispatch or reject with reason.
                                    </p>
                                </div>
                                {loadingApprovals ? (
                                    <div className="text-center py-12 text-slate-400"><Loader2 className="animate-spin mx-auto mb-3" size={28}/>Loading pending approvals...</div>
                                ) : pendingApprovals.length === 0 ? (
                                    <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                                        <CheckCircle size={48} className="mx-auto mb-3 opacity-20"/>
                                        <p className="font-bold">No Pending Approvals</p>
                                        <p className="text-sm mt-1">All verified reports have been processed.</p>
                                    </div>
                                ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {pendingApprovals.map((approval) => (
                                        <div key={approval.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                                                        <ClipboardCheck size={20}/>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{approval.ticket_id} — {approval.ai_category || approval.category}</h3>
                                                        <div className="text-xs font-semibold text-slate-500">
                                                            {approval.location_string || 'Location attached'} • Reported by: {approval.reporter_name || `User #${approval.user_id}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-slate-400 font-bold whitespace-nowrap">{new Date(approval.created_at).toLocaleString()}</span>
                                            </div>
                                            {approval.ai_summary && (
                                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 mb-4">
                                                    <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs mb-1 uppercase tracking-tight">
                                                        <TrendingUp size={12}/> Gemini AI Analysis
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{approval.ai_summary}"</p>
                                                    <div className="mt-2 flex gap-2 flex-wrap">
                                                        {approval.ai_category && <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">Category: {approval.ai_category}</span>}
                                                        {approval.ai_urgency && <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${approval.ai_urgency === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>Urgency: {approval.ai_urgency}</span>}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                                                <button 
                                                    onClick={() => handleRejectApproval(approval.id)}
                                                    disabled={approvingId === approval.id}
                                                    className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-bold px-4 py-2 transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800 rounded-lg disabled:opacity-50"
                                                >
                                                    {approvingId === approval.id ? '...' : 'Reject / Request Info'}
                                                </button>
                                                <button 
                                                    onClick={() => handleApproveReport(approval.id)}
                                                    disabled={approvingId === approval.id}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow font-bold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {approvingId === approval.id ? '...' : 'Approve Internal Fleet'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'procurement' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 mb-6">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Public Bidding Pipeline (RA 9184)</h2>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Major structural repairs that exceed internal LGU capabilities. Generated Programs of Work are automatically staged here for the Bids and Awards Committee (BAC) compliance tracking.
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 relative z-10">
                                        {/* Removed fading border */}
                                        <div className="relative w-64">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Search ITB No..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                        </div>
                                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold text-sm px-4 py-2 rounded-lg transition-colors">New Procurement Plan</button>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="p-4">ITB No.</th>
                                                <th className="p-4">Project Title</th>
                                                <th className="p-4">Approved Budget (ABC)</th>
                                                <th className="p-4">Bid Status</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {procurementProjects.map((project, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{project.id}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-900 dark:text-white">{project.title}</div>
                                                        <div className="text-xs text-slate-500">{project.location}</div>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">{project.abc}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            project.status === 'pre_procurement' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                            project.status === 'bidding' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        }`}>
                                                            {project.status === 'pre_procurement' ? 'Pre-Procurement' : 
                                                             project.status === 'bidding' ? 'Active Bidding' : 'Awarded'}
                                                        </span>
                                                        {project.contractor && <div className="text-xs text-slate-500 mt-1 font-semibold">To: {project.contractor}</div>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold text-sm bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">View BAC Docs</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                        {activeTab === 'advisories' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 mb-2">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Broadcast an Advisory to Residents</h2>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">This advisory will be published to all residents' dashboards immediately.</p>
                                </div>
                                <form onSubmit={handlePostAdvisory} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department / Office</label>
                                            <input required value={advisoryForm.department} onChange={e => setAdvisoryForm(p=>({...p, department: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. City Engineering Office" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                                            <select required value={advisoryForm.category} onChange={e => setAdvisoryForm(p=>({...p, category: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                                <option>Advisory</option>
                                                <option>Public Works</option>
                                                <option>Utilities</option>
                                                <option>Health & Safety</option>
                                                <option>Procurement</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Advisory Title</label>
                                        <input required value={advisoryForm.title} onChange={e => setAdvisoryForm(p=>({...p, title: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Brief, descriptive title" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Description</label>
                                        <textarea required rows={5} value={advisoryForm.description} onChange={e => setAdvisoryForm(p=>({...p, description: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Provide complete details for the residents..." />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority Level</label>
                                            <select value={advisoryForm.priority} onChange={e => setAdvisoryForm(p=>({...p, priority: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                                <option value="low">🟢 Low</option>
                                                <option value="medium">🔵 Medium</option>
                                                <option value="high">🟠 High</option>
                                                <option value="critical">🔴 Critical</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Affected Areas / Scope</label>
                                            <input value={advisoryForm.stats_affected} onChange={e => setAdvisoryForm(p=>({...p, stats_affected: e.target.value}))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Brgy 170-175, Zone 3" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setActiveTab('overview')} className="px-6 py-2.5 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                        <button type="submit" disabled={postingAdvisory} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md disabled:opacity-60">
                                            {postingAdvisory ? <><Loader2 className="animate-spin" size={16}/> Publishing...</> : <><Megaphone size={16}/> Publish Advisory</>}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'users' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{loadingUsers ? 'Loading...' : `${usersList.length} registered users`}</span>
                                        <div className="relative w-56">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Search users..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                                        </div>
                                    </div>
                                    {loadingUsers ? (
                                        <div className="text-center py-12 text-slate-400"><Loader2 className="animate-spin mx-auto mb-3" size={28}/>Loading users...</div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <th className="p-4">User</th>
                                                    <th className="p-4">Barangay</th>
                                                    <th className="p-4">Role</th>
                                                    <th className="p-4">Trust Score</th>
                                                    <th className="p-4">Joined</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {usersList.length === 0 ? (
                                                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">No users found</td></tr>
                                                ) : usersList.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{u.full_name?.charAt(0) || '?'}</div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 dark:text-white">{u.full_name}</div>
                                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-400">Brgy {u.barangay || 'N/A'}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                u.role === 'manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                                u.role === 'dispatcher' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}>{u.role}</span>
                                                        </td>
                                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{u.trust_score}</td>
                                                        <td className="p-4 text-slate-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </motion.div>
                        )}

                    </div>
                </main>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        <CheckCircle size={16} className="text-green-500"/> {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagementDashboard;
