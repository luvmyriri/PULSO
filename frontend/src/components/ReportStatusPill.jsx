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
export default function ReportStatusPill({ status, className = '' }) {
    const raw = (status || '').toLowerCase().trim();
    const s = raw.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

    let label = 'Received';
    let Icon = Clock;

    if (['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(s) || s.includes('resolv')) {
        label = 'Resolved';
        Icon = CheckCircle2;
    } else if (['dispatched', 'in progress', 'ongoing', 'active'].includes(s) || s.includes('progress') || s.includes('dispatch')) {
        label = 'In Progress';
        Icon = Wrench;
    } else if (['assigned', 'approved internal', 'approved for w o', 'approved'].includes(s) || s.includes('assigned') || s.includes('approved')) {
        label = 'Assigned';
        Icon = Users;
    } else if (['verified', 'reviewed', 'under review', 'pending approval', 'validated'].includes(s) || s.includes('verif') || s.includes('review')) {
        label = 'Verified';
        Icon = ShieldCheck;
    } else if (['rejected', 'spam', 'invalid', 'declined'].includes(s) || s.includes('reject')) {
        label = 'Rejected';
        Icon = XCircle;
    } else if (['cancelled', 'canceled'].includes(s) || s.includes('cancel')) {
        label = 'Cancelled';
        Icon = RotateCcw;
    } else {
        // Fallback: check workflow index
        const idx = getReportWorkflowIndex(raw);
        if (idx >= 0 && idx < REPORT_WORKFLOW_STEPS.length) {
            label = REPORT_WORKFLOW_STEPS[idx].label;
        } else {
            label = 'Received';
        }
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
