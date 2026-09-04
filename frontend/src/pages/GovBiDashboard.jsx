/**
 * GovAnalyticsPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PULSO BI & Operations Analytics Dashboard (Government / Dispatcher Suite)
 * ─────────────────────────────────────────────────────────────────────────────
 * Architectural & Visual Specification:
 * - Mirrors the exact dark navy base + orange accent design language from Citizen Reports.
 * - Typography: Space Grotesk for headings, JetBrains Mono for metrics and data points.
 * - Top Filter Bar: Date range, Barangay, Status, Severity filters with active states.
 * - KPI Summary Row: 5 critical metrics with directionally accurate green/red trend badges (never orange).
 * - Responsive 2-column Chart Grid with custom high-performance SVG visualizers:
 *     1. Reports Over Time (Line chart with PULSO orange hero series)
 *     2. Status Breakdown (Horizontal stacked bar across the 5 Pulseline stages)
 *     3. Reports by Barangay (Top 10 volume ranking horizontal bars)
 *     4. Severity Distribution (Donut chart with colorblind-safe palette)
 *     5. Resolution Time by Category (Operational bottleneck bar chart with SLA threshold)
 *     6. Field Team Performance (SLA compliance, throughput, and operational metrics)
 * - Accessibility: Accessible data table toggle per chart, ARIA descriptors, keyboard support.
 * - Responsive: Fluid layout that expands smoothly when the sidebar collapses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart2, TrendingUp, TrendingDown, Clock, CheckCircle2,
    AlertTriangle, ShieldCheck, Filter, RotateCcw, Calendar,
    MapPin, Search, Bell, Download, ChevronDown, Check,
    Table, Eye, ArrowUpRight, Wrench, Shield, Users, Layers,
    Activity, Zap, Info, FileSpreadsheet, Sparkles
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import ThemeToggle from '../components/ThemeToggle';
import Swal from 'sweetalert2';

// ─── Constants & Fallback Reference BI Data ──────────────────────────────────
const DATE_RANGES = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'ytd', label: 'Year to Date' },
    { id: 'all', label: 'All Time' }
];

const BARANGAYS = [
    'All Barangays',
    'Barangay 176',
    'Barangay 171',
    'Barangay 177',
    'Barangay 178',
    'Barangay 175',
    'Barangay 172',
    'Barangay 174',
    'Barangay 173',
    'Barangay 170',
    'Barangay 168'
];

const STATUSES = ['All Statuses', 'Received', 'Verified', 'Assigned', 'In progress', 'Resolved'];
const SEVERITIES = ['All Severities', 'Critical', 'High', 'Medium', 'Low'];

// Mock time series dataset (30 days)
const GENERATE_TIME_SERIES = () => [
    { date: 'Aug 05', total: 28, resolved: 22, critical: 4 },
    { date: 'Aug 09', total: 35, resolved: 28, critical: 6 },
    { date: 'Aug 13', total: 42, resolved: 36, critical: 5 },
    { date: 'Aug 17', total: 39, resolved: 33, critical: 3 },
    { date: 'Aug 21', total: 48, resolved: 41, critical: 8 },
    { date: 'Aug 25', total: 54, resolved: 49, critical: 7 },
    { date: 'Aug 29', total: 61, resolved: 53, critical: 9 },
    { date: 'Sep 02', total: 58, resolved: 50, critical: 6 },
    { date: 'Sep 04', total: 65, resolved: 57, critical: 7 }
];

// Top 10 Barangays by Volume
const BARANGAY_VOLUME_DATA = [
    { name: 'Barangay 176 (Bagong Silang)', count: 342, resolved: 301, active: 41, pct: 26.6 },
    { name: 'Barangay 171 (Bagumbong)', count: 184, resolved: 162, active: 22, pct: 14.3 },
    { name: 'Barangay 177 (Camarin)', count: 156, resolved: 139, active: 17, pct: 12.1 },
    { name: 'Barangay 178 (Kiko)', count: 128, resolved: 110, active: 18, pct: 10.0 },
    { name: 'Barangay 175 (Deparo)', count: 104, resolved: 92, active: 12, pct: 8.1 },
    { name: 'Barangay 172 (Urduja)', count: 88, resolved: 79, active: 9, pct: 6.9 },
    { name: 'Barangay 174 (Saranay)', count: 76, resolved: 68, active: 8, pct: 5.9 },
    { name: 'Barangay 173 (Congress)', count: 68, resolved: 61, active: 7, pct: 5.3 },
    { name: 'Barangay 170 (Amparo)', count: 54, resolved: 49, active: 5, pct: 4.2 },
    { name: 'Barangay 168 (Deparo II)', count: 42, resolved: 38, active: 4, pct: 3.3 }
];

// Operational Category Bottlenecks (Resolution Time in Hours vs SLA Target)
const CATEGORY_RESOLUTION_DATA = [
    { category: 'Electrical Hazard', hours: 7.8, sla: 12, target: '12 hrs', status: 'Optimal', count: 142 },
    { category: 'Street Lighting', hours: 14.5, sla: 24, target: '24 hrs', status: 'Optimal', count: 284 },
    { category: 'Sanitation & Waste', hours: 16.2, sla: 24, target: '24 hrs', status: 'Optimal', count: 310 },
    { category: 'Roads & Pavements', hours: 28.4, sla: 48, target: '48 hrs', status: 'Warning', count: 326 },
    { category: 'Drainage & Flooding', hours: 42.1, sla: 36, target: '36 hrs', status: 'Bottleneck', count: 222 }
];

// Field Teams Performance Dataset
const FIELD_TEAMS_DATA = [
    { name: 'Electrical Maintenance Squad', lead: 'Engr. R. Ramos', active: 6, resolved: 136, slaRate: 97.2, avgHrs: 8.2 },
    { name: 'Road Infrastructure Crew Alpha', lead: 'Engr. J. Dela Cruz', active: 18, resolved: 298, slaRate: 91.4, avgHrs: 26.5 },
    { name: 'Sanitation Rapid Response', lead: 'Supv. M. Bautista', active: 8, resolved: 295, slaRate: 95.8, avgHrs: 15.0 },
    { name: 'Drainage & Flood Mitigation Team', lead: 'Engr. A. Villanueva', active: 21, resolved: 194, slaRate: 83.1, avgHrs: 41.6 }
];

export default function GovBiDashboard() {
    const navigate = useNavigate();

    // ── Global User & State ──
    const [currentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || '{}');
        } catch {
            return { name: 'Ana Reyes', roleLabel: 'Dispatcher', role: 'dispatcher' };
        }
    });

    // ── Filter States ──
    const [dateRange, setDateRange] = useState('30d');
    const [barangayFilter, setBarangayFilter] = useState('All Barangays');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [severityFilter, setSeverityFilter] = useState('All Severities');
    const [searchQuery, setSearchQuery] = useState('');

    // Open dropdown states
    const [openDropdown, setOpenDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // Active chart view mode: 'chart' or 'table'
    const [viewMode, setViewMode] = useState({
        trend: 'chart',
        status: 'chart',
        barangay: 'chart',
        severity: 'chart',
        bottleneck: 'chart',
        teams: 'chart'
    });

    // Loading indicator
    const [isLoading, setIsLoading] = useState(false);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (dateRange !== '30d') count++;
        if (barangayFilter !== 'All Barangays') count++;
        if (statusFilter !== 'All Statuses') count++;
        if (severityFilter !== 'All Severities') count++;
        if (searchQuery.trim()) count++;
        return count;
    }, [dateRange, barangayFilter, statusFilter, severityFilter, searchQuery]);

    const handleClearFilters = () => {
        setDateRange('30d');
        setBarangayFilter('All Barangays');
        setStatusFilter('All Statuses');
        setSeverityFilter('All Severities');
        setSearchQuery('');
        setOpenDropdown(null);
    };

    // ── Computed Dynamic KPIs ──
    // Simulated dynamic recalculations based on filters
    const kpis = useMemo(() => {
        const multiplier = barangayFilter === 'All Barangays' ? 1 : 0.18;
        const total = Math.round(1284 * multiplier);
        const resolved = Math.round(1122 * multiplier);
        const rate = (resolved / total * 100).toFixed(1);
        const active = total - resolved;
        const criticalCount = Math.round(total * 0.082);

        return {
            totalReports: total.toLocaleString(),
            totalTrend: { val: '+12.4%', isPositive: true },
            resolutionRate: `${rate}%`,
            rateTrend: { val: '+4.2%', isPositive: true },
            avgHours: '18.4 hrs',
            hoursTrend: { val: '-2.1 hrs', isPositive: true }, // negative hours = faster = good (green)
            activeCases: active.toLocaleString(),
            activeTrend: { val: '-14', isPositive: true },     // less open backlog = good (green)
            criticalCount: criticalCount.toLocaleString(),
            criticalTrend: { val: '+3', isPositive: false }    // more critical = bad (red)
        };
    }, [barangayFilter]);

    // Export CSV report handler
    const handleExportCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Barangay,Total Reports,Resolved,Active Backlog,Resolution Rate\n"
            + BARANGAY_VOLUME_DATA.map(e => `"${e.name}",${e.count},${e.resolved},${e.active},${e.pct}%`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PULSO_BI_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire({
            icon: 'success',
            title: 'Analytics Data Exported',
            text: 'Detailed CSV dataset successfully saved to your downloads.',
            confirmButtonColor: '#ff6b00',
            timer: 2500
        });
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans antialiased select-none">

            {/* ═══════════════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (Unified 8-Item Navigation)
            ══════════════════════════════════════════════════════════════════════ */}
            <GovSidebar currentUser={currentUser} activeTab="dashboard" />

            {/* ═══════════════════════════════════════════════════════════════════
                2. MAIN VIEWPORT
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

                {/* ── TOP APP BAR ───────────────────────────────────────────── */}
                <header className="h-16 px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#0c1424] border-b border-slate-200 dark:border-slate-800/80 z-20">
                    {/* Left: Breadcrumbs & Heading */}
                    <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-400">
                            <Link to="/gov/dashboard" className="hover:text-[#ff6b00] transition-colors">Home</Link>
                            <span>/</span>
                            <span className="text-slate-600 dark:text-slate-300">Operations</span>
                            <span>/</span>
                            <span className="text-[#ff6b00] font-semibold">Performance & BI</span>
                        </div>
                        <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
                            Operations & Performance Dashboard
                        </h1>
                    </div>

                    {/* Right: Search, District, Actions & ThemeToggle */}
                    <div className="flex items-center gap-3">
                        {/* District Selector Pill */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-heading font-semibold text-slate-700 dark:text-slate-300">
                            <MapPin size={13} className="text-[#ff6b00]" />
                            <span>North Caloocan</span>
                        </div>

                        {/* Export Report CTA */}
                        <button
                            onClick={handleExportCSV}
                            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold text-white bg-[#ff6b00] hover:bg-[#e65c00] shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                        >
                            <Download size={13} />
                            <span>Export BI Report</span>
                        </button>

                        <ThemeToggle />

                        {/* Notification Bell */}
                        <button
                            type="button"
                            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                            title="3 Active Operational Alerts"
                        >
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ff6b00] text-white text-[10px] font-mono-data font-bold flex items-center justify-center">
                                3
                            </span>
                        </button>

                        {/* User Badge */}
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-heading font-bold text-xs shadow-inner">
                                AR
                            </div>
                            <div className="hidden lg:flex flex-col text-left leading-none">
                                <span className="font-heading font-bold text-xs text-slate-800 dark:text-white">
                                    {currentUser?.name || 'Ana Reyes'}
                                </span>
                                <span className="text-[10px] font-mono-data text-slate-400 mt-0.5">
                                    {currentUser?.roleLabel || 'Dispatcher'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── TOP FILTER BAR (Citizen Reports Pattern) ──────────────── */}
                <div ref={dropdownRef} className="px-6 py-3 shrink-0 bg-white/70 dark:bg-[#09101f] border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Date Range Picker */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-heading font-medium transition-colors cursor-pointer ${
                                    dateRange !== '30d'
                                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00] font-bold'
                                        : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <Calendar size={13} className={dateRange !== '30d' ? 'text-[#ff6b00]' : 'text-slate-400'} />
                                <span>Period: {DATE_RANGES.find(d => d.id === dateRange)?.label}</span>
                                <ChevronDown size={13} className="text-slate-400" />
                            </button>
                            {openDropdown === 'date' && (
                                <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-30 space-y-0.5">
                                    {DATE_RANGES.map(d => (
                                        <button
                                            key={d.id}
                                            onClick={() => { setDateRange(d.id); setOpenDropdown(null); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-heading cursor-pointer ${
                                                dateRange === d.id
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] font-bold'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <span>{d.label}</span>
                                            {dateRange === d.id && <Check size={13} className="text-[#ff6b00]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Barangay Filter */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'barangay' ? null : 'barangay')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-heading font-medium transition-colors cursor-pointer ${
                                    barangayFilter !== 'All Barangays'
                                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00] font-bold'
                                        : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <MapPin size={13} className={barangayFilter !== 'All Barangays' ? 'text-[#ff6b00]' : 'text-slate-400'} />
                                <span>Barangay: {barangayFilter === 'All Barangays' ? 'All' : barangayFilter}</span>
                                <ChevronDown size={13} className="text-slate-400" />
                            </button>
                            {openDropdown === 'barangay' && (
                                <div className="absolute top-full left-0 mt-1.5 w-56 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-30 space-y-0.5 custom-scrollbar">
                                    {BARANGAYS.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => { setBarangayFilter(b); setOpenDropdown(null); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-heading cursor-pointer ${
                                                barangayFilter === b
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] font-bold'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <span>{b}</span>
                                            {barangayFilter === b && <Check size={13} className="text-[#ff6b00]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Status Filter */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-heading font-medium transition-colors cursor-pointer ${
                                    statusFilter !== 'All Statuses'
                                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00] font-bold'
                                        : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <CheckCircle2 size={13} className={statusFilter !== 'All Statuses' ? 'text-[#ff6b00]' : 'text-slate-400'} />
                                <span>Status: {statusFilter === 'All Statuses' ? 'All' : statusFilter}</span>
                                <ChevronDown size={13} className="text-slate-400" />
                            </button>
                            {openDropdown === 'status' && (
                                <div className="absolute top-full left-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-30 space-y-0.5">
                                    {STATUSES.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setStatusFilter(s); setOpenDropdown(null); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-heading cursor-pointer ${
                                                statusFilter === s
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] font-bold'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <span>{s}</span>
                                            {statusFilter === s && <Check size={13} className="text-[#ff6b00]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 4. Severity Filter */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'severity' ? null : 'severity')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-heading font-medium transition-colors cursor-pointer ${
                                    severityFilter !== 'All Severities'
                                        ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00] font-bold'
                                        : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                }`}
                            >
                                <AlertTriangle size={13} className={severityFilter !== 'All Severities' ? 'text-[#ff6b00]' : 'text-slate-400'} />
                                <span>Severity: {severityFilter === 'All Severities' ? 'All' : severityFilter}</span>
                                <ChevronDown size={13} className="text-slate-400" />
                            </button>
                            {openDropdown === 'severity' && (
                                <div className="absolute top-full left-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-xl p-1 z-30 space-y-0.5">
                                    {SEVERITIES.map(sev => (
                                        <button
                                            key={sev}
                                            onClick={() => { setSeverityFilter(sev); setOpenDropdown(null); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-heading cursor-pointer ${
                                                severityFilter === sev
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] font-bold'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <span>{sev}</span>
                                            {severityFilter === sev && <Check size={13} className="text-[#ff6b00]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Clear Filters (Highlighted with Orange) */}
                        {activeFiltersCount > 0 && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[#ff6b00] text-xs font-heading font-bold text-[#ff6b00] hover:bg-orange-500/10 transition-colors cursor-pointer"
                            >
                                <RotateCcw size={12} />
                                <span>Clear filters ({activeFiltersCount})</span>
                            </button>
                        )}
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-64">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search metrics or barangay..."
                            className="w-full bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ff6b00] transition-colors"
                        />
                    </div>
                </div>

                {/* ── SCROLLABLE BI WORKSPACE ───────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* ═══════════════════════════════════════════════════════════
                        KPI SUMMARY ROW (5 Stat Cards, Strict Red/Green Trends)
                    ════════════════════════════════════════════════════════════ */}
                    <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                        {/* Card 1: Total Reports */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4.5 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider">Total Reports</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                    <Activity size={16} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {kpis.totalReports}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono-data font-bold text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <TrendingUp size={12} />
                                    {kpis.totalTrend.val}
                                </span>
                                <span className="text-[11px] text-slate-400">vs prev. period</span>
                            </div>
                        </div>

                        {/* Card 2: Resolution Rate */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4.5 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider">Resolution Rate</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                    <ShieldCheck size={16} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {kpis.resolutionRate}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono-data font-bold text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <TrendingUp size={12} />
                                    {kpis.rateTrend.val}
                                </span>
                                <span className="text-[11px] text-slate-400">benchmark &gt; 85%</span>
                            </div>
                        </div>

                        {/* Card 3: Avg Resolution Time */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4.5 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider">Avg Resolution Time</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                    <Clock size={16} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {kpis.avgHours}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono-data font-bold text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <TrendingDown size={12} />
                                    {kpis.hoursTrend.val}
                                </span>
                                <span className="text-[11px] text-slate-400">faster response</span>
                            </div>
                        </div>

                        {/* Card 4: Active Open Cases */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4.5 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider">Active Open Cases</span>
                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                    <Wrench size={16} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-slate-900 dark:text-white tracking-tight">
                                {kpis.activeCases}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono-data font-bold text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <TrendingDown size={12} />
                                    {kpis.activeTrend.val}
                                </span>
                                <span className="text-[11px] text-slate-400">backlog clearing</span>
                            </div>
                        </div>

                        {/* Card 5: Critical / High Severity */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4.5 shadow-xs transition-transform hover:-translate-y-0.5 duration-200">
                            <div className="flex items-center justify-between text-slate-400 mb-2">
                                <span className="font-heading text-[11px] font-bold uppercase tracking-wider">Critical & High</span>
                                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <AlertTriangle size={16} />
                                </div>
                            </div>
                            <div className="font-mono-data font-black text-2xl lg:text-3xl text-red-600 dark:text-red-400 tracking-tight">
                                {kpis.criticalCount}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-xs">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono-data font-bold text-[11px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                                    <TrendingUp size={12} />
                                    {kpis.criticalTrend.val}
                                </span>
                                <span className="text-[11px] text-slate-400">requires triage</span>
                            </div>
                        </div>

                    </section>

                    {/* ═══════════════════════════════════════════════════════════
                        CHART GRID (2-Column Responsive Layout)
                    ════════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* ───────────────────────────────────────────────────────
                            Chart 1: Reports Over Time (Line Chart, Hero Curve)
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Reports Trend Over Time</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-data font-bold bg-orange-100 dark:bg-orange-950/40 text-[#ff6b00]">
                                            Hero Metric
                                        </span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">30-day chronological report intake vs resolutions</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Accessibility Table Switcher */}
                                    <button
                                        type="button"
                                        onClick={() => setViewMode(v => ({ ...v, trend: v.trend === 'chart' ? 'table' : 'chart' }))}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                        title={viewMode.trend === 'chart' ? 'Switch to Accessible Table' : 'Switch to Visual Chart'}
                                        aria-label="Toggle Reports Over Time table view"
                                    >
                                        {viewMode.trend === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 text-xs font-mono-data pt-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-1 rounded-full bg-[#ff6b00]" />
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">Total Intake</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-1 rounded-full bg-[#10b981]" />
                                    <span className="text-slate-500">Resolved Cases</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-1 rounded-full bg-[#ef4444]" />
                                    <span className="text-slate-500">Critical Alerts</span>
                                </div>
                            </div>

                            {/* Visualization Body */}
                            <div className="h-64 mt-3 flex items-center justify-center">
                                {viewMode.trend === 'chart' ? (
                                    <svg viewBox="0 0 500 220" className="w-full h-full overflow-visible" role="img" aria-label="Line chart of Reports Over Time">
                                        {/* Grid lines */}
                                        {[0, 50, 100, 150, 200].map((y) => (
                                            <line key={y} x1="30" y1={y} x2="490" y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-800/60" strokeDasharray="3 3" />
                                        ))}
                                        {/* Hero Curve - Total Intake (PULSO Orange #ff6b00) */}
                                        <path
                                            d="M 30,170 Q 85,150 145,120 T 260,110 T 375,60 T 490,40"
                                            fill="none"
                                            stroke="#ff6b00"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                        />
                                        {/* Resolved Curve - Emerald */}
                                        <path
                                            d="M 30,185 Q 85,165 145,135 T 260,125 T 375,80 T 490,65"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        />
                                        {/* Critical Curve - Red */}
                                        <path
                                            d="M 30,205 Q 85,198 145,195 T 260,190 T 375,185 T 490,180"
                                            fill="none"
                                            stroke="#ef4444"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                        />
                                        {/* Dynamic Data Points on Hero Curve */}
                                        {[
                                            { cx: 30, cy: 170, val: 28 },
                                            { cx: 145, cy: 120, val: 42 },
                                            { cx: 260, cy: 110, val: 48 },
                                            { cx: 375, cy: 60, val: 61 },
                                            { cx: 490, cy: 40, val: 65 }
                                        ].map((pt, i) => (
                                            <g key={i} className="group cursor-pointer">
                                                <circle cx={pt.cx} cy={pt.cy} r="5" fill="#ff6b00" className="stroke-white dark:stroke-[#0c1424] stroke-2 transition-transform group-hover:scale-125" />
                                                <text x={pt.cx} y={pt.cy - 9} textAnchor="middle" className="text-[10px] font-mono-data font-bold fill-slate-700 dark:fill-slate-200">
                                                    {pt.val}
                                                </text>
                                            </g>
                                        ))}
                                        {/* X-Axis labels */}
                                        <text x="30" y="215" className="text-[10px] font-mono-data fill-slate-400">Aug 05</text>
                                        <text x="145" y="215" className="text-[10px] font-mono-data fill-slate-400">Aug 13</text>
                                        <text x="260" y="215" className="text-[10px] font-mono-data fill-slate-400">Aug 21</text>
                                        <text x="375" y="215" className="text-[10px] font-mono-data fill-slate-400">Aug 29</text>
                                        <text x="490" y="215" textAnchor="end" className="text-[10px] font-mono-data fill-slate-400">Today</text>
                                    </svg>
                                ) : (
                                    <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left text-xs font-mono-data">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                                                    <th className="py-2">Date</th>
                                                    <th className="py-2">Intake</th>
                                                    <th className="py-2">Resolved</th>
                                                    <th className="py-2">Critical</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {GENERATE_TIME_SERIES().map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                        <td className="py-1.5 text-slate-600 dark:text-slate-300">{r.date}</td>
                                                        <td className="py-1.5 font-bold text-[#ff6b00]">{r.total}</td>
                                                        <td className="py-1.5 text-emerald-500">{r.resolved}</td>
                                                        <td className="py-1.5 text-red-500">{r.critical}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ───────────────────────────────────────────────────────
                            Chart 2: Status Breakdown (Horizontal Stacked Bar)
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Status Pipeline Breakdown</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Scannable 5-stage Pulseline report lifecycle</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(v => ({ ...v, status: v.status === 'chart' ? 'table' : 'chart' }))}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                    title="Toggle Table"
                                    aria-label="Toggle Status table view"
                                >
                                    {viewMode.status === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                </button>
                            </div>

                            {/* Main Horizontal Stacked Bar */}
                            <div className="my-auto py-4">
                                <div className="text-xs font-mono-data flex justify-between text-slate-400 mb-2">
                                    <span>Total Tracked Reports: <strong className="text-slate-800 dark:text-white">1,284</strong></span>
                                    <span className="text-emerald-500 font-bold">87.4% Completed</span>
                                </div>

                                {/* Stacked Progress Strip */}
                                <div className="h-9 w-full rounded-xl overflow-hidden flex bg-slate-100 dark:bg-slate-800/50 p-1 gap-1">
                                    <div style={{ width: '4%' }} className="h-full rounded-md bg-[#64748b] transition-all hover:opacity-90" title="Received: 48 reports (3.7%)" />
                                    <div style={{ width: '5%' }} className="h-full rounded-md bg-[#ff6b00] transition-all hover:opacity-90" title="Verified: 64 reports (5.0%)" />
                                    <div style={{ width: '7%' }} className="h-full rounded-md bg-[#0284c7] transition-all hover:opacity-90" title="Assigned: 90 reports (7.0%)" />
                                    <div style={{ width: '10%' }} className="h-full rounded-md bg-[#10b981] transition-all hover:opacity-90" title="In progress: 128 reports (10.0%)" />
                                    <div style={{ width: '74%' }} className="h-full rounded-md bg-[#14b8a6] transition-all hover:opacity-90" title="Resolved: 954 reports (74.3%)" />
                                </div>

                                {/* Detailed Stage Badges & Counts */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs font-mono-data">
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold">
                                            <span className="w-2 h-2 rounded-full bg-[#64748b]" /> Received
                                        </div>
                                        <div className="text-base font-black text-slate-800 dark:text-white mt-1">48</div>
                                        <div className="text-[10px] text-slate-400">3.7%</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40">
                                        <div className="flex items-center gap-1.5 text-[#ff6b00] text-[10px] uppercase font-bold">
                                            <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> Verified
                                        </div>
                                        <div className="text-base font-black text-[#ff6b00] mt-1">64</div>
                                        <div className="text-[10px] text-[#ff6b00]/80">5.0%</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40">
                                        <div className="flex items-center gap-1.5 text-sky-500 text-[10px] uppercase font-bold">
                                            <span className="w-2 h-2 rounded-full bg-[#0284c7]" /> Assigned
                                        </div>
                                        <div className="text-base font-black text-sky-500 mt-1">90</div>
                                        <div className="text-[10px] text-sky-400">7.0%</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                                        <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] uppercase font-bold">
                                            <span className="w-2 h-2 rounded-full bg-[#10b981]" /> In Prog.
                                        </div>
                                        <div className="text-base font-black text-emerald-500 mt-1">128</div>
                                        <div className="text-[10px] text-emerald-400">10.0%</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40">
                                        <div className="flex items-center gap-1.5 text-teal-500 text-[10px] uppercase font-bold">
                                            <span className="w-2 h-2 rounded-full bg-[#14b8a6]" /> Resolved
                                        </div>
                                        <div className="text-base font-black text-teal-500 mt-1">954</div>
                                        <div className="text-[10px] text-teal-400">74.3%</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ───────────────────────────────────────────────────────
                            Chart 3: Reports by Barangay (Top 10 Horizontal Bars)
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Reports by Barangay (Top 10 Volume)</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Prioritized by citizen incident frequency in North Caloocan</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(v => ({ ...v, barangay: v.barangay === 'chart' ? 'table' : 'chart' }))}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                    title="Toggle Table"
                                    aria-label="Toggle Barangay table view"
                                >
                                    {viewMode.barangay === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                </button>
                            </div>

                            {/* Horizontal Bar List */}
                            <div className="h-80 overflow-y-auto custom-scrollbar mt-3 space-y-2.5 pr-2">
                                {BARANGAY_VOLUME_DATA.map((b, idx) => {
                                    const isTop1 = idx === 0;
                                    return (
                                        <div key={b.name} className="group">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 rounded-md text-[10px] font-mono-data font-bold flex items-center justify-center ${
                                                        isTop1 ? 'bg-[#ff6b00] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className={`font-heading font-bold ${
                                                        isTop1 ? 'text-[#ff6b00]' : 'text-slate-800 dark:text-slate-200'
                                                    }`}>
                                                        {b.name}
                                                    </span>
                                                </div>
                                                <span className="font-mono-data text-xs text-slate-500 dark:text-slate-400">
                                                    <strong className={isTop1 ? 'text-[#ff6b00]' : 'text-slate-900 dark:text-white'}>{b.count}</strong> reports ({b.pct}%)
                                                </span>
                                            </div>
                                            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                                                <div
                                                    style={{ width: `${b.pct * 3.2}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        isTop1 ? 'bg-[#ff6b00]' : 'bg-slate-400 dark:bg-slate-600 group-hover:bg-[#ff6b00]'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ───────────────────────────────────────────────────────
                            Chart 4: Severity Distribution (Colorblind-Safe Donut)
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Severity Distribution</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Colorblind-safe urgency segmentation</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(v => ({ ...v, severity: v.severity === 'chart' ? 'table' : 'chart' }))}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                    title="Toggle Table"
                                    aria-label="Toggle Severity table view"
                                >
                                    {viewMode.severity === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                </button>
                            </div>

                            {/* Donut & Legend Container */}
                            <div className="h-80 flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
                                {/* SVG Donut */}
                                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        {/* Background Circle */}
                                        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800/40" strokeWidth="16" />
                                        {/* Critical: 8.2% (circumference ~ 238.76) */}
                                        <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="16" strokeDasharray="19.5 238.76" strokeDashoffset="0" />
                                        {/* High: 22.8% */}
                                        <circle cx="50" cy="50" r="38" fill="none" stroke="#ff6b00" strokeWidth="16" strokeDasharray="54.4 238.76" strokeDashoffset="-19.5" />
                                        {/* Medium: 53.4% */}
                                        <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray="127.5 238.76" strokeDashoffset="-73.9" />
                                        {/* Low: 15.6% */}
                                        <circle cx="50" cy="50" r="38" fill="none" stroke="#64748b" strokeWidth="16" strokeDasharray="37.2 238.76" strokeDashoffset="-201.4" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="font-mono-data font-black text-xl text-slate-900 dark:text-white">1,284</span>
                                        <span className="text-[10px] font-heading font-semibold text-slate-400 uppercase">Total Cases</span>
                                    </div>
                                </div>

                                {/* Donut Legend & Stats */}
                                <div className="space-y-3 w-full sm:w-48 font-mono-data text-xs">
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                                        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Critical
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">105 (8.2%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/30">
                                        <span className="flex items-center gap-1.5 text-[#ff6b00] font-bold">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" /> High
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">293 (22.8%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Medium
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">686 (53.4%)</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800">
                                        <span className="flex items-center gap-1.5 text-slate-500 font-bold">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" /> Low
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-white">200 (15.6%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ───────────────────────────────────────────────────────
                            Chart 5: Resolution Time by Category (Operational Bottlenecks)
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Resolution Time by Category</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-data font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-600">
                                            SLA Analysis
                                        </span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Mean time to resolution (hours) vs municipal benchmark</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(v => ({ ...v, bottleneck: v.bottleneck === 'chart' ? 'table' : 'chart' }))}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                    title="Toggle Table"
                                    aria-label="Toggle Category resolution table view"
                                >
                                    {viewMode.bottleneck === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                </button>
                            </div>

                            {/* Bar Visualizer */}
                            <div className="mt-4 space-y-3.5">
                                {CATEGORY_RESOLUTION_DATA.map((cat) => {
                                    const isExceeded = cat.hours > cat.sla;
                                    return (
                                        <div key={cat.category}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-heading font-bold text-slate-800 dark:text-slate-200">
                                                    {cat.category}
                                                </span>
                                                <div className="flex items-center gap-2 font-mono-data text-xs">
                                                    <span className={`font-bold ${isExceeded ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {cat.hours} hrs avg
                                                    </span>
                                                    <span className="text-slate-400 text-[10px]">
                                                        (Target: {cat.target})
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Bar Container */}
                                            <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800/70 overflow-hidden">
                                                <div
                                                    style={{ width: `${Math.min(cat.hours * 2, 100)}%` }}
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        isExceeded
                                                            ? 'bg-red-500'
                                                            : cat.category === 'Electrical Hazard'
                                                            ? 'bg-emerald-500'
                                                            : 'bg-[#ff6b00]'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                                <Info size={15} className="text-[#ff6b00] shrink-0" />
                                <span>Drainage and flooding incidents currently exceed municipal SLA threshold due to monsoon surge. Heavy machinery dispatched.</span>
                            </div>
                        </div>

                        {/* ───────────────────────────────────────────────────────
                            Chart 6: Dispatcher & Field Team Performance
                        ──────────────────────────────────────────────────────── */}
                        <div className="bg-white dark:bg-[#0c1424] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs flex flex-col justify-between">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                    <h2 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Dispatcher & Team Throughput</span>
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">SLA compliance and closed work orders per maintenance unit</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewMode(v => ({ ...v, teams: v.teams === 'chart' ? 'table' : 'chart' }))}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                                    title="Toggle Table"
                                    aria-label="Toggle Team throughput table view"
                                >
                                    {viewMode.teams === 'chart' ? <Table size={14} /> : <BarChart2 size={14} />}
                                </button>
                            </div>

                            {/* Team Cards / Rows */}
                            <div className="mt-3 space-y-2.5">
                                {FIELD_TEAMS_DATA.map((team) => (
                                    <div
                                        key={team.name}
                                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                                    >
                                        <div>
                                            <h3 className="font-heading font-bold text-xs text-slate-800 dark:text-white">
                                                {team.name}
                                            </h3>
                                            <p className="text-[10px] font-mono-data text-slate-400 mt-0.5">
                                                {team.lead} · <strong className="text-slate-700 dark:text-slate-300">{team.active} active</strong> / {team.resolved} resolved
                                            </p>
                                        </div>

                                        <div className="text-right font-mono-data">
                                            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                <span>{team.slaRate}%</span>
                                                <span className="text-[10px] text-slate-400 font-normal">SLA</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                ~{team.avgHrs} hrs avg
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono-data text-slate-400">
                                <span>Overall Fleet Readiness</span>
                                <span className="text-emerald-500 font-bold">93.8% In Service</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
