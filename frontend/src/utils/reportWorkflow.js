import React from 'react';
import { 
    Clock, 
    ShieldCheck, 
    Users, 
    Wrench, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle 
} from '../icons';

/**
 * Canonical Status Taxonomy across all PULSO LGU operational pages.
 * Replaces divergent terms like "Received", "Approved for W.O.", "Pending Approval".
 */
export const CANONICAL_STATUS_LIST = [
    'All',
    'Pending Review',
    'Verified',
    'Assigned',
    'In Progress',
    'Resolved',
    'Rejected'
];

export const REPORT_WORKFLOW_STEPS = [
    { id: 'received', label: 'Received' },
    { id: 'verified', label: 'Verified' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' }
];

/**
 * Returns a standardized status descriptor containing:
 * - canonical label
 * - Lucide icon component
 * - theme-safe badge classes (dual-coded with icon + label)
 * - dot color class
 * - user-friendly operational description
 */
export const getStatusDescriptor = (rawStatus) => {
    const raw = (rawStatus || '').toString().toLowerCase().trim();
    // Normalize punctuation like underscores, hyphens, periods to single spaces
    const s = raw.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Pending Review (Resident intake stage)
    if (['unverified', 'pending', 'received', 'pending review', 'intake', 'new'].includes(s) || s.startsWith('pend') || s.startsWith('unverif')) {
        return {
            key: 'pending_review',
            label: 'Pending Review',
            icon: Clock,
            badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
            dotClass: 'bg-amber-500',
            description: 'New resident report submitted, awaiting staff triage & intake.'
        };
    }

    // 2. Verified (Triage & hazard validation stage)
    if (['verified', 'reviewed', 'under review', 'pending approval', 'awaiting approval', 'validated'].includes(s) || s.includes('awaiting approval')) {
        return {
            key: 'verified',
            label: s === 'reviewed' ? 'Reviewed' : s === 'under review' ? 'Under Review' : 'Verified',
            icon: ShieldCheck,
            badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
            dotClass: 'bg-sky-500',
            description: 'Hazard and photo verified by staff, ready for work order routing.'
        };
    }

    // 3. Assigned (Work order generated & scheduled)
    if (
        ['assigned', 'approved internal', 'approved for w o', 'approved for wo', 'approved for work order', 'approved', 'w o generated'].includes(s) || 
        s.includes('approved') || 
        s.includes('work order') || 
        s.includes('assigned')
    ) {
        return {
            key: 'assigned',
            label: 'Assigned',
            icon: Users,
            badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
            dotClass: 'bg-indigo-500',
            description: 'Work order approved and assigned to an engineering division.'
        };
    }

    // 4. In Progress (Active field crew dispatched on-site)
    if (['dispatched', 'in progress', 'ongoing', 'active'].includes(s) || s.includes('progress') || s.includes('dispatch')) {
        return {
            key: 'in_progress',
            label: 'In Progress',
            icon: Wrench,
            badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
            dotClass: 'bg-orange-500',
            description: 'Field repair crew dispatched and active on-site.'
        };
    }

    // 5. Resolved (Completed with proof)
    if (['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(s) || s.includes('resolv') || s.includes('complet')) {
        return {
            key: 'resolved',
            label: 'Resolved',
            icon: CheckCircle2,
            badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
            dotClass: 'bg-emerald-500',
            description: 'Repairs completed and validated with photo evidence.'
        };
    }

    if (['cancelled', 'canceled'].includes(s) || s.includes('cancel')) {
        return {
            key: 'cancelled',
            label: 'Cancelled',
            icon: XCircle,
            badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
            dotClass: 'bg-slate-500',
            description: 'Report withdrawn or cancelled; no active work should be implied.'
        };
    }

    // 6. Rejected (Spam / Invalid / Out of Jurisdiction)
    if (['rejected', 'spam', 'invalid', 'declined'].includes(s) || s.includes('reject')) {
        return {
            key: 'rejected',
            label: 'Rejected',
            icon: XCircle,
            badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
            dotClass: 'bg-rose-500',
            description: 'Report marked as invalid, duplicate, or outside LGU jurisdiction.'
        };
    }

    // Fallback
    return {
        key: 'unknown',
        label: rawStatus || 'Pending Review',
        icon: Clock,
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-400',
        description: 'Report status in process.'
    };
};

/**
 * Returns the canonical workflow position without collapsing verified or
 * assigned records into the in-progress field-work state.
 */
export const getReportWorkflowIndex = (rawStatus) => {
    const key = getStatusDescriptor(rawStatus).key;
    const indexByKey = {
        pending_review: 0,
        verified: 1,
        assigned: 2,
        in_progress: 3,
        resolved: 4
    };

    return indexByKey[key] ?? -1;
};

export const buildReportWorkflowSteps = (rawStatus, timestamps = {}) => {
    const currentIndex = getReportWorkflowIndex(rawStatus);

    return REPORT_WORKFLOW_STEPS.map((step, index) => ({
        ...step,
        time: timestamps[step.id] || '—',
        completed: index <= currentIndex,
        active: index === currentIndex
    }));
};

/**
 * Extracts a human-readable, plain-language problem title for reports.
 * Promotes real problem summaries over technical tracking codes.
 */
export const getReportPlainTitle = (report) => {
    if (!report) return 'Citizen Report';
    if (report.title && report.title.trim()) return report.title.trim();
    if (report.ai_summary && report.ai_summary.trim()) {
        const clean = report.ai_summary.replace(/^["']|["']$/g, '').trim();
        if (clean.length > 0 && clean.length <= 65) return clean;
        if (clean.length > 65) return clean.substring(0, 62) + '...';
    }
    if (report.description && report.description.trim()) {
        const desc = report.description.trim();
        return desc.length <= 55 ? desc : desc.substring(0, 52) + '...';
    }
    if (report.issue && report.issue.trim()) return report.issue.trim();
    if (report.category) return report.category;
    if (report.ai_category) return report.ai_category;
    return 'Infrastructure Issue';
};

/**
 * Maps urgency/severity to consistent label, dot class, and hazard explanation.
 */
export const getUrgencyDescriptor = (urgency) => {
    const u = (urgency || '').toString().toLowerCase();
    if (u === 'critical') {
        return {
            label: 'Critical Priority',
            badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
            dotClass: 'bg-rose-500',
            meaning: 'Severe hazard — Immediate threat to life or property.'
        };
    }
    if (u === 'high') {
        return {
            label: 'High Priority',
            badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
            dotClass: 'bg-orange-500',
            meaning: 'Major disruption — Requires inspection within 24 hours.'
        };
    }
    if (u === 'medium' || u === 'normal') {
        return {
            label: 'Medium Priority',
            badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
            dotClass: 'bg-amber-500',
            meaning: 'Standard maintenance — Address in regular dispatch queue.'
        };
    }
    return {
        label: 'Low Priority',
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-400',
        meaning: 'Cosmetic or minor repair — Scheduled during routine sweeps.'
    };
};

/**
 * Standardizes any report ticket ID to #PUL-YYYY-XXXX (where YYYY is year, XXXX is 4 digits).
 * Normalizes legacy tickets like 'RPT-20260413-946A128EFCE43554' into '#PUL-2026-3554'.
 */
export const formatTicketId = (rawTicketId, fallbackId = null, withHashPrefix = true) => {
    const currentYear = new Date().getFullYear();
    const raw = (rawTicketId || '').toString().trim();
    const prefix = withHashPrefix ? '#' : '';

    if (!raw && !fallbackId) return `${prefix}PUL-${currentYear}-0001`;

    // If already in #PUL-YYYY-XXXX or PUL-YYYY-XXXX format
    if (/^#?PUL-\d{4}-\d{4,}$/i.test(raw)) {
        const clean = raw.replace(/^#/, '').toUpperCase();
        return `${prefix}${clean}`;
    }

    // Determine year from raw string or fallback to current year
    let year = String(currentYear);
    const yearMatch = raw.match(/202\d/);
    if (yearMatch) {
        year = yearMatch[0];
    }

    // Extract 4-digit code
    // If ticket has a hex/numeric hash after date e.g. RPT-20260413-946A128EFCE43554
    const parts = raw.split('-');
    let code = '';
    if (parts.length >= 3) {
        const hashPart = parts.slice(2).join('');
        const hashDigits = hashPart.replace(/\D/g, '');
        if (hashDigits.length >= 4) {
            code = hashDigits.slice(-4);
        }
    }

    if (!code) {
        const allDigits = raw.replace(/^RPT-?/i, '').replace(/^REP-?/i, '').replace(/\D/g, '');
        if (allDigits.length >= 4) {
            code = allDigits.slice(-4);
        } else if (fallbackId !== null && fallbackId !== undefined) {
            const idDigits = String(fallbackId).replace(/\D/g, '');
            code = idDigits.padStart(4, '0').slice(-4);
        } else {
            code = '0001';
        }
    }

    return `${prefix}PUL-${year}-${code}`;
};

