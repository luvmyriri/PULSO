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
    FileText,
    Clock,
    CheckCircle2,
    Wrench,
    XCircle,
    HelpCircle,
    ArrowLeft,
    ExternalLink,
    Phone
} from 'lucide-react';
import ReportStatusPill from './ReportStatusPill';
import { REPORT_WORKFLOW_STEPS, getReportWorkflowIndex } from '../utils/reportWorkflow';
import { cleanResidentAddress } from './ReportHistoryCard';
import { API_BASE_URL } from '../utils/apiBase';

/**
 * ReportDetailView
 * -----------------------------------------------------------------------------
 * Responsive component:
 * - Mobile & Tablet (< 1024px): 100% UNTOUCHED mobile experience.
 * - Desktop (>= 1024px): Target desktop design layout (Breadcrumb, Category title,
 *   Copy Report ID button, full-width status banner with department feedback,
 *   two-column split with photo preview + switcher, "What was reported",
 *   real activity timeline, "Incident location", and "Need clarification?").
 */
export default function ReportDetailView({
    report,
    onBack,
    onOpenMap,
    onWithdrawReport,
    setZoomedImage
}) {
    if (!report) return null;

    const [isCopied, setIsCopied] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [imgLoadFailed, setImgLoadFailed] = useState(false);
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);

    const containerRef = useRef(null);

    // Default to top whenever Report Details is opened or a new report is loaded
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
            let parent = containerRef.current.parentElement;
            while (parent) {
                if (parent.scrollTop > 0) {
                    parent.scrollTop = 0;
                }
                parent = parent.parentElement;
            }
        }
    }, [report?.id, report?.ticket_id]);

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

    const formattedFullDate = report.created_at
        ? new Date(report.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : formattedDate;

    const formattedDateTime = report.created_at
        ? new Date(report.created_at).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
        : formattedDate;

    // Clean address (no plus codes or raw GPS)
    const rawAddress = report.location_string || report.address || report.barangay || 'Caloocan City';
    const displayAddress = cleanResidentAddress(rawAddress) || report.barangay || 'Caloocan City';
    const barangaySubline = report.barangay
        ? (report.barangay.toLowerCase().startsWith('barangay') || report.barangay.toLowerCase().startsWith('brgy')
            ? `${report.barangay}, Caloocan City`
            : `Barangay ${report.barangay}, Caloocan City`)
        : 'Caloocan City';

    // Photos list (handles primary and resolution proof)
    const rawImageUrl = report.image_url || report.photo_url || null;
    const imageUrl = rawImageUrl
        ? (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://') || rawImageUrl.startsWith('data:')
            ? rawImageUrl
            : `${API_BASE_URL}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`)
        : null;

    const photos = [];
    if (imageUrl) photos.push({ id: 'primary', url: imageUrl, label: 'Submitted Photo' });
    if (report.resolution_image_url) {
        const rawResUrl = report.resolution_image_url;
        const resUrl = rawResUrl.startsWith('http://') || rawResUrl.startsWith('https://') || rawResUrl.startsWith('data:')
            ? rawResUrl
            : `${API_BASE_URL}${rawResUrl.startsWith('/') ? '' : '/'}${rawResUrl}`;
        photos.push({ id: 'resolution', url: resUrl, label: 'Resolution Proof' });
    }

    const currentPhotoUrl = photos[activePhotoIdx]?.url || imageUrl;

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

    // Department feedback note
    const departmentFeedback = report.resolution_notes || report.staff_notes || report.admin_feedback || null;

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
    const handlePhotoExpand = (targetUrl) => {
        const u = targetUrl || currentPhotoUrl;
        if (setZoomedImage && u) {
            setZoomedImage(u);
        } else {
            setIsPhotoModalOpen(true);
        }
        setAnnouncement('Opened photo full screen.');
    };

    // Status banner metadata for desktop
    const getDesktopStatusBanner = (statusStr) => {
        const s = (statusStr || '').toLowerCase().trim();
        if (['rejected', 'spam', 'invalid', 'declined'].includes(s) || s.includes('reject')) {
            return {
                title: 'This report was rejected',
                subtitle: "The department reviewed this report and marked it as rejected. See the department's note below for details.",
                bannerClass: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100',
                iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                Icon: XCircle
            };
        }
        if (['resolved', 'resolved fixed', 'completed', 'fixed', 'closed'].includes(s) || s.includes('resolv')) {
            return {
                title: 'This report has been resolved',
                subtitle: 'Work has been completed and verified by the City Engineering Department.',
                bannerClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100',
                iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                Icon: CheckCircle2
            };
        }
        if (['dispatched', 'in progress', 'ongoing', 'active', 'assigned', 'approved internal'].includes(s) || s.includes('progress') || s.includes('dispatch') || s.includes('assign')) {
            return {
                title: 'Field operations in progress',
                subtitle: 'Work orders have been dispatched and field teams are actively resolving this civic concern.',
                bannerClass: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50 text-sky-950 dark:text-sky-100',
                iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                Icon: Wrench
            };
        }
        if (['cancelled', 'canceled'].includes(s) || s.includes('cancel')) {
            return {
                title: 'This report was withdrawn',
                subtitle: 'The submission was retracted and will not proceed to field operations.',
                bannerClass: 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
                iconBg: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                Icon: RotateCcw
            };
        }
        return {
            title: 'Report received and awaiting review',
            subtitle: 'Your report is waiting for review. Department staff will verify the details shortly.',
            bannerClass: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-950 dark:text-orange-100',
            iconBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
            Icon: Clock
        };
    };

    const desktopBanner = getDesktopStatusBanner(report.status);
    const StatusBannerIcon = desktopBanner.Icon;

    return (
        <div ref={containerRef} className="w-full bg-slate-50/50 dark:bg-[#070d1a] text-slate-900 dark:text-slate-100 pb-4 select-none">
            {/* Screen Reader Live Region for Announcements */}
            <div className="sr-only" role="status" aria-live="polite">
                {announcement}
            </div>

            {/* ============================================================ */}
            {/* MOBILE & TABLET (< 1024px) VIEW - 100% UNTOUCHED             */}
            {/* ============================================================ */}
            <div className="lg:hidden">
                {/* Fixed Header Row */}
                <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label="Back to report history"
                            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                        >
                            <ChevronLeft size={22} strokeWidth={2.5} className="mr-0.5" />
                        </button>

                        <div className="min-w-0 flex-1 text-center sm:text-left">
                            <h1 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight [font-variant-numeric:tabular-nums] leading-tight truncate">
                                {ticketId}
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                                {formattedDate} · Submitted
                            </p>
                        </div>

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

                {/* Mobile Main Body */}
                <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 space-y-3 pb-2">
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

                        <div className="absolute top-3 left-3 z-10">
                            <ReportStatusPill status={report.status} className="shadow-md backdrop-blur-md" />
                        </div>

                        {imageUrl && (
                            <button
                                type="button"
                                onClick={() => handlePhotoExpand(imageUrl)}
                                aria-label="Expand photo to full screen"
                                className="absolute bottom-3 right-3 z-10 w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                            >
                                <Maximize2 size={20} strokeWidth={2.25} />
                            </button>
                        )}
                    </div>

                    <section
                        aria-label="Progress status"
                        className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                                Progress
                            </h2>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                Step {stepNumber} of {totalSteps}
                            </span>
                        </div>

                        <ol className="flex items-start justify-between w-full relative pt-1 pb-1">
                            {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                                const isDone = idx < currentStepIndex || (isResolved && idx <= totalSteps - 1);
                                const isCurrent = idx === currentStepIndex && !isResolved;

                                return (
                                    <li
                                        key={step.id}
                                        className="flex-1 flex flex-col items-center relative text-center min-w-0"
                                        aria-current={isCurrent ? 'step' : undefined}
                                    >
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
                        <div className="w-10 h-10 rounded-xl bg-orange-500/12 dark:bg-orange-500/15 flex items-center justify-center shrink-0">
                            <MapPin size={20} className="text-[#ff6b00]" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                                {displayAddress}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal break-words">
                                {barangaySubline}
                            </p>
                        </div>

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

                    <section
                        aria-label="What was reported"
                        className="w-full rounded-2xl bg-white dark:bg-[#0c1427] border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-2"
                    >
                        <h2 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                            What was reported
                        </h2>

                        <div className="sr-only">
                            {descriptionText}
                        </div>

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

                    {canWithdraw && (
                        <div className="pt-1 pb-1">
                            <button
                                type="button"
                                onClick={() => setIsWithdrawModalOpen(true)}
                                aria-label={`Withdraw report ${ticketId}`}
                                className="w-full h-12 min-h-[48px] rounded-xl border border-rose-300 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-rose-500 active:scale-[0.99]"
                            >
                                <Trash2 size={16} strokeWidth={2} />
                                <span>Withdraw report</span>
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* ============================================================ */}
            {/* DESKTOP (>= 1024px) TARGET DESIGN LAYOUT                      */}
            {/* ============================================================ */}
            <div className="hidden lg:block max-w-[1160px] mx-auto px-8 pt-4 pb-12">
                {/* 1. Breadcrumb Row */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold pb-3 text-slate-500 dark:text-slate-400">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded"
                    >
                        <ArrowLeft size={14} strokeWidth={2.5} />
                        <span>My Reports</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300 [font-variant-numeric:tabular-nums]">
                        {ticketId}
                    </span>
                </nav>

                {/* 2. Title Row */}
                <div className="flex items-start justify-between gap-6 pb-5">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {categoryName}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono [font-variant-numeric:tabular-nums] mt-1">
                            {ticketId} <span className="text-slate-300 dark:text-slate-700 mx-1.5">·</span> Submitted {formattedFullDate}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label={`Copy tracking number ${ticketId}`}
                        className={`h-10 min-h-[40px] px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98] ${
                            isCopied
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c1427] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {isCopied ? (
                            <>
                                <Check size={15} strokeWidth={2.5} />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={15} strokeWidth={2} />
                                <span>Copy Report ID</span>
                            </>
                        )}
                    </button>
                </div>

                {/* 3. Full-Width Status Banner */}
                <section
                    aria-label="Report status overview"
                    className={`w-full p-5 rounded-xl border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${desktopBanner.bannerClass}`}
                >
                    <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${desktopBanner.iconBg}`}>
                            <StatusBannerIcon size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold leading-tight">
                                {desktopBanner.title}
                            </h2>
                            <p className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90 max-w-2xl">
                                {desktopBanner.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Department Feedback Inset Card (if note exists) */}
                    {departmentFeedback && (
                        <div className="shrink-0 max-w-sm w-full md:w-auto p-3.5 rounded-xl bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white mb-1">
                                <FileText size={14} className="text-[#ff6b00]" />
                                <span>Department feedback</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {departmentFeedback}
                            </p>
                        </div>
                    )}
                </section>

                {/* 4. Two Columns Under Banner: 62% Left / 38% Right */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: ~62% (col-span-12 xl:col-span-7 2xl:col-span-8) */}
                    <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-6">
                        {/* a) Incident Photo Preview */}
                        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-5 shadow-2xs space-y-3">
                            <div className="relative w-full rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[460px] border border-slate-800/60 group">
                                {currentPhotoUrl && !imgLoadFailed ? (
                                    <img
                                        src={currentPhotoUrl}
                                        alt={`${categoryName} preview`}
                                        onError={() => setImgLoadFailed(true)}
                                        className="w-full h-auto max-h-[460px] object-contain cursor-pointer"
                                        onClick={() => handlePhotoExpand(currentPhotoUrl)}
                                    />
                                ) : (
                                    <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-slate-100 dark:bg-slate-900">
                                        <FileText size={48} strokeWidth={1.5} className="mb-2 text-slate-400" />
                                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">{categoryName}</p>
                                        <p className="text-xs text-slate-400 mt-1">No photo attached to this report</p>
                                    </div>
                                )}

                                {currentPhotoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => handlePhotoExpand(currentPhotoUrl)}
                                        aria-label="Expand image preview"
                                        className="absolute bottom-3 right-3 w-10 h-10 rounded-lg bg-slate-950/80 hover:bg-slate-950 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        <Maximize2 size={18} strokeWidth={2.25} />
                                    </button>
                                )}
                            </div>

                            {/* Multiple Photos Thumbnail Switcher (if primary + resolution photo exist) */}
                            {photos.length > 1 && (
                                <div className="flex items-center gap-2 pt-1">
                                    {photos.map((p, idx) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setActivePhotoIdx(idx)}
                                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                                activePhotoIdx === idx
                                                    ? 'border-[#ff6b00] ring-2 ring-[#ff6b00]/20'
                                                    : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* b) "What was reported" Card */}
                        <section
                            aria-label="What was reported"
                            className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xs space-y-4"
                        >
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                What was reported
                            </h2>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                                <div className="py-3 flex items-start justify-between gap-4 first:pt-0">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32 shrink-0">
                                        Category
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white text-right flex-1">
                                        {categoryName}
                                    </span>
                                </div>

                                <div className="py-3 flex items-start justify-between gap-4">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32 shrink-0">
                                        Description
                                    </span>
                                    <div className="text-right flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <p className={isDescExpanded ? 'break-words text-left' : 'line-clamp-8 break-words text-left'}>
                                            {descriptionText}
                                        </p>
                                        {descriptionText.length > 250 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                className="mt-2 text-xs font-bold text-[#ff6b00] hover:underline cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded"
                                            >
                                                <span>{isDescExpanded ? 'Show less' : 'Show more'}</span>
                                                <ChevronDown
                                                    size={14}
                                                    className={`transition-transform duration-150 ${isDescExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="py-3 flex items-start justify-between gap-4">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32 shrink-0">
                                        Date & Time
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 text-right flex-1 font-mono text-xs [font-variant-numeric:tabular-nums]">
                                        {formattedDateTime}
                                    </span>
                                </div>

                                <div className="py-3 flex items-start justify-between gap-4 last:pb-0">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-32 shrink-0">
                                        Reference ID
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white text-right flex-1 [font-variant-numeric:tabular-nums]">
                                        {ticketId}
                                    </span>
                                </div>
                            </div>
                        </section>

                        {/* c) "Report activity" Timeline */}
                        <section
                            aria-label="Report activity timeline"
                            className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-6 shadow-2xs space-y-4"
                        >
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Report activity
                            </h2>

                            <div className="space-y-6">
                                {/* Event 1: Submission */}
                                <div className="relative flex items-start gap-3.5">
                                    {/* Connecting vertical line to event 2 */}
                                    <div className="absolute left-[13px] top-7 bottom-[-24px] w-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none" aria-hidden="true" />

                                    <div className="relative z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-[#0c1427]">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            Report submitted
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 [font-variant-numeric:tabular-nums]">
                                            {formattedDateTime}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                            Incident registered with photo and location evidence.
                                        </p>
                                    </div>
                                </div>

                                {/* Event 2: Under Review */}
                                <div className="relative flex items-start gap-3.5">
                                    {/* Connecting vertical line to event 3 */}
                                    <div className="absolute left-[13px] top-7 bottom-[-24px] w-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none" aria-hidden="true" />

                                    <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-[#0c1427] ${
                                        currentStepIndex >= 1 || isResolved
                                            ? 'bg-emerald-500 text-white'
                                            : 'border-2 border-[#ff6b00] bg-white dark:bg-[#0c1427]'
                                    }`}>
                                        {currentStepIndex >= 1 || isResolved ? (
                                            <Check size={14} strokeWidth={3} />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            Department review & validation
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 [font-variant-numeric:tabular-nums]">
                                            {report.updated_at ? new Date(report.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending review'}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                            {currentStepIndex >= 1
                                                ? 'Evaluated and confirmed by City Engineering dispatcher.'
                                                : 'Awaiting triage and verification by city engineering team.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Event 3: Terminal State or In Progress */}
                                {isResolved ? (
                                    <div className="relative flex items-start gap-3.5">
                                        <div className="relative z-10 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-[#0c1427]">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                                                Resolved & verified
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 [font-variant-numeric:tabular-nums]">
                                                {report.updated_at ? new Date(report.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : formattedDate}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                Repair work completed and logged in municipal record.
                                            </p>
                                        </div>
                                    </div>
                                ) : rawStatus === 'rejected' ? (
                                    <div className="relative flex items-start gap-3.5">
                                        <div className="relative z-10 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-[#0c1427]">
                                            <X size={14} strokeWidth={3} />
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight">
                                                Report rejected
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 [font-variant-numeric:tabular-nums]">
                                                {report.updated_at ? new Date(report.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : formattedDate}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                {departmentFeedback || 'Report was reviewed and closed as out of scope or invalid.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex items-start gap-3.5">
                                        <div className="relative z-10 w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c1427] shrink-0 ring-4 ring-white dark:ring-[#0c1427]" />
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <p className="text-sm font-medium text-slate-400 dark:text-slate-500 leading-tight">
                                                Field inspection & work order dispatch
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                                                Scheduled upon engineering review completion.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: ~38% (col-span-12 xl:col-span-5 2xl:col-span-4) */}
                    <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-5">
                        {/* a) Incident Location Card */}
                        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-5 shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                <MapPin size={18} className="text-[#ff6b00]" />
                                <span>Incident location</span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                    {displayAddress}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                                    {barangaySubline}
                                </p>
                                {report.latitude && report.longitude && (
                                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 pt-1">
                                        {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => onOpenMap?.(report)}
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98]"
                            >
                                <span>View on Map</span>
                                <ExternalLink size={13} />
                            </button>
                        </div>

                        {/* b) Need Clarification? / Help Card */}
                        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0c1427] p-5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                <HelpCircle size={18} className="text-[#0284c7]" />
                                <span>Have questions about this report?</span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Contact the City Engineering Department help desk at <span className="font-semibold text-slate-800 dark:text-slate-200">(02) 8288-8811</span> or reach out via municipal hotlines.
                            </p>

                            <a
                                href="tel:0282888811"
                                className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] active:scale-[0.98]"
                            >
                                <Phone size={13} />
                                <span>Call Help Desk</span>
                            </a>
                        </div>

                        {/* c) Withdraw Report Option (If permitted) */}
                        {canWithdraw && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    aria-label={`Withdraw report ${ticketId}`}
                                    className="w-full h-10 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 active:scale-[0.99]"
                                >
                                    <Trash2 size={14} strokeWidth={2} />
                                    <span>Withdraw Report</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SHARED MODALS (Alert Dialog & Full Photo Zoom)               */}
            {/* ============================================================ */}
            {/* Withdraw Confirmation Modal */}
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
                        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
                            <AlertTriangle size={28} strokeWidth={2} />
                        </div>

                        <div>
                            <h3 id="withdraw-dialog-title" className="font-heading font-extrabold text-lg text-slate-900 dark:text-white">
                                Withdraw this report?
                            </h3>
                            <p id="withdraw-dialog-desc" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Are you sure you want to withdraw <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ticketId}</span>? This will cancel city engineering inspection for this issue.
                            </p>
                        </div>

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

            {/* Standalone Photo Zoom Modal */}
            {isPhotoModalOpen && currentPhotoUrl && (
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
                        src={currentPhotoUrl}
                        alt={`${categoryName} full view`}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
