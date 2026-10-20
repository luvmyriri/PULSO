import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft,
    Copy,
    Check,
    MapPin,
    Maximize2,
    ChevronDown,
    Trash2,
    RotateCcw,
    AlertTriangle,
    X,
    FileText
} from 'lucide-react';
import ReportStatusPill from './ReportStatusPill';
import { REPORT_WORKFLOW_STEPS, getReportWorkflowIndex } from '../utils/reportWorkflow';
import { cleanResidentAddress } from './ReportHistoryCard';
import { API_BASE_URL } from '../utils/apiBase';

/**
 * ReportDetailView
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned full-screen Report Details layout matching Problem 3:
 * - Header row: 48px round back button, 20px bold tracking number, soft gray subline
 *   "[Date] · Submitted", 48px outlined "Copy" button with "Copied" alert.
 * - Photo: Large 4:3 rounded photo with top-left status pill, 48px round expand button
 *   at bottom-right opening fullscreen modal with pinch/zoom & close button.
 * - Progress Card: "Progress" / "Step X of 5", 5-step joined circles matching
 *   dashboard's LatestReportCard (filled orange w/ check for done, orange ring w/ dot
 *   for current, soft gray for upcoming, labels max 2 lines).
 * - Location Card (inset card): 40px pin tile, 14px bold address + soft gray subline,
 *   48px Map button (no Plus Codes or coordinates).
 * - "What was reported" card: 14px description with 1.5 line height, 4-line clamp,
 *   "Show more" / "Show less" toggle, full text always in sr-only.
 * - Staff update timeline / notes (if present) in matching card style.
 * - Bottom action: Full-width outlined danger button "Withdraw report" (trash/undo icon)
 *   shown only when retracting is allowed. Tapping opens role="alertdialog" modal
 *   "Withdraw this report?" with "Keep report" and "Withdraw" buttons.
 */
