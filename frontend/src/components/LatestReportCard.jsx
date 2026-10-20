import React, { useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import {
    REPORT_WORKFLOW_STEPS,
    getReportWorkflowIndex,
    getStatusDescriptor,
    formatTicketId
} from '../utils/reportWorkflow';

/**
 * Extracts a concise short address by dropping city ("Caloocan City"),
 * region ("Metro Manila"), country ("Philippines") and postal codes,
 * preserving neighborhood, street, zone, or landmark details.
 */
export function getShortIncidentAddress(report) {
    if (!report) return null;
    const raw = report.location_string || report.address || '';

    if (raw && typeof raw === 'string') {
        let cleaned = raw
            .replace(/\b(Philippines|Pilipinas|PH)\b/gi, '')
            .replace(/\b(Metro Manila|National Capital Region|NCR)\b/gi, '')
            .replace(/\b(Caloocan City|City of Caloocan|Caloocan)\b/gi, '')
            .replace(/\b(14\d{2})\b/g, '')
            .replace(/\s*,\s*/g, ', ')
            .replace(/,\s*,+/g, ',')
            .replace(/^[\s,]+|[\s,]+$/g, '')
            .trim();

        // Check if string was only coordinate numbers
        if (/^Lat:?\s*[\d.]+/i.test(cleaned) || /^[\d.]+,\s*[\d.]+$/.test(cleaned)) {
            cleaned = '';
        }

        if (cleaned.length > 0) {
            return cleaned;
        }
    }

    if (report.barangay) {
        return `Barangay ${String(report.barangay).replace(/^Barangay\s*/i, '')}`;
    }

    if (report.lat && report.lng) {
        return `GPS (${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)})`;
    }

    return null;
}

/**
 * Returns full address for tooltip / detail display.
 */
export function getFullIncidentAddress(report) {
    if (!report) return '';
    if (report.location_string && report.location_string.trim()) {
        return report.location_string.trim();
    }
    if (report.address && report.address.trim()) {
        return report.address.trim();
    }
    if (report.barangay) {
        return `Barangay ${report.barangay}, Caloocan City`;
    }
    if (report.lat && report.lng) {
        return `Coordinates: ${Number(report.lat).toFixed(5)}, ${Number(report.lng).toFixed(5)}`;
    }
    return '';
}

/**
 * Canonical 5 Status Badge Labels
 */
export function getCanonicalBadgeLabel(rawStatus) {
    const idx = getReportWorkflowIndex(rawStatus);
    if (idx >= 0 && idx < REPORT_WORKFLOW_STEPS.length) {
        return REPORT_WORKFLOW_STEPS[idx].label;
    }
    // Fallback to normalized descriptor label
    const desc = getStatusDescriptor(rawStatus);
    return desc?.label || 'Received';
}

/**
 * LatestReportCard Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned resident mobile "Latest Report" card matching Civic Aperture.
 * Reusable across Resident Home, My Reports, and /dev/app-preview showcase.
 *
 * Requirements:
 * 1. Solid PULSO orange pill badge at top-right with high-contrast white text
 *    passing 4.5:1+ contrast on orange in both light and dark modes.
 * 2. Small "LATEST REPORT" label above tracking number (#PUL-YYYY-XXXX).
 * 3. 5-step evenly spaced progress tracker:
 *    - Done: solid orange circle with white checkmark, semibold text.
 *    - Current: orange ring with inner dot, bold orange text (#B83A00 light, #ff6b00 dark).
 *    - Upcoming: soft gray outline circle, readable gray label (#5B6B88 light, #9AA8C7 dark).
 *    - Thin connecting line: orange up into current step, soft gray after.
 * 4. Inset Location Card:
 *    - Rounded border card with orange pin tile (w-10 h-10).
 *    - Label "INCIDENT LOCATION", short address max 2 lines with ellipsis.
 *    - Tap/long-press tooltip for full address.
 *    - Compact "Map" button (min 48px tap target, min 72px width).
 *    - Hidden cleanly if no location data exists.
 */
export default function LatestReportCard({
    report,
    onOpenReport,
    onOpenMap,
    showLatestLabel = true,
    headerLabel = 'LATEST REPORT',
    className = '',
    children
}) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!report) return null;

    const ticketId = formatTicketId(report.ticket_id || report.id);
    const currentStepIndex = getReportWorkflowIndex(report.status);
    const badgeText = getCanonicalBadgeLabel(report.status);
    const shortAddress = getShortIncidentAddress(report);
    const fullAddress = getFullIncidentAddress(report);
    const displayAddress = fullAddress || shortAddress || report.location_string || report.address || '';

    const handleCardClick = () => {
        if (onOpenReport) {
            onOpenReport(report);
        }
    };

    const handleCardKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    const handleLocationClick = (e) => {
        e.stopPropagation();
        if (onOpenMap) {
            onOpenMap(report);
        }
    };

    const handleMapButtonClick = (e) => {
        e.stopPropagation();
        if (onOpenMap) {
            onOpenMap(report);
        }
    };

    const toggleTooltip = (e) => {
        e.stopPropagation();
        setShowTooltip((prev) => !prev);
    };

    const accessibleLabel = `${headerLabel || 'Report'} ${ticketId}: status ${badgeText}${
        shortAddress ? `, incident location ${shortAddress}` : ''
    }. Click to view full report details.`;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={accessibleLabel}
            className={`w-full rounded-[1.25rem] bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none outline-none focus-visible:ring-3 focus-visible:ring-[#ff6b00] space-y-5 sm:space-y-6 ${className}`}
        >
            {/* ── 1. HEADER: Small Label, Ticket Number & Solid Orange Status Badge ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {showLatestLabel && (
                        <span className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 leading-tight">
                            {headerLabel}
                        </span>
                    )}
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight [font-variant-numeric:tabular-nums] leading-tight break-all xs:break-normal">
                        {ticketId}
                    </h3>
                </div>

                {/* Status Pill Badge - Plain Glassmorphism matching Civic Aperture */}
                <div
                    className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white font-bold text-xs sm:text-sm shrink-0 shadow-2xs whitespace-nowrap"
                    aria-label={`Status: ${badgeText}`}
                >
                    <span>{badgeText}</span>
                </div>
            </div>

            {/* ── 2. PROGRESS STEPS ROW: 5 Evenly Spaced Dots with Continuous Line ── */}
            <div className="w-full pt-1 pb-1">
                <ol
                    className="flex items-start justify-between w-full relative"
                    aria-label="Report progress steps"
                >
                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                        const isDone = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const isUpcoming = idx > currentStepIndex;

                        return (
                            <li
                                key={step.id}
                                className="flex-1 flex flex-col items-center relative text-center min-w-0"
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {/* Thin connecting line segment leading to next step (behind dots) */}
                                {idx < REPORT_WORKFLOW_STEPS.length - 1 && (
                                    <div
                                        className="absolute top-[13px] sm:top-[15px] left-1/2 w-full h-[2px] pointer-events-none z-0"
                                        aria-hidden="true"
                                    >
                                        <div
                                            className={`h-full transition-colors duration-300 ${
                                                idx < currentStepIndex
                                                    ? 'bg-[#ff6b00]'
                                                    : 'bg-slate-200 dark:bg-slate-700/80'
                                            }`}
                                        />
                                    </div>
                                )}

                                {/* Dot Node */}
                                <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform ${
                                        isDone
                                            ? 'bg-[#ff6b00] text-white shadow-2xs'
                                            : isCurrent
                                            ? 'border-2 border-[#ff6b00] bg-white dark:bg-[#0c1427]'
                                            : 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c1427]'
                                    }`}
                                >
                                    {isDone && (
                                        <Check size={14} strokeWidth={3} className="text-white" />
                                    )}
                                    {isCurrent && (
                                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#ff6b00]" />
                                    )}
                                </div>

                                {/* Step Label */}
                                <span
                                    className={`w-full text-center mt-2 px-0.5 leading-tight text-[11px] sm:text-xs break-words ${
                                        isDone
                                            ? 'font-semibold text-slate-900 dark:text-white'
                                            : isCurrent
                                            ? 'font-bold text-[#B83A00] dark:text-[#ff6b00]'
                                            : 'font-medium text-[#5B6B88] dark:text-[#9AA8C7]'
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>

            {/* ── 3. INSET LOCATION CARD (Hidden cleanly if no location data exists) ── */}
            {displayAddress && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={handleLocationClick}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLocationClick(e);
                        }
                    }}
                    title={displayAddress}
                    aria-label={`Incident location: ${displayAddress}. Click to open on map.`}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#11192e] p-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-slate-200/50 dark:hover:bg-[#151f38] relative"
                >
                    {/* Left: 2.5rem (40px) rounded square tile with 20px orange pin icon */}
                    <div className="w-10 h-10 rounded-xl bg-orange-500/12 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                        <MapPin size={20} className="text-[#ff6b00]" />
                    </div>

                    {/* Middle: INCIDENT LOCATION label and fully readable address without truncation */}
                    <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5 leading-none">
                            INCIDENT LOCATION
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug break-words">
                            {fullAddress || shortAddress || report.location_string || report.address || 'Caloocan City'}
                        </p>
                    </div>

                    {/* Right: Compact "Map" button (min 48px tap target, min 72px width) */}
                    <button
                        type="button"
                        onClick={handleMapButtonClick}
                        aria-label="Open municipal map"
                        className="min-h-[48px] min-w-[72px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-200/60 dark:hover:bg-slate-800/90 active:scale-[0.98] font-semibold text-sm text-slate-800 dark:text-slate-200 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                    >
                        Map
                    </button>
                </div>
            )}

            {/* Optional expandable details or extra actions */}
            {children && (
                <div onClick={(e) => e.stopPropagation()} className="pt-2">
                    {children}
                </div>
            )}
        </div>
    );
}
