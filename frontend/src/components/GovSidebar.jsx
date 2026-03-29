/**
 * GovSidebar.jsx
 * Unified, role-aware left navigation sidebar for all government dashboard pages.
 * Implements the full division + position hierarchy of the City Engineering Office.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    AlertTriangle, LayoutDashboard, ClipboardCheck, Landmark,
    Megaphone, Users, Briefcase, TrendingUp, Settings, LogOut,
    HardHat, Ruler, Building2, ShieldCheck, PackageCheck, FlaskConical,
    Wrench, BarChart as BarChart2, ChevronDown, ChevronRight, Map,
    ClipboardList, GitBranch, FileCheck, Truck, Eye, UserCog,
    BookOpen, Activity, FileBarChart2, FileCheck2
} from 'lucide-react';
import Branding from './Branding';

// ─────────────────────────────────────────────────────────────────────────────
// Role-based menu visibility
// ─────────────────────────────────────────────────────────────────────────────
const GOV_ROLES = [
    'city_engineer','asst_city_engineer','admin_officer','admin_clerk',
    'records_officer','division_chief','design_engineer','estimator',
    'cad_operator','project_engineer','construction_foreman','field_worker',
    'building_inspector','electrical_inspector','mechanical_inspector',
    'dispatcher','manager','system_admin',
];

const SENIOR_ROLES = ['city_engineer','asst_city_engineer','admin_officer','division_chief','manager','system_admin'];
const EXECUTIVE_ROLES = ['city_engineer','asst_city_engineer','manager','system_admin'];
const INSPECTOR_ROLES = ['building_inspector','electrical_inspector','mechanical_inspector','city_engineer','asst_city_engineer','manager','system_admin'];
const PROCUREMENT_ROLES = ['project_engineer','admin_officer','estimator','city_engineer','asst_city_engineer','manager','system_admin'];
const ADMIN_ONLY = ['system_admin','manager'];
const DESIGN_ROLES = ['design_engineer','cad_operator','division_chief','city_engineer','asst_city_engineer','system_admin'];
const SURVEY_ROLES = ['project_engineer','construction_foreman','division_chief','city_engineer','asst_city_engineer','system_admin'];
const CONSTRUCTION_ROLES = ['project_engineer','construction_foreman','field_worker','dispatcher','division_chief','city_engineer','asst_city_engineer','system_admin'];

const hasRole = (userRole, allowed) => allowed.includes(userRole);

// ─────────────────────────────────────────────────────────────────────────────
// Nav Item structure
// ─────────────────────────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, to, tab, activeTab, onTabChange, badge, indent = false, external = false }) => {
    const location = useLocation();
    const isActive = to
        ? location.pathname === to || location.pathname.startsWith(to + '/')
        : activeTab === tab;

    const baseClass = `w-full flex items-center justify-between px-3 py-2 rounded-lg font-bold transition-all group text-sm ${indent ? 'pl-8' : ''}`;
    const activeClass = 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
    const inactiveClass = 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white';

    const content = (
        <>
            <span className="flex items-center gap-3">
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
            </span>
            {badge !== undefined && badge !== null && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 min-w-[18px] text-center">{badge}</span>
            )}
        </>
    );

    if (to) {
        return (
            <Link to={to} className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}>
                {content}
            </Link>
        );
    }

    return (
        <button
            onClick={() => onTabChange?.(tab)}
            className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
        >
            {content}
        </button>
    );
};

// Collapsible section
const NavSection = ({ title, icon: Icon, children, defaultOpen = false, color = 'slate' }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="mb-1">
            <button
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group`}
            >
                <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest text-${color}-500`}>
                    <Icon size={13} />
                    {title}
                </span>
                {open
                    ? <ChevronDown size={13} className="text-slate-400" />
                    : <ChevronRight size={13} className="text-slate-400" />
                }
            </button>
            {open && (
                <div className="mt-0.5 space-y-0.5 pb-1 border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-1">
                    {children}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Sidebar Component
// ─────────────────────────────────────────────────────────────────────────────
const GovSidebar = ({ activeTab, onTabChange, currentUser }) => {
    const navigate = useNavigate();
    const role = currentUser?.role || 'dispatcher';

    const handleSignOut = () => {
        const user = JSON.parse(localStorage.getItem('pulso_user') || '{}');
        const wasGov = user?.role && user.role !== 'resident';
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
        if (wasGov) {
            navigate('/gov');
        } else {
            navigate('/login');
        }
    };

    // Role display label mapping
    const roleLabels = {
        city_engineer: 'City Engineer',
        asst_city_engineer: 'Asst. City Engineer',
        admin_officer: 'Administrative Officer V',
        admin_clerk: 'Administrative Clerk',
        records_officer: 'Records Officer',
        division_chief: 'Division Chief',
        design_engineer: 'Design Engineer',
        estimator: 'Estimator / QS',
        cad_operator: 'CAD Operator',
        project_engineer: 'Project Engineer',
        construction_foreman: 'Construction Foreman',
        field_worker: 'Field Worker',
        building_inspector: 'Building Inspector',
        electrical_inspector: 'Electrical Inspector',
        mechanical_inspector: 'Mechanical Inspector',
        dispatcher: 'Dispatcher',
        manager: 'Manager',
        system_admin: 'System Administrator',
    };

    const avatarBg = {
        city_engineer: 'from-blue-600 to-indigo-700',
        asst_city_engineer: 'from-blue-500 to-indigo-600',
        admin_officer: 'from-purple-500 to-purple-700',
        system_admin: 'from-red-600 to-orange-600',
        manager: 'from-indigo-500 to-blue-700',
        dispatcher: 'from-orange-500 to-orange-700',
        building_inspector: 'from-teal-500 to-cyan-700',
        electrical_inspector: 'from-yellow-500 to-orange-500',
        mechanical_inspector: 'from-green-500 to-emerald-700',
        project_engineer: 'from-emerald-500 to-teal-600',
        estimator: 'from-violet-500 to-purple-600',
    };
    const bg = avatarBg[role] || 'from-slate-500 to-slate-700';

    return (
        <div className="w-64 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-50 relative h-screen">
            {/* Logo */}
            <div className="h-20 flex items-center px-4 relative shrink-0 border-b border-slate-100 dark:border-slate-800">
                <Link to="/" className="flex items-center">
                    <Branding size="h-9" />
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar">

                {/* ── OPERATIONS ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-1">Operations</div>
                <NavItem icon={LayoutDashboard} label="My Dashboard" to="/gov/my-dashboard" />
                {/* Command Center only for dispatcher / admin clerk + senior roles */}
                {hasRole(role, ['admin_clerk', 'dispatcher', 'admin_officer', ...SENIOR_ROLES]) && (
                    <NavItem icon={AlertTriangle} label="Command Center" to="/dispatcher" />
                )}
                {hasRole(role, SENIOR_ROLES) && (
                    <NavItem icon={LayoutDashboard} label="Exec Overview" tab="overview" activeTab={activeTab} onTabChange={onTabChange} to="/management" />
                )}

                {/* ── WORK & TRIAGE ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-3">Triage & Work Orders</div>
                {hasRole(role, SENIOR_ROLES) && (
                    <NavItem icon={ClipboardCheck} label="W.O. Approvals" tab="approvals" activeTab={activeTab} onTabChange={onTabChange} to="/management" />
                )}
                {hasRole(role, GOV_ROLES) && (
                    <NavItem icon={GitBranch} label="Work Orders" to="/gov/work-orders" />
                )}
                {hasRole(role, GOV_ROLES) && (
                    <NavItem icon={Activity} label="Process Timeline" to="/gov/timeline" />
                )}

                {/* ── DIVISIONS ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-3">Divisions</div>

                {/* Administrative Division */}
                {hasRole(role, ['admin_officer','admin_clerk','records_officer','system_admin','manager','city_engineer','asst_city_engineer']) && (
                    <NavSection title="Administrative" icon={Briefcase} defaultOpen={['admin_officer','admin_clerk','records_officer'].includes(role)}>
                        <NavItem icon={Users} label="Manage Users" tab="users" activeTab={activeTab} onTabChange={onTabChange} indent to="/management" />
                        <NavItem icon={BookOpen} label="Records & Registry" to="/gov/records" indent />
                        <NavItem icon={FileBarChart2} label="Reports Archive" to="/gov/reports-archive" indent />
                        <NavItem icon={FileCheck2} label="Audit Logs" to="/gov/audit-logs" indent />
                    </NavSection>
                )}

                {/* Design Division */}
                {hasRole(role, DESIGN_ROLES) && (
                    <NavSection title="Design & Planning" icon={Ruler} defaultOpen={['design_engineer','cad_operator'].includes(role)}>
                        <NavItem icon={Map} label="LGU Projects" to="/gov/projects" indent />
                        <NavItem icon={Building2} label="Design Requests" to="/gov/design-requests" indent />
                        <NavItem icon={FlaskConical} label="Structure Analysis" to="/gov/analysis" indent />
                    </NavSection>
                )}

                {/* Survey Division */}
                {hasRole(role, SURVEY_ROLES) && (
                    <NavSection title="Survey & Estimation" icon={Eye} defaultOpen={role === 'estimator'}>
                        <NavItem icon={Map} label="Field Surveys" to="/gov/surveys" indent />
                        <NavItem icon={ClipboardList} label="Bill of Quantities" to="/gov/boq" indent />
                        <NavItem icon={PackageCheck} label="Cost Estimation" to="/gov/estimation" indent />
                    </NavSection>
                )}

                {/* Construction / Field Division */}
                {hasRole(role, CONSTRUCTION_ROLES) && (
                    <NavSection title="Construction & Field" icon={HardHat} defaultOpen={['project_engineer','construction_foreman','field_worker','dispatcher'].includes(role)}>
                        <NavItem icon={Truck} label="Dispatch & Fleet" to="/dispatcher" indent />
                        <NavItem icon={Wrench} label="Active Work Orders" to="/gov/work-orders" indent />
                        <NavItem icon={TrendingUp} label="Predictive Maint." tab="predictive" activeTab={activeTab} onTabChange={onTabChange} badge={2} to="/management" indent />
                    </NavSection>
                )}

                {/* OBO Division */}
                {hasRole(role, INSPECTOR_ROLES) && (
                    <NavSection title="OBO — Building Official" icon={ShieldCheck} defaultOpen={['building_inspector','electrical_inspector','mechanical_inspector'].includes(role)} color="teal">
                        <NavItem icon={Building2} label="OBO Inspections" to="/gov/obo" indent />
                        <NavItem icon={Briefcase} label="Permit Tracking" tab="permits" activeTab={activeTab} onTabChange={onTabChange} to="/management" indent />
                    </NavSection>
                )}

                {/* Procurement / BAC */}
                {hasRole(role, PROCUREMENT_ROLES) && (
                    <NavSection title="Procurement / BAC" icon={PackageCheck} defaultOpen={['estimator'].includes(role)} color="violet">
                        <NavItem icon={Landmark} label="RA 9184 Bidding" tab="procurement" activeTab={activeTab} onTabChange={onTabChange} to="/management" indent />
                        <NavItem icon={ClipboardList} label="Procurement Requests" to="/gov/procurement" indent />
                    </NavSection>
                )}

                {/* ── BROADCAST & COMMS ── */}
                {hasRole(role, SENIOR_ROLES) && (
                    <>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-3">Communications</div>
                        <NavItem icon={Megaphone} label="Post Advisory" tab="advisories" activeTab={activeTab} onTabChange={onTabChange} to="/management" />
                    </>
                )}

                {/* ── SYSTEM ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-3">System</div>
                {hasRole(role, ADMIN_ONLY) && (
                    <NavItem icon={UserCog} label="Role Management" to="/gov/users" />
                )}
                <NavItem icon={Settings} label="Settings" to="/gov/settings" />
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-bold text-sm transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 mt-1"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>

            {/* User Card */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center font-black text-white text-sm shadow shrink-0`}>
                        {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'G'}
                    </div>
                    <div className="min-w-0">
                        <div className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">
                            {currentUser?.full_name || 'LGU Staff'}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-bold truncate">
                            {roleLabels[role] || role}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GovSidebar;