export default function ReportDetailView({
    report,
    onBack,
    onOpenMap,
    onWithdrawReport,
    setZoomedImage
}) {
    const [isCopied, setIsCopied] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [imgLoadFailed, setImgLoadFailed] = useState(false);

    const containerRef = useRef(null);

    // Default to top whenever Report Details is opened or a new report is loaded
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
            // Also reset scroll on closest scrollable parent (phone simulator or dashboard container)
            let parent = containerRef.current.parentElement;
            while (parent) {
                if (parent.scrollTop > 0) {
                    parent.scrollTop = 0;
                }
                parent = parent.parentElement;
            }
        }
    }, [report?.id, report?.ticket_id]);

    if (!report) return null;

    const ticketId = report.ticket_id || `PUL-2026-${String(report.id || '').padStart(4, '0')}`;
    const categoryName = report.category || report.ai_category || 'Civic Infrastructure';

    // Format date: "Oct 16, 2026"
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
    const barangaySubline = report.barangay
        ? (report.barangay.toLowerCase().startsWith('barangay') || report.barangay.toLowerCase().startsWith('brgy')
            ? `${report.barangay}, Caloocan City`
            : `Barangay ${report.barangay}, Caloocan City`)
        : 'Caloocan City';

    // Image URL resolution: match ResidentDashboard pattern `${API_BASE_URL}${report.image_url}`
    const rawImageUrl = report.image_url || report.photo_url || null;
    const imageUrl = rawImageUrl
        ? (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://') || rawImageUrl.startsWith('data:')
            ? rawImageUrl
            : `${API_BASE_URL}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`)
        : null;

    // Progress Workflow calculation
    const rawStatus = (report.status || '').toLowerCase().trim();
    const isResolved = ['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(rawStatus) || rawStatus.includes('resolv');
    const stepIdx = getReportWorkflowIndex(report.status);
    const currentStepIndex = stepIdx >= 0 ? stepIdx : 0;
    const stepNumber = currentStepIndex + 1;
    const totalSteps = REPORT_WORKFLOW_STEPS.length; // 5

    // Retract / Withdraw availability (Pending / Unverified only)
    const canWithdraw = ['pending', 'unverified', 'received'].includes(rawStatus) || rawStatus.startsWith('pend');

    // Description text
    const descriptionText = report.description || report.notes || 'No additional details provided with this report.';

    // Copy Ticket ID
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(ticketId);
            setIsCopied(true);
            setAnnouncement(`Copied tracking number ${ticketId} to clipboard.`);
            setTimeout(() => setIsCopied(false), 2200);
        } catch {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2200);
        }
    };

    // Full photo zoom trigger
    const handlePhotoExpand = () => {
        if (setZoomedImage && imageUrl) {
            setZoomedImage(imageUrl);
        } else {
            setIsPhotoModalOpen(true);
        }
        setAnnouncement('Opened photo full screen.');
    };

    return (
        <div ref={containerRef} className="w-full bg-slate-50/50 dark:bg-[#070d1a] text-slate-900 dark:text-slate-100 pb-4 select-none">
            {/* Screen Reader Live Region for Announcements */}
            <div className="sr-only" role="status" aria-live="polite">
                {announcement}
            </div>

            {/* ── Fixed Header Row ── */}
            <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                    {/* Left: 3rem (48px) Round Back Button */}
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to report history"
                        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} className="mr-0.5" />
                    </button>

                    {/* Middle: 20px bold tracking number + "[Date] · Submitted" */}
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                        <h1 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight [font-variant-numeric:tabular-nums] leading-tight truncate">
                            {ticketId}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                            {formattedDate} · Submitted
                        </p>
                    </div>

                    {/* Right: 48px tall Outlined "Copy" button */}
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label={`Copy tracking number ${ticketId}`}
                        className={`min-h-[48px] px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98] ${
                            isCopied
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        {isCopied ? (
                            <>
                                <Check size={16} strokeWidth={2.5} />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={16} strokeWidth={2} />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* ── Main Scrollable Body ── */}
            <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 space-y-3 pb-2">
                {/* ── 1. PHOTO CARD (Real photo ratio 4:3 / 16:9 / 1:1, Status Pill top-left, 48px Expand button bottom-right) ── */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm max-h-[260px] sm:max-h-[320px] flex items-center justify-center">
                    {imageUrl && !imgLoadFailed ? (
                        <img
                            src={imageUrl}
                            alt={`${categoryName} photo proof`}
                            onError={() => setImgLoadFailed(true)}
                            className="w-full h-auto max-h-[260px] sm:max-h-[320px] object-contain"
                        />
                    ) : (
                        <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 p-6 text-center">
                            <FileText size={40} strokeWidth={1.5} className="mb-2 text-slate-400" />
                            <p className="text-sm font-semibold">{categoryName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">No photo attached to this report</p>
                        </div>
                    )}

                    {/* Top-Left: Status Pill */}
                    <div className="absolute top-3 left-3 z-10">
                        <ReportStatusPill status={report.status} className="shadow-md backdrop-blur-md" />
                    </div>

                    {/* Bottom-Right: 3rem (48px) Round Expand Button */}
                    {imageUrl && (
                        <button
                            type="button"
                            onClick={handlePhotoExpand}
                            aria-label="Expand photo to full screen"
                            className="absolute bottom-3 right-3 z-10 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                        >
                            <Maximize2 size={20} strokeWidth={2.25} />
                        </button>
                    )}
                </div>

                {/* ── 2. PROGRESS CARD (5 Steps joined by lines) ── */}
                <section
                    aria-label="Progress status"
                    className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                            Progress
                        </h2>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            Step {stepNumber} of {totalSteps}
                        </span>
                    </div>

                    {/* 5-Step Connected Timeline */}
                    <ol className="flex items-start justify-between w-full relative pt-1 pb-1">
                        {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                            const isDone = idx < currentStepIndex || (isResolved && idx <= totalSteps - 1);
                            const isCurrent = idx === currentStepIndex && !isResolved;
                            const isUpcoming = idx > currentStepIndex && !isResolved;

                            return (
                                <li
                                    key={step.id}
                                    className="flex-1 flex flex-col items-center relative text-center min-w-0"
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    {/* Thin connecting line segment behind dots */}
                                    {idx < totalSteps - 1 && (
                                        <div
                                            className="absolute top-[14px] left-1/2 w-full h-[2px] pointer-events-none z-0"
                                            aria-hidden="true"
                                        >
                                            <div
                                                className={`h-full transition-colors duration-200 ${
                                                    idx < currentStepIndex || isResolved
                                                        ? (isResolved ? 'bg-emerald-500' : 'bg-[#ff6b00]')
                                                        : 'bg-slate-200 dark:bg-slate-700/80'
                                                }`}
                                            />
                                        </div>
                                    )}

                                    {/* Dot Node */}
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform ${
                                            isDone
                                                ? (isResolved ? 'bg-emerald-500 text-white' : 'bg-[#ff6b00] text-white')
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

                                    {/* Step Label (max 2 lines) */}
                                    <span
                                        className={`w-full text-center mt-2 px-0.5 leading-tight text-[11px] sm:text-xs line-clamp-2 break-words ${
                                            isDone
                                                ? 'font-semibold text-slate-900 dark:text-white'
                                                : isCurrent
                                                ? 'font-bold text-[#B83A00] dark:text-[#ff6b00]'
                                                : 'font-medium text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </section>

                {/* ── 3. LOCATION CARD (Inset card with Pin tile, readable address, 48px Map button) ── */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenMap?.(report)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenMap?.(report);
                        }
                    }}
                    aria-label={`Incident location: ${displayAddress}. Open in map.`}
                    className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                >
                    {/* Left: 40px rounded square tile with orange pin */}
                    <div className="w-10 h-10 rounded-xl bg-orange-500/12 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                        <MapPin size={20} className="text-[#ff6b00]" />
                    </div>

                    {/* Middle: Readable Address 14px bold + soft gray second line (no Plus Codes or coordinates, fully wrapped) */}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                            {displayAddress}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal break-words">
                            {barangaySubline}
                        </p>
                    </div>

                    {/* Right: 48px tall Map button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenMap?.(report);
                        }}
                        aria-label="View on municipal map"
                        className="h-12 min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                    >
                        Map
                    </button>
                </div>

                {/* ── 4. WHAT WAS REPORTED CARD (4-line clamp, Show more / Show less toggle) ── */}
                <section
                    aria-label="What was reported"
                    className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-2"
                >
                    <h2 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        What was reported
                    </h2>

                    {/* Full text always accessible to screen readers */}
                    <div className="sr-only">
                        {descriptionText}
                    </div>

                    {/* Visual description with 4-line clamp toggle */}
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        <p className={isDescExpanded ? 'break-words' : 'line-clamp-4 break-words'}>
                            {descriptionText}
                        </p>

                        {descriptionText.length > 140 && (
                            <button
                                type="button"
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                className="mt-2 text-xs font-bold text-[#ff6b00] hover:underline cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded"
                            >
                                <span>{isDescExpanded ? 'Show less' : 'Show more'}</span>
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-150 ${isDescExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>
                        )}
                    </div>
                </section>

                {/* ── 5. STAFF UPDATE TIMELINE / RESIDENT NOTES (Preserve if present) ── */}
                {((report.updates && report.updates.length > 0) || report.resolution_notes || report.staff_notes) && (
                    <section
                        aria-label="Staff updates and timeline"
                        className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3"
                    >
                        <h2 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                            Staff updates
                        </h2>
                        {report.resolution_notes && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                                <span className="font-bold block mb-1">Resolution Summary:</span>
                                {report.resolution_notes}
                            </div>
                        )}
                        {report.staff_notes && !report.resolution_notes && (
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                {report.staff_notes}
                            </div>
                        )}
                    </section>
                )}

                {/* ── 6. BOTTOM ACTION: Full-Width Outlined Danger "Withdraw report" ── */}
                {canWithdraw && (
                    <div className="pt-1 pb-1">
                        <button
                            type="button"
                            onClick={() => setIsWithdrawModalOpen(true)}
                            aria-label={`Withdraw report ${ticketId}`}
                            className="w-full h-12 min-h-[48px] rounded-xl border border-rose-300 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-rose-500 active:scale-[0.99]"
                        >
                            <Trash2 size={16} strokeWidth={2.25} />
                            <span>Withdraw report</span>
                        </button>
                    </div>
                )}
            </main>

            {/* ── Retract / Withdraw Confirmation Alert Dialog (Traps Focus, role="alertdialog") ── */}
            {isWithdrawModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="withdraw-dialog-title"
                    aria-describedby="withdraw-dialog-desc"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsWithdrawModalOpen(false);
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    >
                        {/* Danger Icon Badge */}
                        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
                            <AlertTriangle size={28} strokeWidth={2} />
                        </div>

                        {/* Title & Description */}
                        <div>
                            <h3 id="withdraw-dialog-title" className="font-heading font-extrabold text-lg text-slate-900 dark:text-white">
                                Withdraw this report?
                            </h3>
                            <p id="withdraw-dialog-desc" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Are you sure you want to withdraw <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ticketId}</span>? This will cancel city engineering inspection for this issue.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setIsWithdrawModalOpen(false)}
                                className="h-12 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                Keep report
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsWithdrawModalOpen(false);
                                    onWithdrawReport?.(report);
                                }}
                                className="h-12 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Standalone Photo Zoom Modal (if setZoomedImage not provided) ── */}
            {isPhotoModalOpen && imageUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full size photo proof"
                    onClick={() => setIsPhotoModalOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(false)}
                        aria-label="Close photo preview"
                        className="absolute top-4 right-4 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={imageUrl}
                        alt={`${categoryName} full view`}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
