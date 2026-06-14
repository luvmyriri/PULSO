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
    BookOpen, Activity, FileBarChart2, FileCheck2, Brain, Home, FileText, Shield
} from 'lucide-react';
import Branding from './Branding';
import { checkPermission, canAccessModule, hasPIIAccess } from '../utils/rbac_utils';

// ─────────────────────────────────────────────────────────────────────────────
// Role-based menu visibility (updated for granular RBAC)
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_EXECUTIVE = ['city_engineer', 'asst_city_engineer'];
const ROLE_ADMIN = ['system_admin', 'admin_officer', 'records_officer'];
const ROLE_SENIOR = ['division_chief', 'division_chief_arch', 'division_chief_structural', 'division_chief_electrical', 'project_engineer', 'design_engineer', 'manager'];
const ROLE_STAFF = ['cad_operator', 'estimator', 'construction_foreman', 'field_worker', 'building_inspector', 'electrical_inspector', 'mechanical_inspector', 'admin_clerk'];
const ROLE_INSPECTOR = ['building_inspector', 'electrical_inspector', 'mechanical_inspector'];
const ROLE_DESIGN = ['design_engineer', 'cad_operator', 'division_chief', 'division_chief_arch'];
const ROLE_SURVEY = ['project_engineer', 'estimator', 'construction_foreman', 'division_chief_structural'];
const ROLE_PROCUREMENT = ['project_engineer', 'admin_officer', 'estimator'];
const ROLE_CONSTRUCTION = ['construction_foreman', 'field_worker', 'project_engineer'];
const ROLE_OBO = [...ROLE_INSPECTOR, ...ROLE_EXECUTIVE];

const hasRole = (userRole, allowed) => {
    if (!userRole) return false;
    if (userRole === 'system_admin') return true;
    return allowed.includes(userRole);
};

