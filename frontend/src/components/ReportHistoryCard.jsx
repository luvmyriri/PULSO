import React from 'react';
import { ChevronDown, MapPin, Wrench } from 'lucide-react';
import ReportStatusPill from './ReportStatusPill';
import { REPORT_WORKFLOW_STEPS, getReportWorkflowIndex } from '../utils/reportWorkflow';

import { API_BASE_URL } from '../utils/apiBase';

/**
 * Clean readable address removing Plus Codes (e.g. 8Q4X+9V) and GPS coordinates
 */
export function cleanResidentAddress(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
        .replace(/\b[A-Z0-9]{4,8}\+[A-Z0-9]{2,4}\b/g, '') // remove plus codes
        .replace(/Lat:?[\s\d.-]+Lng:?[\s\d.-]+/gi, '') // remove lat/lng
        .replace(/\b(Lat|Lng|Latitude|Longitude)[:\s\d.-]+/gi, '')
        .replace(/\(\s*[\d.-]+\s*,\s*[\d.-]+\s*\)/g, '')
        .replace(/\s*,\s*,+/g, ', ')
        .replace(/^\s*,\s*|\s*,\s*$/g, '')
        .trim();
}

/**
 * ReportHistoryCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned for PULSO Mobile App / My Reports.
 * - Card: card fill, 1px border, 1rem (rounded-2xl) radius, 0.75rem (p-3) padding.
 * - Collapsed:
 *   - Left: 4rem (64px) rounded square photo thumbnail (or category fallback)
 *   - Middle: category (16px bold), subline "PUL-YYYY-XXXX · [Date]" (12px tabular),
 *             status pill + short address ending in ellipsis on one line
 *   - Right: Chevron rotating on open
 * - Expanded:
 *   - 1px orange border and light orange tint, smooth 200ms height change
 *   - Clean readable address (1-2 lines, no plus codes or coordinates)
 *   - Progress line: "Step X of 5 · [Status]" + thin 5-segment progress bar
 *   - Two 3rem (48px) tall buttons: "View on map" (outlined) + "View details" (solid orange, navy text)
 */
