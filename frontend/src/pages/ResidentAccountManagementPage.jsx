import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, UserCheck, UserX, AlertTriangle, RefreshCw, Mail, Phone, MapPin, ChevronDown, MoreVertical, History, Shield } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiBase';
import { getToken } from '../utils/auth';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import TablePagination from '../components/TablePagination';

export default function ResidentAccountManagementPage({ workspace }) {
    const token = getToken();
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ resident: { active: 0, suspended: 0 }, government: { active: 0, suspended: 0 }, total: 0 });
    
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionModal, setActionModal] = useState(null);
    const [actionReason, setActionReason] = useState('');

    const fetchCounts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/stats`, {
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

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('account_type', 'resident');
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            params.append('limit', pagination.limit);
            params.append('offset', pagination.offset);
            
            const res = await fetch(`${API_BASE_URL}/api/gov/users?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setPagination(prev => ({ ...prev, total: data.total }));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounts();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [filters, pagination.limit, pagination.offset]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, offset: 0 }));
    };

    const handleAction = async (userId, action) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason: actionReason })
            });
            if (res.ok) {
                fetchUsers();
                fetchCounts();
                setActionModal(null);
                setActionReason('');
            } else {
                const err = await res.json();
                alert(err.detail || 'Action failed');
            }
        } catch (err) {
            console.error('Action failed:', err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-PH', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const residentActive = counts.resident?.active || 0;
    const residentSuspended = counts.resident?.suspended || 0;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <GovSidebar activeTab="residents" currentUser={currentUser} />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 relative z-50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="System Admin" current="Resident Directory & Identity" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap flex items-center gap-2 mt-0.5">
                            <Users className="text-orange-600 dark:text-orange-400" size={22} />
                            Resident Account Management
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            View and manage resident citizen accounts
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-4 text-right">
                            <div>
                                <div className="text-2xl font-black text-emerald-600">{residentActive}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Active</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-red-500">{residentSuspended}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Suspended</div>
                            </div>
                        </div>
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </div>
            </div>

            {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <button 
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Users size={48} className="mb-4" />
                        <p className="font-bold">No residents found</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Resident</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Barangay</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Contact</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Trust</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Status</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Joined</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {users.map((user, idx) => (
                                    <tr key={user.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {user.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.full_name}</div>
                                                    <div className="text-xs text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">{user.barangay || '-'}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {user.phone_number && <div className="flex items-center gap-1"><Phone size={12} /> {user.phone_number}</div>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-sm font-bold ${user.trust_score >= 80 ? 'text-emerald-600' : user.trust_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {user.trust_score}%
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {user.is_suspended ? (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                                                    SUSPENDED
                                                </span>
                                            ) : user.is_active ? (
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                                                    ACTIVE
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                    INACTIVE
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-slate-400">{formatDate(user.created_at)}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1">
                                                {user.is_suspended ? (
                                                    <button
                                                        onClick={() => handleAction(user.id, 'reactivate')}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                                                        title="Reactivate"
                                                    >
                                                        <UserCheck size={16} />
                                                    </button>
                                                ) : user.is_active ? (
                                                    <button
                                                        onClick={() => { setSelectedUser(user); setActionModal('suspend'); }}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                        title="Suspend"
                                                    >
                                                        <UserX size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAction(user.id, 'activate')}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                                                        title="Activate"
                                                    >
                                                        <UserCheck size={16} />
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
                                itemLabel="residents"
                                onPageChange={(newPage) => setPagination(prev => ({ ...prev, offset: (newPage - 1) * prev.limit }))}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 bg-slate-900/60" 
                        onClick={() => { setActionModal(null); setActionReason(''); }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
                    >
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                            {actionModal === 'suspend' ? 'Suspend Resident' : 'Reactivate Resident'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            {actionModal === 'suspend' 
                                ? `Are you sure you want to suspend ${selectedUser.full_name}? They will lose access to the resident portal.`
                                : `Are you sure you want to reactivate ${selectedUser.full_name}?`
                            }
                        </p>
                        <textarea
                            placeholder="Reason (optional)"
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setActionModal(null); setActionReason(''); }}
                                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleAction(selectedUser.id, actionModal === 'suspend' ? 'suspend' : 'reactivate')}
                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold ${
                                    actionModal === 'suspend'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                            >
                                {actionModal === 'suspend' ? 'Suspend' : 'Reactivate'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    </div>
    );
}
