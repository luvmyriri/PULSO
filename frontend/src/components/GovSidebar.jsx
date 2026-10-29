/**
 * GovSidebar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified left navigation sidebar for the PULSO Government Workspace.
 * Reorganized into four operational groups:
 *   1. Workspace (Dashboard, My Work)
 *   2. Operations (Reports, Work Orders, Infrastructure, Records)
 *   3. Insight (Report Analysis, Predictive Maintenance)
 *   4. Public Communication (Updates)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    ClipboardList, Wrench, Building2, BarChart2,
    Megaphone, Inbox, FileArchive, Menu, X, ShieldCheck,
    LayoutDashboard, Settings, Smartphone
} from 'lucide-react';
import { readGovernmentUser } from './governmentWorkspaceConfig';
import { useGovernmentData } from '../utils/governmentApi';
import './gov-sidebar-responsive.css';

export default function GovSidebar({ activeTab, onTabChange, currentUser, responsive = true }) {
    const location = useLocation();
    const resolvedUser = currentUser || readGovernmentUser();
    const navigation = useGovernmentData('/api/gov/navigation');
    const [mobileOpen, setMobileOpen] = useState(false);
    const mobileDialog = useRef(null);
    const mobileTrigger = useRef(null);
    useEffect(() => {
        const el = mobileDialog.current;
        if (!el) return;
        if (mobileOpen && !el.open) el.showModal();
        if (!mobileOpen && el.open) el.close();
    }, [mobileOpen]);

    // Persist collapsed state
    const [storedCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('pulso_gov_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });
    const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width:1023px)').matches);
    useEffect(() => {
        const media = window.matchMedia('(max-width:1023px)');
        const update = () => setNarrow(media.matches);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    const isCollapsed = storedCollapsed && !narrow;

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('pulso_gov_sidebar_collapsed', String(next));
            } catch { /* ignore */ }
            return next;
        });
    };

    const NAV_GROUPS = [
        {
            name: 'Workspace',
            items: [
                {
                    id: 'overview',
                    label: 'Dashboard',
                    icon: LayoutDashboard,
                    to: '/gov/overview',
                    matches: ['/gov/overview'],
                },
                {
                    id: 'my-work',
                    legacyIds: ['dashboard', 'today', 'my-work'],
                    label: 'My Work',
                    icon: Inbox,
                    to: '/gov/dashboard',
                    matches: ['/gov/dashboard', '/gov/my-dashboard', '/gov/my-work', '/gov/today'],
                },
            ],
        },
        {
            name: 'Operations',
            items: [
                {
                    id: 'reports',
                    legacyIds: ['reports', 'map'],
                    label: 'Reports',
                    icon: ClipboardList,
                    to: '/gov/reports',
                    matches: ['/gov/reports', '/gov/citizen-reports', '/gov/map', '/dispatcher'],
                },
                {
                    id: 'work-orders',
                    legacyIds: ['work-orders', 'projects', 'obo'],
                    label: 'Work Orders',
                    icon: Wrench,
                    to: '/gov/work-orders',
                    matches: ['/gov/work-orders', '/gov/projects', '/gov/delivery', '/gov/obo'],
                },
                {
                    id: 'field',
                    legacyIds: ['field-pwa', 'dispatch-field'],
                    label: 'Field PWA',
                    icon: Smartphone,
                    to: '/field',
                    matches: ['/field', '/gov/field'],
                },
                {
                    id: 'assets',
                    legacyIds: ['assets'],
                    label: 'Infrastructure',
                    icon: Building2,
                    to: '/gov/assets',
                    matches: ['/gov/assets'],
                },
                {
                    id: 'records',
                    legacyIds: ['records'],
                    label: 'Records',
                    icon: FileArchive,
                    to: '/gov/records-workspace?view=registry&tab=registry',
                    matches: ['/gov/records-workspace', '/gov/records', '/gov/document-registry', '/gov/timeline', '/gov/audit-logs', '/gov/financial-history'],
                },
            ],
        },
        {
            name: 'Insight',
            items: [
                {
                    id: 'analytics',
                    legacyIds: ['analytics', 'insights'],
                    label: 'Report Analysis',
                    icon: BarChart2,
                    to: '/gov/insights?view=analytics&tab=analytics',
                    matches: ['/gov/insights', '/gov/analytics', '/management', '/gov/bi'],
                    excludeView: 'predictive',
                },
                {
                    id: 'predictive',
                    label: 'Predictive Maintenance',
                    icon: ShieldCheck,
                    to: '/gov/insights?view=predictive',
                    matches: ['/gov/predictive'],
                    requiredView: 'predictive',
                },
            ],
        },
        {
            name: 'Public Communication',
            items: [
                {
                    id: 'announcements',
                    legacyIds: ['announcements', 'updates'],
                    label: 'Updates',
                    icon: Megaphone,
                    to: '/gov/announcements',
                    matches: ['/gov/notification-deliveries', '/gov/announcements', '/gov/advisories'],
                },
            ],
        },
        {
            name: 'Administration',
            items: [
                {
                    id: 'settings',
                    legacyIds: ['administration', 'staff', 'users', 'residents'],
                    label: 'Administration',
                    icon: Settings,
                    to: '/gov/administration?view=staff',
                    matches: ['/gov/administration', '/gov/settings', '/gov/users', '/gov/residents'],
                },
            ],
        },
    ];

    const sidebar = (
        <aside
            aria-label="Government workspace navigation"
            data-collapsed={isCollapsed}
            className={`gov-sidebar flex flex-col justify-between shrink-0 bg-white dark:bg-[#081120] text-slate-800 dark:text-white z-40 relative h-screen ${
                isCollapsed ? 'w-20' : 'w-60'
            } border-r border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-xl select-none`}
        >
            {/* Top Brand Header */}
            <div className="flex flex-col min-h-0 flex-1">
                <div className={`gov-sidebar-brand ${isCollapsed ? 'is-collapsed' : ''}`}>
                    <button type="button" className="gov-sidebar-collapse" onClick={toggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed}><Menu size={18} strokeWidth={1.75}/></button>
                    <Link
                        to={navigation.data?.modules?.includes('overview') ? '/gov/overview' : '/gov/my-dashboard'}
                        className="flex items-center gap-2.5 group overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] dark:focus-visible:ring-[#4ade80] rounded-lg"
                        title="City Government of Caloocan - City Engineering Department - PULSO"
                    >
                        <img
                            src="/city-engineering-logo.png"
                            alt="City Engineering Department Logo"
                            className="h-9 w-9 aspect-square object-contain drop-shadow-sm rounded-full bg-white border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform duration-200"
                        />
                        {!isCollapsed && (
                            <div className="flex flex-col text-left shrink-0 leading-tight">
                                <span className="font-heading font-black text-[10px] tracking-tight text-slate-900 dark:text-slate-200 uppercase leading-none">
                                    CALOOCAN CITY
                                </span>
                                <span className="font-heading font-black text-xs text-slate-800 dark:text-white tracking-tight leading-tight mt-0.5">
                                    City Engineering Dept
                                </span>
                                <div className="flex items-center gap-1 text-[9px] font-mono-data text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                                    <span>powered by:</span>
                                    <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
                                </div>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Nav Groups List */}
                <nav className="gov-sidebar-nav overflow-y-auto overflow-x-hidden flex-1">
                    {NAV_GROUPS.map((group, groupIdx) => {
                        const visibleItems = group.items.filter(item => {
                            if (navigation.data?.modules) {
                                return navigation.data.modules.includes(item.id);
                            }
                            return false;
                        });

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.name} className="gov-sidebar-group">
                                {!isCollapsed ? (
                                    <div className="gov-sidebar-group__label">
                                        {group.name}
                                    </div>
                                ) : (
                                    groupIdx > 0 && <div className="mx-2 my-2 border-t border-slate-100 dark:border-slate-800" aria-hidden="true" />
                                )}
                                <div className="gov-sidebar-group__items">
                                    {visibleItems.map((item) => {
                                        const Icon = item.icon;
                                        const view = new URLSearchParams(location.search).get('view');
                                        const isPathMatch = (item.requiredView && location.pathname === '/gov/insights' && view === item.requiredView) || (view !== item.excludeView && item.matches.some(
                                            path => location.pathname === path || location.pathname.startsWith(path + '/')
                                        ));
                                        const isTabMatch = activeTab && (item.id === activeTab || item.legacyIds?.includes(activeTab));
                                        const isCurrentActive = Boolean(isPathMatch || isTabMatch);

                                        return (
                                            <Link
                                                key={item.id}
                                                to={item.to}
                                                title={item.label}
                                                aria-current={isCurrentActive ? 'page' : undefined}
                                                onClick={() => {
                                                    setMobileOpen(false);
                                                    if (typeof onTabChange === 'function') {
                                                        onTabChange(item.id);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-heading text-xs font-semibold transition-all duration-150 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534] dark:focus-visible:ring-[#4ade80] ${
                                                    !isCollapsed ? 'justify-start' : 'justify-center'
                                                } ${
                                                    isCurrentActive
                                                        ? 'gov-sidebar-selected font-bold'
                                                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                                                }`}
                                            >
                                                <Icon
                                                    size={18}
                                                    className={`shrink-0 transition-colors ${
                                                        isCurrentActive
                                                            ? 'text-current'
                                                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                                                    }`}
                                                />
                                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>
                {navigation.error && <p className="px-5 py-2 text-xs" role="alert">Navigation unavailable. <button className="underline" onClick={navigation.reload}>Try again</button></p>}
            </div>

        </aside>
    );
    if (!responsive) return sidebar;
    return <>
        <button ref={mobileTrigger} type="button" className="gov-sidebar-mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Open government navigation"><Menu size={20} /></button>
        <div className="gov-sidebar-desktop">{sidebar}</div>
        <dialog ref={mobileDialog} className="gov-sidebar-mobile-dialog" aria-label="Government navigation" onClose={() => { setMobileOpen(false); mobileTrigger.current?.focus(); }} onClick={e => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
            <button className="gov-sidebar-mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /> Close navigation</button>{sidebar}
        </dialog>
    </>;
}
