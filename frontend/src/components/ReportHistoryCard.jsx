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
 * -----------------------------------------------------------------------------
 * Responsive component:
 * - Mobile / Tablet (< 1024px): Preserves existing compact mobile card with progress bar.
 * - Desktop (>= 1024px): Matches target desktop mockup (56px thumbnail, 17px bold category,
 *   subline with ID + date + wrapped address, status pill + chevron, 150ms expandable
 *   status message strip, Updated date, "View on Map" outline and "View Report ->" orange button).
 */
function ReportHistoryCardContent({
    report,
    isExpanded = false,
    onToggle,
    onOpenDetails,
    onOpenMap,
    categoryIcon: FallbackIcon = Wrench,
    className = ''
}) {

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

    const formattedUpdatedDate = report.updated_at
        ? new Date(report.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : formattedDate;

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

    // Status strip messaging for expanded desktop card
    const getStatusStripContent = (statusStr) => {
        const s = (statusStr || '').toLowerCase().trim();
        if (['rejected', 'spam', 'invalid', 'declined'].includes(s) || s.includes('reject')) {
            return {
                title: 'This report was rejected',
                subtitle: "Review the department's feedback and available next steps in report details.",
                stripClass: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100',
                subClass: 'text-rose-700 dark:text-rose-300'
            };
        }
        if (['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(s) || s.includes('resolv')) {
            return {
                title: 'This report has been resolved.',
                subtitle: 'The reported issue has been addressed and verified by the City Engineering Department.',
                stripClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100',
                subClass: 'text-emerald-700 dark:text-emerald-300'
            };
        }
        if (['dispatched', 'in progress', 'ongoing', 'active', 'assigned', 'approved internal'].includes(s) || s.includes('progress') || s.includes('dispatch') || s.includes('assign')) {
            return {
                title: 'The team is working on this report.',
                subtitle: 'Field crews and engineering teams have been assigned to this civic concern.',
                stripClass: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50 text-sky-950 dark:text-sky-100',
                subClass: 'text-sky-700 dark:text-sky-300'
            };
        }
        if (['cancelled', 'canceled'].includes(s) || s.includes('cancel')) {
            return {
                title: 'This report was withdrawn.',
                subtitle: 'The submission was retracted and will not proceed to field operations.',
                stripClass: 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
                subClass: 'text-slate-600 dark:text-slate-400'
            };
        }
        return {
            title: 'Your report is waiting for review.',
            subtitle: 'Department staff will verify the details and dispatch work orders shortly.',
            stripClass: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-950 dark:text-orange-100',
            subClass: 'text-orange-700 dark:text-orange-300'
        };
    };

    const statusStrip = getStatusStripContent(report.status);

    return (
        <>
            {/* ============================================================ */}
            {/* MOBILE & TABLET LAYOUT (< 1024px) - 100% UNTOUCHED            */}
            {/* ============================================================ */}
            <article
                className={`lg:hidden w-full rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 overflow-hidden ${
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
                                onError={() => setImgLoadFailed(true)}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                <FallbackIcon size={24} strokeWidth={1.75} />
                            </div>
                        )}
                    </div>

                    {/* Middle: Category, Subline, Status Pill + Address */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                {categoryName}
                            </h3>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono [font-variant-numeric:tabular-nums] mt-0.5">
                            {ticketId} <span className="text-slate-300 dark:text-slate-700">·</span> {formattedDate}
                        </p>

                        <div className="flex items-center gap-2 mt-1 min-w-0">
                            <ReportStatusPill status={report.status} />
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 min-w-0">
                                {displayAddress}
                            </span>
                        </div>
                    </div>

                    {/* Right: Chevron */}
                    <div className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <ChevronDown
                            size={20}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#ff6b00]' : ''}`}
                            aria-hidden="true"
                        />
                    </div>
                </div>

                {/* Expanded Section */}
                <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                >
                    <div className="overflow-hidden">
                        <div className="px-3 pb-3 pt-1 border-t border-slate-200/70 dark:border-slate-800/80 space-y-3.5">
                            <div className="flex items-start gap-2 pt-1">
                                <MapPin size={15} className="text-[#ff6b00] shrink-0 mt-0.5" aria-hidden="true" />
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                                    {displayAddress}
                                </p>
                            </div>

                            <div className="space-y-1.5" aria-label={`Progress: Step ${stepNumber} of ${totalSteps}, ${currentStepLabel}`}>
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-slate-900 dark:text-white">
                                        Step {stepNumber} of {totalSteps}
                                    </span>
                                    <span className={isResolved ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[#ff6b00] dark:text-[#ff6b00] font-bold'}>
                                        {currentStepLabel}
                                    </span>
                                </div>

                                <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                                        const isDone = idx < safeStepIdx;
                                        const isCurrent = idx === safeStepIdx;

                                        let segmentColor = 'bg-slate-200 dark:bg-slate-800';
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

                            <div className="grid grid-cols-2 gap-2.5 pt-1">
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

            {/* ============================================================ */}
            {/* DESKTOP (>= 1024px) TARGET DESIGN LAYOUT                      */}
            {/* ============================================================ */}
            <article
                className={`hidden lg:block w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] hover:border-slate-300 dark:hover:border-slate-700 transition-[border-color,box-shadow] duration-150 shadow-2xs ${className}`}
            >
                {/* Collapsed Card Header Row (Click anywhere toggles card) */}
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
                    className="w-full p-5 flex items-center gap-4 text-left cursor-pointer select-none outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] rounded-xl transition-colors"
                >
                    {/* Thumbnail: 56px rounded square on the left */}
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
                        className="w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 shadow-2xs group/thumb focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                    >
                        {imageUrl && !imgLoadFailed ? (
                            <img
                                src={imageUrl}
                                alt=""
                                onError={() => setImgLoadFailed(true)}
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60">
                                <FallbackIcon size={22} strokeWidth={1.75} />
                            </div>
                        )}
                    </div>

                    {/* Middle: Category, Subline (ID · Date), Wrapped Address */}
                    <div className="min-w-0 flex-1 pr-2">
                        <h3 className="font-heading font-bold text-[17px] text-slate-900 dark:text-white leading-tight">
                            {categoryName}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono [font-variant-numeric:tabular-nums] mt-1">
                            {ticketId} <span className="text-slate-300 dark:text-slate-700 mx-1">·</span> {formattedDate}
                        </p>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                            {displayAddress}
                        </p>
                    </div>

                    {/* Right: Status Pill & Small Chevron Button */}
                    <div className="flex items-center gap-3 shrink-0">
                        <ReportStatusPill status={report.status} variant="desktop" />
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                            <ChevronDown
                                size={18}
                                strokeWidth={2.25}
                                className={`transition-transform duration-150 ${isExpanded ? 'rotate-180 text-[#ff6b00]' : ''}`}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                </div>

                {/* Expanded Section (Smooth 150ms accordion transition) */}
                <div
                    className={`grid transition-[grid-template-rows] duration-150 ease-out ${
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                >
                    <div className="overflow-hidden">
                        <div className="px-5 pb-5 pt-0 space-y-3">
                            {/* Status Message Strip */}
                            <div className={`p-4 rounded-xl border ${statusStrip.stripClass}`}>
                                <h4 className="text-sm font-bold leading-snug">
                                    {statusStrip.title}
                                </h4>
                                <p className={`text-xs mt-0.5 leading-relaxed ${statusStrip.subClass}`}>
                                    {statusStrip.subtitle}
                                </p>
                            </div>

                            {/* Footer Row: Updated date on left, action buttons on right */}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Updated {formattedUpdatedDate}
                                </span>

                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenMap?.(report);
                                        }}
                                        className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98]"
                                    >
                                        View on Map
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenDetails?.(report);
                                        }}
                                        className="h-10 px-4 rounded-lg bg-[#ff6b00] hover:bg-[#e66000] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98]"
                                    >
                                        <span>View Report</span>
                                        <span aria-hidden="true">&rarr;</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
}

export default function ReportHistoryCard(props) {
    return props.report ? <ReportHistoryCardContent {...props}/> : null;
}
