/**
 * PredictiveMaintenance.jsx
 * PULSO Predictive Maintenance Dashboard
 * City Engineering Office — Caloocan City
 *
 * Features:
 *   - Infrastructure health score cards per asset
 *   - Failure probability visualizations (30/60/90d)
 *   - 90-day maintenance schedule (weekly calendar view)
 *   - Barangay risk heat map
 *   - AI-generated maintenance action plans
 *   - CSV export
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown,
    Minus, Wrench, Calendar, Download, RefreshCw, ChevronRight,
    Activity, Zap, Shield, Brain, MapPin, BarChart2, Droplets,
    ChevronLeft, Sun, CloudRain, Info, Loader2, ChevronDown, ChevronUp,
    ClipboardList, AlertOctagon, Eye, Cpu
} from '../icons';

import { API_BASE_URL as API } from '../utils/apiBase';
import ThemeToggle from './ThemeToggle';
import GovBreadcrumb from './GovBreadcrumb';
import GovUserDropdown from './GovUserDropdown';
import GovNotificationDropdown from './GovNotificationDropdown';

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem('pulso_token');

const apiFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        ...opts,
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
};

const PRIORITY_CONFIG = {
    CRITICAL: { color: '#ef4444', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500', icon: AlertOctagon, label: 'Critical' },
    HIGH:     { color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-500', icon: AlertTriangle, label: 'High' },
    MODERATE: { color: '#eab308', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-500', icon: Clock, label: 'Moderate' },
    WATCH:    { color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-400', icon: Eye, label: 'Watch' },
    GOOD:     { color: '#22c55e', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-600 dark:text-green-400', badge: 'bg-green-500', icon: CheckCircle, label: 'Good' },
};

const TREND_CONFIG = {
    WORSENING: { icon: TrendingUp,   color: 'text-red-500',    label: 'Worsening' },
    STABLE:    { icon: Minus,        color: 'text-slate-400',  label: 'Stable' },
    IMPROVING: { icon: TrendingDown, color: 'text-green-500',  label: 'Improving' },
    WATCH:     { icon: Activity,     color: 'text-yellow-500', label: 'Watch' },
};

function HealthBar({ score, size = 'md' }) {
    const pct = Math.max(0, Math.min(100, score));
    const color =
        pct <= 15 ? '#ef4444' :
        pct <= 35 ? '#f97316' :
        pct <= 55 ? '#eab308' :
        pct <= 75 ? '#3b82f6' :
        '#22c55e';

    const h = size === 'sm' ? 'h-1.5' : 'h-2.5';

    return (
        <div className={`w-full ${h} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
            />
        </div>
    );
}

function ProbabilityBar({ label, value, color }) {
    const pct = Math.round((value || 0) * 100);
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 w-8 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{pct}%</span>
        </div>
    );
}

function KPICard({ icon: Icon, label, value, sub, color = 'indigo', pulse = false }) {
    const colorMap = {
        red:    'from-red-500 to-red-700 shadow-red-200 dark:shadow-red-900',
        orange: 'from-orange-500 to-orange-700 shadow-orange-200 dark:shadow-orange-900',
        yellow: 'from-yellow-500 to-yellow-600 shadow-yellow-200 dark:shadow-yellow-900',
        green:  'from-green-500 to-emerald-600 shadow-green-200 dark:shadow-green-900',
        blue:   'from-blue-500 to-indigo-600 shadow-blue-200 dark:shadow-blue-900',
        indigo: 'from-indigo-500 to-violet-600 shadow-indigo-200 dark:shadow-indigo-900',
        purple: 'from-purple-500 to-purple-700 shadow-purple-200 dark:shadow-purple-900',
    };
    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-md shadow-orange-100/50 dark:shadow-orange-900/10 transition-shadow"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 dark:bg-white/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-md`}>
                    <Icon size={18} className="text-white" />
                </div>
                {pulse && (
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
        </motion.div>
    );
}

// ─── Asset Health Card ────────────────────────────────────────────────────────

function HealthCard({ asset, onAIPlan, onConvertToWO, loadingAI, isExpanded, onToggle }) {
    const cfg = PRIORITY_CONFIG[asset.priority] || PRIORITY_CONFIG.WATCH;
    const PriIcon = cfg.icon;
    const trend = TREND_CONFIG[asset.trend] || TREND_CONFIG.STABLE;
    const TrendIcon = trend.icon;

    const probColor =
        asset.failure_probability_30d >= 0.7 ? '#ef4444' :
        asset.failure_probability_30d >= 0.4 ? '#f97316' :
        '#22c55e';

    return (
        <motion.div 
            layout
            whileHover={{ scale: 1.01 }}
            className={`rounded-2xl border backdrop-blur-lg shadow-xl shadow-black/5 ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${cfg.badge}`}>
                                {cfg.label}
                            </span>
                            {asset.rainy_season_warning && (
                                <span className="text-[9px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <CloudRain size={8} /> RAINY RISK
                                </span>
                            )}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">{asset.category.toUpperCase()}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Brgy. {asset.barangay}</span>
                        </div>
                    </div>
                    {/* Health dial */}
                    <div className="text-right shrink-0 ml-3">
                        <div className="text-3xl font-black" style={{ color: cfg.color }}>{asset.health_score}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">/ 100</div>
                    </div>
                </div>

                {/* Restored: Health bar */}
                <HealthBar score={asset.health_score} />

                {/* Restored: Key metrics row */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                        <div className="text-sm font-black" style={{ color: probColor }}>
                            {Math.round(asset.failure_probability_30d * 100)}%
                        </div>
                        <div className="text-[9px] text-slate-400">30d signal</div>
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {asset.report_count}
                        </div>
                        <div className="text-[9px] text-slate-400">Reports</div>
                    </div>
                    <div>
                        <div className={`text-sm font-black flex items-center justify-center gap-0.5 ${trend.color}`}>
                            <TrendIcon size={12} />
                            {asset.growth_pct > 0 ? '+' : ''}{asset.growth_pct}%
                        </div>
                        <div className="text-[9px] text-slate-400">30d Growth</div>
                    </div>
                </div>
            </div>

            {/* Expandable detail */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-slate-800/50 border-t border-current/10 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
                <span>Details & Action Plan</span>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t border-current/10 space-y-4 bg-white/60 dark:bg-slate-900/60">
                            {/* Exploratory scores, pending model validation */}
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Exploratory risk signal · not a validated probability</div>
                                <ProbabilityBar label="30d" value={asset.failure_probability_30d} color={probColor} />
                                <ProbabilityBar label="60d" value={asset.failure_probability_60d} color={probColor} />
                                <ProbabilityBar label="90d" value={asset.failure_probability_90d} color={probColor} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <div className="text-slate-400 text-[10px]">Recurrence Rate</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{Math.round(asset.recurrence_rate * 100)}%</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Days Since Maint.</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{asset.days_since_last_maintenance}d</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Suggested review date</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{asset.next_maintenance_date}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-[10px]">Freq / Month</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{asset.freq_per_month} reports</div>
                                </div>
                            </div>

                            {/* Compliance & Audit Section */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                    <Shield size={11} className="text-indigo-500" />
                                    Audit & Compliance Registry
                                </div>
                                <div className="space-y-1.5">
                                    {/* Show existing docs */}
                                    {asset.audit_compliance?.map((doc, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            whileHover={{ x: 2 }}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50"
                                        >
                                            <div className="flex items-center gap-2">
                                                {doc.status === 'verified' ? (
                                                    <CheckCircle size={10} className="text-green-500" />
                                                ) : (
                                                    <Clock size={10} className="text-slate-400" />
                                                )}
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{doc.name}</span>
                                            </div>
                                            <Link 
                                                to={`/gov/documents?search=${asset.asset_id}&target_model=ProjectRequest`}
                                                className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors flex items-center gap-0.5"
                                            >
                                                REGISTRY <ChevronRight size={10} />
                                            </Link>
                                        </motion.div>
                                    ))}

                                    {(!asset.audit_compliance || asset.audit_compliance.length === 0) && (
                                        <div className="text-[10px] text-slate-400 italic py-1 px-1">
                                            No verified audit documents linked to this asset lifecycle.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI Action Plan Section - Now Inline */}
                            <div className="pt-2">
                                <button
                                    onClick={() => onAIPlan(asset)}
                                    disabled={loadingAI === `${asset.barangay}_${asset.category}`}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-xs font-black py-2 rounded-xl transition-all disabled:opacity-50 shadow-md shadow-violet-200 dark:shadow-none"
                                >
                                    {loadingAI === `${asset.barangay}_${asset.category}` ? (
                                        <><Loader2 size={13} className="animate-spin" /> Generating AI Plan...</>
                                    ) : (
                                        <><Brain size={13} /> {asset.ai_plan ? 'Refresh AI Action Plan' : 'Generate AI Action Plan'}</>
                                    )}
                                </button>

                                {asset.ai_plan && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800"
                                    >
                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-violet-100 dark:border-violet-800">
                                            <div className="flex items-center gap-2">
                                                <Brain size={14} className="text-violet-600" />
                                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Maintenance Strategy</span>
                                            </div>
                                            <div className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-600 text-white">
                                                {asset.ai_plan.priority}
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap mb-4">
                                            {asset.ai_plan.maintenance_plan}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => onAIPlan({ ...asset, dismiss: true })}
                                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Dismiss Plan
                                            </button>
                                            <button 
                                                onClick={() => onConvertToWO(asset.ai_plan)}
                                                className="flex items-center justify-center gap-1 bg-indigo-600 text-white text-[10px] font-black py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                                            >
                                                <ClipboardList size={10} /> Create Work Order
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Maintenance Schedule ─────────────────────────────────────────────────────

function ScheduleView({ schedule }) {
    if (!schedule) return null;
    const { weekly_summary, schedule_items, total_cost_formatted, critical_count, rainy_season_active } = schedule;

    const priorityColor = { CRITICAL: 'border-l-red-500', HIGH: 'border-l-orange-500', MODERATE: 'border-l-yellow-400', WATCH: 'border-l-blue-400' };

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300" role="note">Suggested inspections only. No work is scheduled and no funds are approved by this view.</p>
            {/* Top stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm shadow-orange-100/40 dark:shadow-orange-900/10 text-center">
                    <div className="text-xl font-black text-slate-900 dark:text-white">{schedule.total_items}</div>
                    <div className="text-[10px] text-slate-400 font-bold">Total Items</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm shadow-orange-100/40 dark:shadow-orange-900/10 text-center">
                    <div className="text-xl font-black text-red-500">{critical_count}</div>
                    <div className="text-[10px] text-slate-400 font-bold">Critical</div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm shadow-orange-100/40 dark:shadow-orange-900/10 text-center">
                    <div className="text-xl font-black text-indigo-600">{total_cost_formatted}</div>
                    <div className="text-[10px] text-slate-400 font-bold">Illustrative cost</div>
                </div>
            </div>


            {/* Weekly calendar */}
            <div className="space-y-4">
                {weekly_summary?.map(week => {
                    const weekItems = schedule_items?.filter(i => i.week_number === week.week_number) || [];
                    return (
                        <div key={week.week_number} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shadow-orange-100/40 dark:shadow-orange-900/10 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                        <span className="text-xs font-black text-white">W{week.week_number}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{week.week_label}</div>
                                        <div className="text-[10px] text-slate-400">{week.item_count} review {week.item_count === 1 ? 'candidate' : 'candidates'}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-indigo-600 text-sm">{week.total_cost_formatted}</div>
                                    {week.critical_count > 0 && (
                                        <div className="text-[9px] font-black text-red-500">{week.critical_count} CRITICAL</div>
                                    )}
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {weekItems.map((item, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-3 border-l-4 ${priorityColor[item.priority] || 'border-l-slate-300'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded text-white ${PRIORITY_CONFIG[item.priority]?.badge || 'bg-slate-400'}`}>
                                                    {item.priority}
                                                </span>
                                                {item.rainy_season_warning && <CloudRain size={11} className="text-blue-500" />}
                                            </div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                {item.category.toUpperCase()} — Brgy. {item.barangay}
                                            </div>
                                            <div className="text-[10px] text-slate-400">Suggested review: {item.scheduled_date}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{item.estimated_cost_formatted}</div>
                                            <div className="text-[10px] text-slate-400">{Math.round(item.failure_prob * 100)}% exploratory signal</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Risk Map Table ───────────────────────────────────────────────────────────

function RiskMapView({ riskMap }) {
    if (!riskMap?.length) return (
        <div className="text-center py-8 text-slate-400">No barangay risk data available.</div>
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shadow-orange-100/40 dark:shadow-orange-900/10 bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Barangay</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Health Score</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Priority</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Critical</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">At-Risk Categories</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {riskMap.map((brgy, i) => {
                        const cfg = PRIORITY_CONFIG[brgy.overall_priority] || PRIORITY_CONFIG.WATCH;
                        return (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: brgy.risk_color }} />
                                        Brgy. {brgy.barangay}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-black text-base" style={{ color: brgy.risk_color }}>{brgy.avg_health_score}</span>
                                        <HealthBar score={brgy.avg_health_score} size="sm" />
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${cfg.badge}`}>
                                        {cfg.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center font-black text-red-500">
                                    {brgy.critical_assets || 0}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {(brgy.categories_at_risk || []).slice(0, 3).map((cat, j) => (
                                            <span key={j} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── AI Plan Modal ────────────────────────────────────────────────────────────

function AIPlanModal({ plan, onClose, onConvertToWO, converting }) {
    if (!plan) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Brain size={16} className="text-violet-600" />
                            <span className="font-black text-slate-900 dark:text-white">AI Maintenance Plan</span>
                        </div>
                        <div className="text-xs text-slate-500">
                            Brgy. {plan.barangay} — {plan.category?.toUpperCase()} · Health: {plan.health_score}/100
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">✕</button>
                </div>
                <div className="overflow-y-auto p-5 flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full text-white ${PRIORITY_CONFIG[plan.priority]?.badge || 'bg-slate-500'}`}>
                            {plan.priority}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                            Est. Budget: PHP{plan.estimated_cost?.toLocaleString()} · {plan.estimated_duration_days} days
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Executive Summary</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{plan.maintenance_plan}"
                        </p>
                    </div>

                    {plan.steps && plan.steps.length > 0 && (
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Strategic Steps</h4>
                            <div className="space-y-2">
                                {plan.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="font-black text-indigo-500 shrink-0">{idx + 1}.</span>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {plan.technical_justification && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Technical Justification</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                {plan.technical_justification}
                            </p>
                        </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                        Generated by PULSO AI — {plan.generated_by} · {new Date(plan.generated_at).toLocaleString('en-PH')}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 shrink-0">
                    <button 
                        onClick={onClose} 
                        className="py-2.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={() => onConvertToWO(plan)}
                        disabled={converting}
                        className="py-2.5 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {converting ? (
                            <><Loader2 size={14} className="animate-spin" /> Converting...</>
                        ) : (
                            <><ClipboardList size={14} /> Create Work Order</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview',  label: 'Overview',       icon: BarChart2 },
    { id: 'health',    label: 'Asset Health',   icon: Activity },
    { id: 'schedule',  label: 'Review candidates', icon: Calendar },
    { id: 'risk-map',  label: 'Risk Map',       icon: MapPin },
];

export default function PredictiveMaintenance() {
    const [activeTab, setActiveTab] = useState('overview');
    const [summary, setSummary] = useState(null);
    const [health, setHealth] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [riskMap, setRiskMap] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAI, setLoadingAI] = useState(null);
    const [convertingWO, setConvertingWO] = useState(false);
    const [aiPlan, setAiPlan] = useState(null);
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [sum, hlth, sched, risk] = await Promise.all([
                apiFetch('/api/gov/predictive/summary'),
                apiFetch('/api/gov/predictive/health'),
                apiFetch('/api/gov/predictive/schedule'),
                apiFetch('/api/gov/predictive/risk-map'),
            ]);
            setSummary(sum);
            setHealth(hlth.health_scores || []);
            setSchedule(sched);
            setRiskMap(risk.risk_map || []);
            setLastRefresh(new Date());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleAIPlan = async (asset) => {
        if (!asset) return;
        if (asset.dismiss) {
            setHealth(prev => prev.map(a => 
                (a.barangay === asset.barangay && a.category === asset.category) 
                ? { ...a, ai_plan: null } 
                : a
            ));
            return;
        }
        const key = `${asset.barangay}_${asset.category}`;
        setLoadingAI(key);
        try {
            const plan = await apiFetch('/api/gov/predictive/ai-plan', {
                method: 'POST',
                body: JSON.stringify({ 
                    barangay: asset.barangay, 
                    category: asset.category, 
                    asset_id: asset.asset_id 
                }),
            });
            // Update the specific asset in health state with the plan
            setHealth(prev => prev.map(a => 
                (a.barangay === asset.barangay && a.category === asset.category) 
                ? { ...a, ai_plan: plan } 
                : a
            ));
        } catch (e) {
            alert(`AI Plan Error: ${e.message}`);
        } finally {
            setLoadingAI(null);
        }
    };

    const handleConvertPlanToWO = async (plan) => {
        if (!confirm(`Are you sure you want to convert this AI plan for ${plan.category} in Brgy. ${plan.barangay} into a formal Work Order?`)) return;
        const reviewReason = window.prompt('Record the engineering reason for opening a preventive review work order:');
        if (!reviewReason || reviewReason.trim().length < 10) return;
        
        setConvertingWO(true);
        try {
            const wo = await apiFetch('/api/gov/predictive/convert-to-work-order', {
                method: 'POST',
                body: JSON.stringify({
                    barangay: plan.barangay,
                    category: plan.category,
                    plan_summary: plan.maintenance_plan,
                    priority: plan.priority,
                    estimated_cost: plan.estimated_cost || 0,
                    asset_id: plan.asset_id,
                    review_reason: reviewReason.trim(),
                }),
            });
            alert(`Work Order #${wo.wo_number} was opened for review. No field team has been dispatched.`);
            setAiPlan(null);
            loadAll();
        } catch (e) {
            alert(`Conversion Error: ${e.message}`);
        } finally {
            setConvertingWO(false);
        }
    };

    const handleExport = async () => {
        const token = getToken();
        const res = await fetch(`${API}/api/gov/predictive/export`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PULSO_PredictiveMaint_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    };

    const filteredHealth = filterPriority === 'ALL'
        ? health
        : health.filter(a => a.priority === filterPriority);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 shadow-sm relative z-50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Operations" current="Predictive Maintenance" />
                        <div className="flex items-center gap-3 mt-1">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md">
                                <Cpu size={18} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                    Predictive Maintenance Engine
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">Exploratory asset signals from recorded work and reports · Engineering review required</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastRefresh && (
                            <span className="text-[10px] text-slate-400">
                                Updated {lastRefresh.toLocaleTimeString('en-PH')}
                            </span>
                        )}
                        <ThemeToggle />
                        <button onClick={handleExport} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <Download size={13} /> Export CSV
                        </button>
                        <button
                            onClick={loadAll}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
                        <AlertTriangle size={16} />
                        <span><strong>Error:</strong> {error}</span>
                        <button onClick={loadAll} className="ml-auto text-red-500 hover:text-red-700 font-bold text-xs">Retry</button>
                    </div>
                )}

                {loading && !summary ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-3 animate-pulse">
                                <Cpu size={22} className="text-white" />
                            </div>
                            <div className="text-sm font-bold text-slate-500">Loading asset maintenance signals…</div>
                            <div className="text-xs text-slate-400 mt-1">Scanning {health?.length || '…'} infrastructure assets</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── OVERVIEW TAB ───────────────────────── */}
                        {activeTab === 'overview' && summary && (
                            <div className="space-y-6">
                                <p className="text-xs text-slate-600 dark:text-slate-300" role="note">These are unvalidated heuristic scores and illustrative costs. Dates are suggested review dates. An engineer must inspect the source record before assigning work or approving funds.</p>
                                {/* Rainy season banner */}
                                {summary.rainy_season_active && (
                                    <div className="bg-blue-600 rounded-2xl p-4 flex items-center gap-4">
                                        <CloudRain size={32} className="text-white shrink-0" />
                                        <div>
                                            <div className="font-black text-white">Rainy Season Alert</div>
                                            <div className="text-blue-100 text-xs">
                                                June–November is high-risk period for drainage, roads, and flooding.
                                                Priority maintenance should be completed before peak rainfall.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* KPI grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    <KPICard icon={Shield} label="Assets Monitored" value={summary.total_assets_monitored || 0} color="indigo" />
                                    <KPICard icon={Activity} label="Avg Health Score" value={`${summary.avg_health_score || 0}/100`} color="blue" />
                                    <KPICard icon={AlertOctagon} label="Critical Assets" value={summary.critical_count || 0} color="red" pulse={summary.critical_count > 0} />
                                    <KPICard icon={AlertTriangle} label="High Priority" value={summary.high_count || 0} color="orange" />
                                    <KPICard icon={Clock} label="High heuristic signal" value={summary.urgent_this_week || 0} color="yellow" />
                                    <KPICard icon={Zap} label="Inspection candidates" value={summary.assets_needing_immediate_action || 0} color="red" />
                                    <KPICard icon={ClipboardList} label="Illustrative cost" value={summary.scheduled_90d_cost_formatted || '₱0'} color="purple" />
                                    <KPICard icon={CheckCircle} label="Good Condition" value={summary.good_count || 0} color="green" />
                                    {summary.total_active_reports > 0 && (
                                        <KPICard icon={BarChart2} label="Active Reports Analyzed" value={summary.total_active_reports} color="indigo"
                                            sub="Source: Analytics Command Center" />
                                    )}
                                </div>

                                {/* Top at-risk */}
                                {summary.top_at_risk?.length > 0 && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-md shadow-orange-100/60 dark:shadow-orange-900/10">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-md">
                                                <AlertOctagon size={14} className="text-white" />
                                            </div>
                                            <h2 className="font-black text-slate-900 dark:text-white">Top 5 At-Risk Assets</h2>
                                        </div>
                                        <div className="space-y-3">
                                            {summary.top_at_risk.map((asset, i) => {
                                                const cfg = PRIORITY_CONFIG[asset.priority] || PRIORITY_CONFIG.WATCH;
                                                return (
                                                    <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-xl p-3 flex items-center gap-3`}>
                                                        <div className={`shrink-0 min-w-[3rem] text-center`}>
                                                            <div className={`text-xl font-black leading-none ${cfg.text}`}>{Math.round(asset.health_score)}</div>
                                                            <div className="text-[9px] text-slate-400 font-bold">/ 100</div>
                                                        </div>
                                                        <div className={`w-px self-stretch ${cfg.border} border-l shrink-0`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{asset.category.toUpperCase()}</div>
                                                            <div className="text-xs text-slate-500 truncate">Brgy. {asset.barangay} · {Math.round(asset.failure_probability_30d * 100)}% exploratory signal</div>
                                                            <HealthBar score={asset.health_score} size="sm" />
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white shrink-0 ${cfg.badge}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── ASSET HEALTH TAB ───────────────────── */}
                        {activeTab === 'health' && (
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-sm">Real-time Asset Health</h3>
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'WATCH', 'GOOD'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setFilterPriority(p)}
                                                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                                                    filterPriority === p
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {p === 'ALL' ? `All (${health.length})` : `${p}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {filteredHealth.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Shield size={32} className="mx-auto mb-2 opacity-30" />
                                        <div className="font-bold">No assets match this filter.</div>
                                        <div className="text-xs mt-1">Try changing the priority filter or ensure reports exist in the system.</div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                        {filteredHealth.map((asset, i) => {
                                            const cardId = `asset_${i}_${asset.barangay}_${asset.category}`;
                                            return (
                                                <HealthCard 
                                                    key={cardId} 
                                                    asset={asset} 
                                                    onAIPlan={handleAIPlan} 
                                                    onConvertToWO={handleConvertPlanToWO}
                                                    loadingAI={loadingAI}
                                                    isExpanded={expandedIds.has(cardId)}
                                                    onToggle={() => {
                                                        const next = new Set(expandedIds);
                                                        if (next.has(cardId)) next.delete(cardId);
                                                        else next.add(cardId);
                                                        setExpandedIds(next);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SCHEDULE TAB ───────────────────────── */}
                        {activeTab === 'schedule' && (
                            <ScheduleView schedule={schedule} />
                        )}

                        {/* ── RISK MAP TAB ───────────────────────── */}
                        {activeTab === 'risk-map' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                                    <Info size={14} className="shrink-0" />
                                    Barangay risk is aggregated from all monitored infrastructure categories. Lower health score = higher risk.
                                </div>
                                <RiskMapView riskMap={riskMap} />
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
}