// ─────────────────────────────────────────────────────────────────────────────
// Nav Item structure
// ─────────────────────────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, to, tab, activeTab, onTabChange, badge, indent = false, state = null }) => {
    const location = useLocation();
    const isActive = (tab && activeTab !== undefined)
        ? activeTab === tab
        : to ? (location.pathname === to || location.pathname.startsWith(to + '/')) : false;

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

    const handleClick = (e) => {
        if (to && tab && onTabChange && location.pathname === (to.split('?')[0])) {
            e.preventDefault();
            onTabChange(tab);
        }
    };

    if (to) {
        return (
            <Link 
                to={to} 
                state={state || (tab ? { tab } : undefined)}
                onClick={handleClick}
                className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
            >
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
    const location = useLocation();

    // Check if any child NavItem matches the current location
    const hasActiveChild = React.Children.toArray(children).some(child => {
        if (!React.isValidElement(child)) return false;
        const to = child.props.to;
        return to && (location.pathname === to || location.pathname.startsWith(to + '/'));
    });

    const storageKey = `pulso_sidebar_${title.replace(/\s+/g, '_')}`;
    const [open, setOpen] = useState(() => {
        if (hasActiveChild) return true;
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) return saved === 'true';
        return defaultOpen;
    });

    // Make sure it automatically opens if a child link becomes active
    React.useEffect(() => {
        if (hasActiveChild) {
            setOpen(true);
            localStorage.setItem(storageKey, 'true');
        }
    }, [hasActiveChild, storageKey]);

    const handleToggle = () => {
        setOpen(o => {
            const newState = !o;
            localStorage.setItem(storageKey, String(newState));
            return newState;
        });
    };

    return (
        <div className="mb-1">
            <button
                onClick={handleToggle}
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

    // Add scroll retention to automatically restore sidebar scroll position across page navigation
    const sidebarRef = React.useRef(null);
    React.useEffect(() => {
        const scrollKey = 'pulso_sidebar_scroll_position';
        const scrollPos = sessionStorage.getItem(scrollKey);
        if (scrollPos && sidebarRef.current) {
            sidebarRef.current.scrollTop = parseInt(scrollPos, 10);
        }
        
        const handleScroll = (e) => {
            sessionStorage.setItem(scrollKey, e.target.scrollTop);
        };
        
        const el = sidebarRef.current;
        if (el) {
            el.addEventListener('scroll', handleScroll, { passive: true });
            return () => el.removeEventListener('scroll', handleScroll);
        }
    }, []);

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
        city_engineer: 'City Engineer / BO',
        asst_city_engineer: 'Asst. City Engineer',
        admin_officer: 'Administrative Officer V',
        admin_clerk: 'Administrative Clerk',
        records_officer: 'Records Officer',
        division_chief: 'Division Chief',
        division_chief_arch: 'Div Chief - Architectural',
        division_chief_structural: 'Div Chief - Structural',
        division_chief_electrical: 'Div Chief - Electrical',
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
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 custom-scrollbar" ref={sidebarRef}>

                {/* ── MAIN HUB ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-1">Main Hub</div>
                <NavItem icon={Home} label="My Dashboard" to="/gov/my-dashboard" />
                {checkPermission(currentUser, 'ops', 'manage') && (
                    <NavItem icon={LayoutDashboard} label="Executive Performance" tab="overview" activeTab={activeTab} onTabChange={onTabChange} to="/management" />
                )}
                {checkPermission(currentUser, 'ops', 'manage') && (
                    <NavItem icon={AlertTriangle} label="Command Center" to="/dispatcher" />
                )}
                {checkPermission(currentUser, 'admin', 'audit') && (
                    <NavItem icon={Brain} label="Analytics Command Center" to="/gov/analytics" />
                )}
                {checkPermission(currentUser, 'reports', 'view') && (
                    <NavItem icon={TrendingUp} label="Predictive Maintenance" to="/gov/predictive" />
                )}

                {/* ── OPERATIONS & TRIAGE ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-4">Operations & Triage</div>
                {checkPermission(currentUser, 'reports', 'view') && (
                    <NavItem icon={Activity} label="Process Timeline" to="/gov/timeline" />
                )}
                {checkPermission(currentUser, 'ops', 'manage') && (
                    <NavItem icon={Megaphone} label="Post Advisory" tab="advisories" activeTab={activeTab} onTabChange={onTabChange} to="/management" />
                )}

                {/* ── LGU DEPARTMENTS ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-4">LGU Departments</div>

                {/* Administrative Division */}
                {checkPermission(currentUser, 'records', 'view') && (
                    <NavSection title="Administrative" icon={Briefcase} defaultOpen={['admin_officer','admin_clerk','records_officer'].includes(role)}>
                        <NavItem icon={BookOpen} label="Records & Registry" to="/gov/records" indent />
                        <NavItem icon={FileText} label="Document Archive" to="/gov/document-registry" indent />
                        <NavItem icon={FileBarChart2} label="Reports Archive" to="/gov/reports-archive" indent />
                        <NavItem icon={FileCheck2} label="Audit Logs" to="/gov/audit-logs" indent />
                    </NavSection>
                )}

                {/* Design Division */}
                {hasRole(role, ROLE_DESIGN) && (
                    <NavSection title="Design & Planning" icon={Ruler} defaultOpen={['design_engineer','cad_operator'].includes(role)}>
                        <NavItem icon={Map} label="LGU Projects" to="/gov/projects" indent />
                        <NavItem icon={Building2} label="Design Requests" to="/gov/design-requests" indent />
                        <NavItem icon={FlaskConical} label="Structure Analysis" to="/gov/analysis" indent />
                    </NavSection>
                )}

                {/* Survey Division */}
                {hasRole(role, ROLE_SURVEY) && (
                    <NavSection title="Survey & Estimation" icon={Eye} defaultOpen={role === 'estimator'}>
                        <NavItem icon={Map} label="Field Surveys" to="/gov/surveys" indent />
                        <NavItem icon={ClipboardList} label="Bill of Quantities" to="/gov/boq" indent />
                        <NavItem icon={PackageCheck} label="Cost Estimation" to="/gov/estimation" indent />
                    </NavSection>
                )}

                {/* OBO Division */}
                {hasRole(role, ROLE_OBO) && (
                    <NavSection title="Building Official (OBO)" icon={ShieldCheck} defaultOpen={['building_inspector','electrical_inspector','mechanical_inspector'].includes(role)} color="teal">
                        <NavItem icon={Building2} label="OBO Inspections" to="/gov/obo" indent />
                        <NavItem icon={Briefcase} label="Permit Tracking" tab="permits" activeTab={activeTab} onTabChange={onTabChange} to="/management" indent />
                    </NavSection>
                )}

                {/* Procurement / BAC */}
                {hasRole(role, ROLE_PROCUREMENT) && (
                    <NavSection title="Procurement / BAC" icon={PackageCheck} defaultOpen={['estimator'].includes(role)} color="violet">
                        <NavItem icon={Landmark} label="RA 9184 Bidding" tab="procurement" activeTab={activeTab} onTabChange={onTabChange} to="/management" indent />
                        <NavItem icon={ClipboardList} label="Procurement Requests" to="/gov/procurement" indent />
                    </NavSection>
                )}

                {/* ── PLATFORM SETTINGS ── */}
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-3 pt-4">Platform Settings</div>
                {role === 'system_admin' && (
                    <>
                        <NavItem icon={UserCog} label="Gov Accounts" to="/gov/users" />
                        <NavItem icon={Shield} label="Resident Accounts" to="/gov/residents" />
                    </>
                )}
                <NavItem icon={Settings} label="Settings" to="/gov/settings" />
                {role === 'system_admin' && (
                    <NavItem icon={HardHat} label="Agent App Download" to="/gov/agent-app" />
                )}
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-bold text-sm transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 mt-2"
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
