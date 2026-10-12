/**
 * GovSidebar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified, sleek left navigation sidebar for the PULSO Government Command Suite.
 * Mirrors reference structure (media_1788468722929.png):
 *   - PULSO COMMAND brand header with official emblem
 *   - 7 primary menu actions (Reports, Work orders, Assets, Map, Analytics, Directory, Settings)
 *   - Signature PULSO orange active-state indicator
 *   - Interactive `< Collapse` toggle with icon-only rail support
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, ClipboardList, Wrench, Building2, MapPin, BarChart2,
    Users, Settings, ChevronLeft, Megaphone, Activity
} from 'lucide-react';

export default function GovSidebar({ activeTab, onTabChange, currentUser }) {
    const location = useLocation();

    // Persist collapsed state
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('pulso_gov_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('pulso_gov_sidebar_collapsed', String(next));
            } catch { /* ignore */ }
            return next;
        });
    };

    // Authoritative Menu Items
    const NAV_ITEMS = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            to: '/gov/dashboard',
            matches: ['/gov/dashboard', '/gov/my-dashboard', '/gov/bi']
        },
        {
            id: 'today',
            label: 'Today',
            icon: Activity,
            to: '/gov/today',
            matches: ['/gov/today']
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: ClipboardList,
            to: '/gov/reports',
            matches: ['/gov/reports', '/gov/citizen-reports']
        },
        {
            id: 'work-orders',
            label: 'Work orders',
            icon: Wrench,
            to: '/gov/work-orders',
            matches: ['/gov/work-orders']
        },
        {
            id: 'assets',
            label: 'Assets',
            icon: Building2,
            to: '/gov/assets',
            matches: ['/gov/assets']
        },
        {
            id: 'announcements',
            label: 'Announcements',
            icon: Megaphone,
            to: '/gov/announcements',
            matches: ['/gov/announcements']
        },
        {
            id: 'map',
            label: 'Map',
            icon: MapPin,
            to: '/gov/map',
            matches: ['/gov/map', '/dispatcher']
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: BarChart2,
            to: '/gov/analytics',
            matches: ['/gov/analytics', '/management', '/gov/bi']
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            to: '/gov/administration?view=settings&tab=settings',
            matches: ['/gov/settings', '/gov/administration', '/gov/audit-logs', '/gov/users', '/gov/residents']
        }
    ];

    return (
        <aside
            className={`flex flex-col justify-between shrink-0 bg-white dark:bg-[#081120] text-slate-800 dark:text-white transition-all duration-300 z-40 relative h-screen ${
                isCollapsed ? 'w-20' : 'w-60'
            } border-r border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-xl select-none`}
        >
            {/* Top Brand Header */}
            <div>
                <div className={`h-20 flex items-center px-4 border-b border-slate-200 dark:border-slate-800/80 ${isCollapsed ? 'justify-center' : ''}`}>
                    <Link
                        to="/gov/dashboard"
                        className="flex items-center gap-2.5 group overflow-hidden cursor-pointer"
                        title="City Government of Caloocan - City Engineering Department - PULSO"
                    >
                        {/* Official City Engineering Department Logo */}
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

                {/* Nav Items List */}
                <nav className="p-3 space-y-1.5 mt-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isCurrentActive =
                            item.matches.some(path => location.pathname === path || location.pathname.startsWith(path + '/')) ||
                            activeTab === item.id;

                        return (
                            <Link
                                key={item.id}
                                to={item.to}
                                title={item.label}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-heading text-xs font-bold transition-all duration-150 cursor-pointer group ${
                                    !isCollapsed ? 'justify-start' : 'justify-center'
                                } ${
                                    isCurrentActive
                                        ? 'bg-[#ff6b00] text-white shadow-md shadow-orange-500/25 hover:bg-[#ea5f00] hover:shadow-lg hover:shadow-orange-500/30'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                                }`}
                            >
                                <Icon
                                    size={18}
                                    className={`shrink-0 transition-colors ${
                                        isCurrentActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'
                                    }`}
                                />
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Rail: Collapse Toggle */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
                <button
                    type="button"
                    onClick={toggleCollapse}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all cursor-pointer ${
                        !isCollapsed ? 'justify-start' : 'justify-center'
                    }`}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft
                        size={18}
                        className={`shrink-0 transition-transform duration-300 ${
                            isCollapsed ? 'rotate-180' : ''
                        }`}
                    />
                    {!isCollapsed && <span>Collapse</span>}
                </button>
            </div>
        </aside>
    );
}
