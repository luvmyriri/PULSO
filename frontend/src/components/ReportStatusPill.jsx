import React from 'react';
import {
    Clock,
    ShieldCheck,
    Users,
    Wrench,
    CheckCircle2,
    XCircle,
    RotateCcw
} from 'lucide-react';
import { getReportWorkflowIndex, REPORT_WORKFLOW_STEPS } from '../utils/reportWorkflow';

/**
 * ReportStatusPill
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible, token-safe status pill for PULSO resident mobile app.
 * Matches existing palette tokens with text and icon dual-coding (never color alone).
 * 12px semibold, rounded ends.
 */
export default function ReportStatusPill({ status, variant = 'default', className = '' }) {
    const raw = (status || '').toLowerCase().trim();
    const s = raw.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

    let label = 'Received';
    let Icon = Clock;
    let colorKey = 'pending';

    if (['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(s) || s.includes('resolv')) {
        label = 'Resolved';
        Icon = CheckCircle2;
        colorKey = 'resolved';
    } else if (['dispatched', 'in progress', 'ongoing', 'active'].includes(s) || s.includes('progress') || s.includes('dispatch')) {
        label = 'In Progress';
        Icon = Wrench;
        colorKey = 'in_progress';
    } else if (['assigned', 'approved internal', 'approved for w o', 'approved'].includes(s) || s.includes('assigned') || s.includes('approved')) {
        label = 'Assigned';
        Icon = Users;
        colorKey = 'in_progress';
    } else if (['verified', 'reviewed', 'under review', 'pending approval', 'validated'].includes(s) || s.includes('verif') || s.includes('review')) {
        label = 'Verified';
        Icon = ShieldCheck;
        colorKey = 'pending';
    } else if (['rejected', 'spam', 'invalid', 'declined'].includes(s) || s.includes('reject')) {
        label = 'Rejected';
        Icon = XCircle;
        colorKey = 'rejected';
    } else if (['cancelled', 'canceled'].includes(s) || s.includes('cancel')) {
        label = 'Cancelled';
        Icon = RotateCcw;
        colorKey = 'cancelled';
    } else {
        // Fallback: check workflow index
        const idx = getReportWorkflowIndex(raw);
        if (idx >= 0 && idx < REPORT_WORKFLOW_STEPS.length) {
            label = REPORT_WORKFLOW_STEPS[idx].label;
            colorKey = idx === 4 ? 'resolved' : idx > 0 ? 'in_progress' : 'pending';
        } else {
            label = 'Received';
            colorKey = 'pending';
        }
    }

    if (variant === 'tinted' || variant === 'desktop') {
        const tintStyles = {
            resolved: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
            in_progress: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
            pending: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800/60',
            rejected: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
            cancelled: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
        const currentTint = tintStyles[colorKey] || tintStyles.pending;

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold shrink-0 select-none border transition-colors ${currentTint} ${className}`}
            >
                <Icon size={13} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                <span>{label}</span>
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold shrink-0 select-none bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-2xs ${className}`}
        >
            <Icon size={11} strokeWidth={2.5} className="shrink-0 text-black dark:text-white" aria-hidden="true" />
            <span className="text-black dark:text-white">{label}</span>
        </span>
    );
}