export default function ReportHistoryCard({
    report,
    isExpanded = false,
    onToggle,
    onOpenDetails,
    onOpenMap,
    categoryIcon: FallbackIcon = Wrench,
    className = ''
}) {
    if (!report) return null;

    const [imgLoadFailed, setImgLoadFailed] = React.useState(false);

    const ticketId = report.ticket_id || `PUL-2026-${String(report.id || '').padStart(4, '0')}`;
    const categoryName = report.category || report.ai_category || 'Civic Infrastructure';

    // Format date: "Apr 13, 2026"
    const formattedDate = report.created_at
        ? new Date(report.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Recently';

    // Clean address (no plus codes or raw GPS)
    const rawAddress = report.location_string || report.address || report.barangay || 'Caloocan City';
    const displayAddress = cleanResidentAddress(rawAddress) || report.barangay || 'Caloocan City';

    // Image URL resolution: match ResidentDashboard pattern `${API_BASE_URL}${report.image_url}`
    const rawImageUrl = report.image_url || report.photo_url || null;
    const imageUrl = rawImageUrl
        ? (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://') || rawImageUrl.startsWith('data:')
            ? rawImageUrl
            : `${API_BASE_URL}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`)
        : null;

    // Workflow calculation
    const rawStatus = (report.status || '').toLowerCase().trim();
    const isResolved = ['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(rawStatus) || rawStatus.includes('resolv');
    const stepIdx = getReportWorkflowIndex(report.status);
    const safeStepIdx = stepIdx >= 0 ? stepIdx : 0;
    const stepNumber = safeStepIdx + 1;
    const totalSteps = REPORT_WORKFLOW_STEPS.length; // 5

    // Canonical label
    const currentStepLabel = isResolved
        ? 'Resolved'
        : (REPORT_WORKFLOW_STEPS[safeStepIdx]?.label || 'Received');

    // Accessible name for card toggle button
    const accessibleName = `${categoryName}, ${ticketId}, ${currentStepLabel}. ${isExpanded ? 'Collapse' : 'Expand'}.`;

    return (
        <article
            className={`w-full rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 overflow-hidden ${
                isExpanded
                    ? 'border-[#ff6b00] bg-orange-500/[0.04] dark:bg-orange-500/[0.06] shadow-sm'
                    : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
            } ${className}`}
        >
            {/* Main Interactive Header Row */}
            <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={accessibleName}
                onClick={onToggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle?.();
                    }
                }}
                className="w-full p-3 flex items-center gap-3 text-left cursor-pointer select-none outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] focus-visible:ring-offset-1 transition-colors"
            >
                {/* Left: 4rem (64px) Rounded Square Photo Thumbnail */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetails?.(report);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View photo and details for ${ticketId}`}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenDetails?.(report);
                        }
                    }}
                    className="w-16 h-16 min-w-[4rem] min-h-[4rem] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 shadow-2xs group/thumb focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                >
                    {imageUrl && !imgLoadFailed ? (
                        <img
                            src={imageUrl}
                            alt=""
                            loading="lazy"
                            onError={() => setImgLoadFailed(true)}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800">
                            <FallbackIcon size={24} strokeWidth={1.75} className="text-slate-400 dark:text-slate-500" />
                        </div>
                    )}
                </div>

                {/* Middle: Category, Subline, Status Pill + Short Address */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* Category (16px bold, up to 2 lines) */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails?.(report);
                        }}
                        className="text-left font-bold text-base text-slate-900 dark:text-white line-clamp-2 leading-snug hover:text-[#ff6b00] dark:hover:text-[#ff6b00] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded"
                    >
                        {categoryName}
                    </button>

                    {/* Subline: "PUL-2026-5459 · Apr 13, 2026" */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono [font-variant-numeric:tabular-nums] mt-0.5 leading-tight">
                        <span>{ticketId}</span>
                        <span className="mx-1 text-slate-400 dark:text-slate-600">·</span>
                        <span>{formattedDate}</span>
                    </div>

                    {/* Status Pill + Short Address on one line ending with ellipsis */}
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                        <ReportStatusPill status={report.status} className="shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">
                            {displayAddress}
                        </span>
                    </div>
                </div>

                {/* Right: Rotating Chevron */}
                <div className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <ChevronDown
                        size={20}
                        strokeWidth={2.25}
                        className={`transition-transform duration-200 ease-out ${
                            isExpanded ? 'rotate-180 text-[#ff6b00]' : ''
                        }`}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Expanded Content with 200ms height transition */}
            <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
                aria-hidden={!isExpanded}
            >
                <div className="overflow-hidden">
                    <div className="px-3 pb-3 pt-1 border-t border-slate-200/70 dark:border-slate-800/80 space-y-3.5">
                        {/* 1. Readable address (1-2 lines, clean, no Plus Codes or coordinates) */}
                        <div className="flex items-start gap-2 pt-1">
                            <MapPin size={15} className="text-[#ff6b00] shrink-0 mt-0.5" aria-hidden="true" />
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                                {displayAddress}
                            </p>
                        </div>

                        {/* 2. Progress line: "Step X of 5 · [Status]" and segmented bar */}
                        <div className="space-y-1.5" aria-label={`Progress: Step ${stepNumber} of ${totalSteps}, ${currentStepLabel}`}>
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-900 dark:text-white">
                                    Step {stepNumber} of {totalSteps}
                                </span>
                                <span className={isResolved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[#ff6b00] dark:text-[#ff6b00] font-bold'}>
                                    {currentStepLabel}
                                </span>
                            </div>

                            {/* 5-Step Segmented Progress Bar */}
                            <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                                {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                                    const isDone = idx < safeStepIdx;
                                    const isCurrent = idx === safeStepIdx;
                                    
                                    let segmentColor = 'bg-slate-200 dark:bg-slate-800'; // upcoming
                                    if (isResolved) {
                                        segmentColor = 'bg-emerald-500';
                                    } else if (isDone || isCurrent) {
                                        segmentColor = 'bg-[#ff6b00]';
                                    }

                                    return (
                                        <div
                                            key={step.id}
                                            className={`h-full rounded-full transition-colors ${segmentColor}`}
                                            title={`Step ${idx + 1}: ${step.label}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Two 3rem (48px) tall action buttons side by side */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {/* View on Map (Outlined) */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenMap?.(report);
                                }}
                                className="h-12 min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.99]"
                            >
                                View on map
                            </button>

                            {/* View Details (Solid Orange, White Text) */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenDetails?.(report);
                                }}
                                className="h-12 min-h-[48px] px-3 rounded-xl bg-[#ff6b00] hover:bg-[#e66000] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.99]"
                            >
                                <span className="text-white">View details</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
