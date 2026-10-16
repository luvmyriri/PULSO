import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, UserCheck, UserX, Shield, AlertTriangle, RefreshCw, Mail, Phone, MapPin, ChevronDown, MoreVertical, History, Plus, Key, Lock, Edit3, Trash2, CheckCircle, XCircle } from '../icons';
import { API_BASE_URL } from '../utils/apiBase';
import { getToken } from '../utils/auth';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';

const GOV_ROLES = [
    { value: 'admin_officer', label: 'Admin Officer' },
    { value: 'admin_clerk', label: 'Admin Clerk' },
    { value: 'records_officer', label: 'Records Officer' },
    { value: 'city_engineer', label: 'City Engineer' },
    { value: 'asst_city_engineer', label: 'Asst. City Engineer' },
    { value: 'division_chief', label: 'Division Chief' },
    { value: 'design_engineer', label: 'Design Engineer' },
    { value: 'estimator', label: 'Estimator' },
    { value: 'cad_operator', label: 'CAD Operator' },
    { value: 'project_engineer', label: 'Project Engineer' },
    { value: 'construction_foreman', label: 'Construction Foreman' },
    { value: 'field_worker', label: 'Field Worker' },
    { value: 'building_inspector', label: 'Building Inspector' },
    { value: 'electrical_inspector', label: 'Electrical Inspector' },
    { value: 'mechanical_inspector', label: 'Mechanical Inspector' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'manager', label: 'Manager' },
    { value: 'system_admin', label: 'System Administrator' },
];

export default function GovernmentUserManagementPage({ workspace }) {
    const token = getToken();
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ resident: { active: 0, suspended: 0 }, government: { active: 0, suspended: 0 }, total: 0 });
    
    const [filters, setFilters] = useState({ search: '', status: '', account_type: 'government' });
    const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionModal, setActionModal] = useState(null);
    const [actionReason, setActionReason] = useState('');
    
    // Role Management States
    const [activeView, setActiveView] = useState('users'); // 'users' or 'roles'
    const [roles, setRoles] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [newRoleData, setNewRoleData] = useState({ name: '', label: '', template_id: '', capabilities: {} });

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
            params.append('account_type', filters.account_type);
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

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            console.error('Role change failed:', err);
        }
    };

    // Role Management Logic
    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setRoles(await res.json());
        } catch (err) { console.error('Failed to fetch roles:', err); }
    };

    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/roles/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTemplates(await res.json());
        } catch (err) { console.error('Failed to fetch templates:', err); }
    };

    const handleCreateRole = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/roles`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newRoleData.name || newRoleData.label.toLowerCase().replace(/\s+/g, '_'),
                    label: newRoleData.label,
                    template_id: newRoleData.template_id,
                    capabilities: newRoleData.capabilities
                })
            });
            if (res.ok) {
                setIsCreatingRole(false);
                fetchRoles();
            } else {
                const err = await res.json();
                alert(err.detail || 'Failed to create role');
            }
        } catch (err) { console.error('Role creation failed:', err); }
    };

    useEffect(() => {
        if (activeView === 'roles') {
            fetchRoles();
            fetchTemplates();
        }
    }, [activeView]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-PH', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const activeCount = counts[filters.account_type]?.active || 0;
    const suspendedCount = counts[filters.account_type]?.suspended || 0;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <GovSidebar activeTab="settings" currentUser={currentUser} />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 relative z-50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="System Admin" current="Staff Directory & Access" />
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap flex items-center gap-2 mt-0.5">
                            <Shield className="text-orange-600 dark:text-orange-400" size={22} />
                            System Access Control
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage user accounts, dynamic roles, and fine-grained capabilities.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveView('users')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'users' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Users
                            </button>
                            <button 
                                onClick={() => setActiveView('roles')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'roles' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Roles & Permissions
                            </button>
                        </div>
                        {activeView === 'users' && (
                            <div className="flex gap-4 text-right">
                                <div>
                                    <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Active</div>
                                </div>
                                {(filters.account_type === 'government' || suspendedCount > 0) && (
                                    <div>
                                        <div className="text-2xl font-black text-red-500">{suspendedCount}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">Suspended</div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeView === 'roles' && (
                            <button 
                                onClick={() => setIsCreatingRole(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <Plus size={16} /> Create Role
                            </button>
                        )}
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </div>
            </div>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* Create Role Modal */}
                {isCreatingRole && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Plus className="text-indigo-600" />
                                    Define New System Role
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Configure name and starting permissions.</p>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Role Label (Display Name)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Senior Document Officer"
                                        value={newRoleData.label}
                                        onChange={(e) => setNewRoleData({...newRoleData, label: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start from Template (Optional)</label>
                                    <select 
                                        value={newRoleData.template_id}
                                        onChange={(e) => {
                                            const tid = e.target.value;
                                            const template = roles.find(r => r.id === tid);
                                            setNewRoleData({
                                                ...newRoleData, 
                                                template_id: tid,
                                                capabilities: template ? template.capabilities : {}
                                            });
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Blank Role</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                        <Shield size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Active Capabilities</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {Object.keys(newRoleData.capabilities).length === 0 ? (
                                            <span className="text-[10px] text-slate-400 italic">No permissions selected. Select a template or add manually.</span>
                                        ) : (
                                            Object.entries(newRoleData.capabilities).map(([mod, actions]) => (
                                                <span key={mod} className="px-2 py-0.5 bg-white dark:bg-slate-800 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100 dark:border-indigo-500/10">
                                                    {mod}: {actions.join(', ')}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button 
                                    onClick={() => setIsCreatingRole(false)}
                                    className="flex-1 py-3 text-sm font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateRole}
                                    className="flex-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 uppercase tracking-widest"
                                >
                                    Create Role
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

            {/* Views */}
            <div className="flex-1 overflow-auto p-4">
                {activeView === 'users' ? (
                    <>
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 mb-4 rounded-xl shadow-sm">
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
                                    value={filters.account_type}
                                    onChange={(e) => handleFilterChange('account_type', e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="government">Government Accounts</option>
                                    <option value="resident">Resident Accounts</option>
                                </select>
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
                        <p className="font-bold">No users found</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">User</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Role</th>
                                    <th className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider p-4">Contact</th>
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
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                                            >
                                                {GOV_ROLES.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                {user.barangay && <div className="flex items-center gap-1"><MapPin size={12} /> {user.barangay}</div>}
                                                {user.phone_number && <div className="flex items-center gap-1"><Phone size={12} /> {user.phone_number}</div>}
                                            </div>
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
                    </div>
                )}

                    </div>
                    </>
                ) : (
                    /* ROLE MANAGEMENT VIEW */
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roles.map((role) => (
                                <div key={role.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                <Key className="text-indigo-600" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{role.label}</h3>
                                                <span className="text-[10px] text-slate-400 font-mono">{role.name}</span>
                                            </div>
                                        </div>
                                        {role.is_template && (
                                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-[10px] font-black uppercase tracking-widest">
                                                Template
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Capabilities</div>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(role.capabilities).map(([mod, actions]) => (
                                                <span key={mod} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-bold">
                                                    {mod}: {actions.join(', ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                                            <Edit3 size={16} />
                                        </button>
                                        {!role.is_template && (
                                            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                            {actionModal === 'suspend' ? 'Suspend User' : 'Reactivate User'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            {actionModal === 'suspend' 
                                ? `Are you sure you want to suspend ${selectedUser.full_name}? They will lose access to the system.`
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
