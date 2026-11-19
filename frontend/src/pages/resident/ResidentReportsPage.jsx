import React, { useState, useEffect, useRef, useMemo } from 'react';
import { isNativeAndroid } from "../../utils/appContext";
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BarChart2, Building2, XCircle, Paperclip, ArrowUpDown, Settings, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, X, MapPin, Search, BookOpen, Image as ImageIcon, Plus, Download, Clock, Info, ArrowRight, Droplets, Zap, FileText, AlertTriangle, Eye, Shield, Check, Maximize2, Calendar, Lightbulb, Wrench, RotateCcw, CameraOff, Copy, Link2, Layers, Trash2, Signpost, Waves, List } from 'lucide-react';
import { getStatusDescriptor, getReportWorkflowIndex, REPORT_WORKFLOW_STEPS } from "../../utils/reportWorkflow";
import { getReportPhotoUrl, resolveReportMediaUrl } from "../../utils/reportMedia";
import ReportEvidenceImage from "../../components/ReportEvidenceImage";
import { parseAddressString, formatFullAddress } from "../../utils/locationPrivacy";
import RoadIcon from './RoadIcon';
import { isLocalDevHost, exportReportsToXLSX } from './residentUtils';

const StatusBadge = ({ status }) => {
    const descriptor = getStatusDescriptor(status);
    const StatusIcon = descriptor.icon;
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider bg-white/60 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-xs shrink-0 whitespace-nowrap">
            <StatusIcon size={11} aria-hidden="true" className="shrink-0 text-black dark:text-white" />
            <span>{descriptor.label}</span>
        </span>
    );
};

// Helper: compute days between two dates
const daysBetween = (d1, d2) => Math.round(Math.abs((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)));

// Helper: Sanitize & filter generic descriptions
const sanitizeDescription = (text) => {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Ignore generic placeholders
    if (
        lower === 'citizen report from pulso app.' ||
        lower === 'citizen report from pulso app' ||
        lower === 'citizen report.' ||
        lower === 'citizen report' ||
        lower === 'citizen report from pulso.' ||
        lower === 'n/a' ||
        lower === 'none' ||
        lower === 'no description' ||
        lower.length === 0
    ) {
        return null;
    }

    // Capitalize first character
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

// ── Mini Pulseline Progress Tracker ───────────────────────────────────────────
const MiniProgressTracker = ({ status, resolutionDays, orientation = 'responsive' }) => {
    const isRejected = status === 'rejected';
    const isCancelled = status === 'cancelled';
    const isResolved = status === 'resolved';
    const currentStepIndex = getReportWorkflowIndex(status);
    const statusDescriptor = getStatusDescriptor(status);

    if (isRejected) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/30 px-3.5 py-2.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50">
                <AlertTriangle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Verification not accepted — issue details did not meet municipal triage criteria.</span>
            </div>
        );
    }

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <RotateCcw size={15} className="shrink-0 text-slate-500" />
                <span>Report retracted by resident. Scheduled inspection was cancelled.</span>
            </div>
        );
    }

    if (currentStepIndex < 0) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Info size={15} className="shrink-0 text-slate-500" />
                <span>Status: {statusDescriptor.label}. Workflow position is awaiting reconciliation.</span>
            </div>
        );
    }

    return (
        <div
            className="w-full bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs"
            role="region"
            aria-label={`Report progress: step ${currentStepIndex + 1} of ${REPORT_WORKFLOW_STEPS.length}, currently ${statusDescriptor.label}`}
        >
            {/* Header Stage Notice */}
            <div className="flex items-center justify-between text-[11px] mb-3 px-1">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse ring-2 ring-orange-500/20 shrink-0" />
                    <span className="uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 font-mono">Progress:</span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold text-xs sm:text-[13px]">
                        {statusDescriptor.label}
                        {statusDescriptor.key === 'resolved' && resolutionDays !== null ? ` — ${resolutionDays}d` : ''}
                    </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800/80 font-bold inline-block">
                    Step {currentStepIndex + 1} of {REPORT_WORKFLOW_STEPS.length}
                </span>
            </div>

            {/* Canonical horizontal Pulseline tracker (Mobile / Stacked View) */}
            {(orientation === 'horizontal' || orientation === 'responsive') && (
                <div
                    className={`items-start w-full px-1 pt-1 pb-1 ${orientation === 'responsive' ? 'flex lg:hidden' : 'flex'}`}
                    role="list"
                    aria-label="Workflow progress steps"
                >
                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex || (isResolved && idx <= REPORT_WORKFLOW_STEPS.length - 1);
                        const isCurrent = idx === currentStepIndex && !isResolved;
                        return (
                            <React.Fragment key={step.id}>
                                <div
                                    className="flex flex-col items-center shrink-0"
                                    role="listitem"
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all aspect-square ${
                                            isCompleted
                                                ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-500/20'
                                                : isCurrent
                                                    ? 'bg-white dark:bg-slate-900 border-2 border-orange-500 text-orange-500 ring-4 ring-orange-500/20 shadow-xs'
                                                    : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-transparent'
                                        }`}
                                    >
                                        {isCompleted ? (
                                            <Check size={12} strokeWidth={3} />
                                        ) : isCurrent ? (
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-[9px] sm:text-[11px] mt-1.5 text-center leading-tight truncate max-w-[62px] sm:max-w-none transition-colors ${
                                            isCompleted
                                                ? 'text-slate-800 dark:text-slate-200 font-bold'
                                                : isCurrent
                                                    ? 'text-orange-600 dark:text-orange-400 font-extrabold'
                                                    : 'text-slate-400 dark:text-slate-500 font-medium'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>

                                {/* Connector line segment between steps */}
                                {idx < REPORT_WORKFLOW_STEPS.length - 1 && (
                                    <div className="flex-1 mt-[12px] sm:mt-[13px] mx-1 h-[3px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Vertical Pulseline tracker (Desktop beside photo) */}
            {(orientation === 'vertical' || orientation === 'responsive') && (
                <div
                    className={`flex-col w-full px-1 pt-1 pb-0.5 ${orientation === 'responsive' ? 'hidden lg:flex' : 'flex'}`}
                    role="list"
                    aria-label="Workflow progress steps"
                >
                    {REPORT_WORKFLOW_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex || (isResolved && idx <= REPORT_WORKFLOW_STEPS.length - 1);
                        const isCurrent = idx === currentStepIndex && !isResolved;
                        const isLast = idx === REPORT_WORKFLOW_STEPS.length - 1;

                        return (
                            <div
                                key={step.id}
                                className="flex items-start gap-3 relative"
                                role="listitem"
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                <div className="flex flex-col items-center shrink-0">
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                            isCompleted
                                                ? 'bg-orange-500 text-white shadow-xs ring-2 ring-orange-500/20'
                                                : isCurrent
                                                    ? 'bg-white dark:bg-slate-900 border-2 border-orange-500 text-orange-500 ring-4 ring-orange-500/20 shadow-xs'
                                                    : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-transparent'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {isCompleted ? (
                                            <Check size={12} strokeWidth={3} />
                                        ) : isCurrent ? (
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        )}
                                    </div>

                                    {!isLast && (
                                        <div className="w-[2px] h-6 bg-slate-200 dark:bg-slate-800 my-0.5 rounded-full overflow-hidden">
                                            <div
                                                className="w-full bg-gradient-to-b from-orange-500 via-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                                style={{ height: isCompleted ? '100%' : '0%' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`pt-0.5 flex-1 min-w-0 ${!isLast ? 'pb-2' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={`text-xs leading-tight transition-colors ${
                                                isCompleted
                                                    ? 'text-slate-800 dark:text-slate-200 font-bold'
                                                    : isCurrent
                                                        ? 'text-orange-600 dark:text-orange-400 font-black'
                                                        : 'text-slate-400 dark:text-slate-500 font-medium'
                                            }`}
                                        >
                                            {step.label}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 shrink-0">
                                                Current
                                            </span>
                                        )}
                                        {isCompleted && (
                                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                                Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ReportCard = ({ report, setZoomedImage, handleCancelReport, isLatest = false, newestReportId, isExpanded, onToggleExpand }) => {
    const [localShowDetails, setLocalShowDetails] = useState(false);
    const showDetails = isExpanded !== undefined ? isExpanded : localShowDetails;

    const handleToggle = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalShowDetails(prev => !prev);
        }
    };

    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const resolutionDays = report.status === 'resolved' && report.updated_at && report.created_at
        ? daysBetween(report.created_at, report.updated_at)
        : null;

    const rawDescription = report.description || report.notes;
    const cleanDescription = sanitizeDescription(rawDescription);
    const isLongDescription = cleanDescription && cleanDescription.length > 120;
    const displayDescription = isLongDescription && !isDescExpanded
        ? `${cleanDescription.substring(0, 120)}...`
        : cleanDescription;

    const isPending = report.status === 'pending' || report.status === 'unverified';
    const isResolved = report.status === 'resolved';

    // Stale report signal: pending for 14+ days (only if not already marked as latest)
    const daysWaiting = daysBetween(report.created_at, new Date().toISOString());
    const isStale = !isLatest && isPending && daysWaiting >= 14;

    const [copiedTicket, setCopiedTicket] = useState(false);

    return (
        <div
            className={`group bg-white dark:bg-[#0c1427] border rounded-2xl overflow-hidden transition-all duration-200 ease-out shadow-xs hover:shadow-md ${
                showDetails
                    ? 'ring-2 ring-orange-500/20 border-orange-400 dark:border-orange-500/50'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
        >
            {/* ── Compact Card Header (Single Tap Zone to toggle) ── */}
            <div
                role="button"
                tabIndex={0}
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                aria-label={`Report ${report.ticket_id}: ${report.category || 'Civic Issue'}, status ${report.status}. Click to ${showDetails ? 'collapse' : 'view full'} details.`}
                aria-expanded={showDetails}
                className="w-full p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-4 cursor-pointer select-none active:scale-[0.99] hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all outline-none focus-visible:ring-2 focus-visible:ring-orange-500 min-h-[76px] sm:min-h-[96px]"
            >
                {/* Left: Square/Rounded Thumbnail (48px mobile, 64px desktop) */}
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shadow-2xs">
                    {report.image_url ? (
                        <img
                            src={resolveReportMediaUrl(report.image_url)}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-850">
                            <CameraOff size={18} strokeWidth={1.75} />
                        </div>
                    )}
                </div>

                {/* Middle: Condensed essentials at a glance */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 overflow-hidden">
                    {showDetails ? (
                        <>
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[13px] font-mono text-slate-900 dark:text-white whitespace-nowrap flex-nowrap overflow-hidden">
                                <span className="font-extrabold tracking-tight text-slate-900 dark:text-white shrink-0 whitespace-nowrap">
                                    {report.ticket_id}
                                </span>
                                <span className="text-slate-400 dark:text-slate-600 font-normal shrink-0">•</span>
                                <span className="text-[10.5px] sm:text-xs font-normal text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                                    {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            {report.location_string && (
                                <div className="flex items-start gap-1 text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 min-w-0">
                                    <MapPin size={11} className="text-orange-500 shrink-0 mt-0.5" />
                                    <span className="min-w-0 break-words leading-tight">
                                        {report.location_string}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="min-w-0">
                                <h4 className="text-[13px] sm:text-[14.5px] font-bold tracking-tight text-slate-900 dark:text-white truncate min-w-0">
                                    {report.category || report.ai_category || 'Civic Infrastructure Report'}
                                </h4>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 min-w-0 whitespace-nowrap flex-nowrap overflow-hidden">
                                <span className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 tracking-tight">
                                    {report.ticket_id}
                                </span>
                                <span className="shrink-0 text-slate-400 dark:text-slate-600">•</span>
                                <span className="whitespace-nowrap shrink-0">
                                    {new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            {report.location_string && (
                                <div className="flex items-start gap-1 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                                    <MapPin size={11} className="text-orange-500 shrink-0 mt-0.5" />
                                    <span className="min-w-0 break-words leading-tight">
                                        {report.location_string}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right: Status badge (when collapsed) + Chevron */}
                <div className="shrink-0 flex items-center gap-2.5">
                    {!showDetails && (
                        <div className="hidden xs:flex items-center">
                            <StatusBadge status={report.status} />
                        </div>
                    )}
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 group-hover:text-orange-500 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-all">
                        <ChevronDown
                            size={17}
                            strokeWidth={2.5}
                            className={`transform transition-transform duration-200 ${showDetails ? 'rotate-180 text-orange-500' : ''}`}
                        />
                    </div>
                </div>
            </div>

            {/* ── Dedicated Expanded Details View (Photo, All Badges, Full Location, Activity, Actions) ── */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5 overflow-hidden space-y-4"
                    >
                        {/* Top Meta Badges & Copy Ticket ID row (Matching Image 1) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {(report.is_claimed || report.claimed_at) && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/60 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-xs">
                                        <Link2 size={12} className="text-black dark:text-white" />
                                        CLAIMED TICKET
                                    </span>
                                )}
                                {isStale && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/60 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-black dark:text-white shadow-xs">
                                        <Clock size={11} className="text-black dark:text-white" />
                                        Pending ({daysWaiting}d)
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard?.writeText(report.ticket_id || report.id);
                                    setCopiedTicket(true);
                                    setTimeout(() => setCopiedTicket(false), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <Copy size={12} />
                                <span>{copiedTicket ? 'Copied!' : 'Copy Ticket ID'}</span>
                            </button>
                        </div>

                        {/* Main Content Area: Responsive Stacked (<lg) vs 2-Column (>=lg) */}
                        {report.image_url ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-start">
                                {/* LEFT COLUMN: Evidence Photo (+ Description if present) */}
                                <div className="lg:col-span-7 flex flex-col gap-3">
                                    <div className="relative rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 border border-slate-200/80 dark:border-slate-800 aspect-[16/9] max-h-64 sm:max-h-72 lg:max-h-none">
                                        <img
                                            src={resolveReportMediaUrl(report.image_url)}
                                            alt={`${report.category} photo proof`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                        <button
                                            type="button"
                                            onClick={() => setZoomedImage(resolveReportMediaUrl(report.image_url))}
                                            className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-xs text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                        >
                                            <Maximize2 size={12} />
                                            <span>Full Photo</span>
                                        </button>
                                    </div>

                                    {/* Description (if present) sits under the photo in the left column on desktop */}
                                    {cleanDescription && (
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                                Incident Description
                                            </p>
                                            <span>{displayDescription}</span>
                                            {isLongDescription && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                    className="ml-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline inline cursor-pointer"
                                                >
                                                    {isDescExpanded ? 'Show less' : 'Read more'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: Recorded Location + Progress Tracker */}
                                <div className="lg:col-span-5 flex flex-col gap-3">
                                    {/* Full Recorded Address & GPS */}
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                                        <div>
                                            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                                Recorded Location
                                            </p>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium select-text cursor-text">
                                                {formatFullAddress(parseAddressString(report.location_string)) || 'Caloocan City'}
                                            </p>
                                        </div>
                                        {report.lat && report.lng && (
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                                                <span>Coordinates: {parseFloat(report.lat).toFixed(5)}, {parseFloat(report.lng).toFixed(5)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard?.writeText(`${report.lat}, ${report.lng}`)}
                                                    className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                                                >
                                                    Copy GPS
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Step Tracker (Horizontal on mobile/tablet, Vertical beside photo on desktop) */}
                                    <MiniProgressTracker
                                        status={report.status}
                                        resolutionDays={resolutionDays}
                                        orientation="responsive"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Fallback when report has no photo: Single-column clean layout */
                            <div className="flex flex-col gap-3">
                                {cleanDescription && (
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                                            Incident Description
                                        </p>
                                        <span>{displayDescription}</span>
                                        {isLongDescription && (
                                            <button
                                                type="button"
                                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                                className="ml-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline inline cursor-pointer"
                                            >
                                                {isDescExpanded ? 'Show less' : 'Read more'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                                    <div>
                                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                            Recorded Location
                                        </p>
                                        <p className="text-slate-800 dark:text-slate-200 font-medium select-text cursor-text">
                                            {formatFullAddress(parseAddressString(report.location_string)) || 'Caloocan City'}
                                        </p>
                                    </div>
                                    {report.lat && report.lng && (
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px] text-slate-500">
                                            <span>Coordinates: {parseFloat(report.lat).toFixed(5)}, {parseFloat(report.lng).toFixed(5)}</span>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard?.writeText(`${report.lat}, ${report.lng}`)}
                                                className="text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                                            >
                                                Copy GPS
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <MiniProgressTracker
                                    status={report.status}
                                    resolutionDays={resolutionDays}
                                    orientation="horizontal"
                                />
                            </div>
                        )}

                        {/* Action Buttons in Detail View */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                            {/* Retract button if pending */}
                            {isPending && (
                                <button
                                    type="button"
                                    onClick={() => handleCancelReport(report)}
                                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                >
                                    <RotateCcw size={13} strokeWidth={2.5} />
                                    <span>Retract Report</span>
                                </button>
                            )}

                            {/* View Proof if resolved */}
                            {isResolved && report.resolution_image_url && (
                                <button
                                    type="button"
                                    onClick={() => setZoomedImage(resolveReportMediaUrl(report.resolution_image_url))}
                                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                >
                                    <ImageIcon size={14} />
                                    <span>View Repair Proof</span>
                                </button>
                            )}

                            {/* Collapse button */}
                            <button
                                type="button"
                                onClick={handleToggle}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-auto py-2 px-3 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] flex items-center gap-1"
                            >
                                <span>Collapse</span>
                                <ChevronDown size={14} className="rotate-180" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Skeleton Loader Card for High Perceived Performance (Matching compact height) ──
const ReportCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 sm:gap-4 animate-pulse min-h-[88px] sm:min-h-[96px]">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center gap-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
            </div>
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-2/3" />
        </div>
        <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
    </div>
);

const CIVIC_ISSUE_CATEGORIES = [
    'Roads & bridges',
    'Drainage & flooding',
    'Street lighting',
    'Water pipeline',
    'Public safety hazards',
    'Traffic & road signs',
    'Public facilities',
    'Electrical wiring',
    'Waste management'
];

const matchesCivicCategory = (reportCat, targetCat) => {
    if (!targetCat || targetCat === 'All categories') return true;
    if (!reportCat) return false;

    const r = reportCat.trim().toLowerCase();
    const t = targetCat.trim().toLowerCase();

    if (r === t) return true;

    if (t === 'roads & bridges') {
        return (r.includes('road') || r.includes('bridge') || r.includes('pothole') || r.includes('asphalt') || r.includes('pavement')) && !r.includes('sign') && !r.includes('traffic');
    }
    if (t === 'drainage & flooding') {
        return r.includes('drain') || r.includes('flood') || r.includes('canal') || r.includes('sewer') || r.includes('waterway');
    }
    if (t === 'street lighting') {
        return (r.includes('light') || r.includes('lamp') || r.includes('streetlight')) && !r.includes('traffic');
    }
    if (t === 'water supply' || t === 'water pipeline') {
        return (r.includes('water') && !r.includes('waterway')) || r.includes('leak') || r.includes('pipe') || r.includes('pressure');
    }
    if (t === 'public safety hazards') {
        return r.includes('safety') || r.includes('hazard') || r.includes('manhole') || r.includes('unstable') || r.includes('tree');
    }
    if (t === 'traffic & road signs') {
        return r.includes('traffic') || r.includes('sign') || r.includes('signal') || r.includes('marking');
    }
    if (t === 'public facilities') {
        return r.includes('facility') || r.includes('facilities') || r.includes('building') || r.includes('park') || r.includes('civic') || r.includes('ground');
    }
    if (t === 'electrical wiring') {
        return r.includes('electric') || r.includes('wiring') || r.includes('cable') || r.includes('wire') || r.includes('power');
    }
    if (t === 'waste management') {
        return r.includes('waste') || r.includes('garbage') || r.includes('trash') || r.includes('basura') || r.includes('dump') || r.includes('litter');
    }

    return false;
};

const getCategoryIconComponent = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('waste') || cat.includes('garbage') || cat.includes('trash') || cat.includes('basura') || cat.includes('dump') || cat.includes('litter')) return Trash2;
    if (cat.includes('drain') || cat.includes('flood')) return Waves;
    if (cat.includes('water') || cat.includes('pipe') || cat.includes('leak')) return Droplets;
    if (cat.includes('light') || cat.includes('lamp') || cat.includes('streetlight')) return Lightbulb;
    if (cat.includes('electric') || cat.includes('wire') || cat.includes('cable')) return Zap;
    if (cat.includes('sign') || cat.includes('signal') || cat.includes('traffic')) return Signpost;
    if (cat.includes('facilit') || cat.includes('building') || cat.includes('park') || cat.includes('landmark')) return Building2;
    if (cat.includes('hazard') || cat.includes('safety')) return AlertTriangle;
    if (cat.includes('road') || cat.includes('bridge') || cat.includes('pothole') || cat.includes('pavement')) return RoadIcon;
    return RoadIcon;
};

const SAMPLE_REPORTS_LIST = [
    {
        id: 'sample-1',
        ticket_id: 'PUL-2026-2635',
        title: 'Reported public safety hazard',
        category: 'Public Safety & Hazards',
        status: 'rejected',
        subdivision: 'Sample subdivision',
        barangay: 'Barangay 171',
        location_string: 'Barangay 171, Caloocan City',
        latitude: 14.7518,
        longitude: 121.0269,
        created_at: '2026-10-26T10:30:00Z',
        updated_at: '2026-10-27T08:15:00Z',
        attachments_count: 1,
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
        department_title: 'Not accepted after review.',
        department_message: "Open the report to read the department's reason."
    },
    {
        id: 'sample-2',
        ticket_id: 'PUL-2026-1697',
        title: 'Streetlight not working',
        category: 'Power & Street Lighting',
        status: 'pending',
        subdivision: 'Congressional Village',
        barangay: 'Barangay 171',
        location_string: 'Barangay 171, Caloocan City',
        latitude: 14.7485,
        longitude: 121.0312,
        created_at: '2026-10-25T14:15:00Z',
        updated_at: '2026-10-25T14:20:00Z',
        attachments_count: 1,
        image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
        department_title: 'Received by the department.',
        department_message: 'No action needed while under review.'
    },
    {
        id: 'sample-3',
        ticket_id: 'PUL-2026-1681',
        title: 'Damaged road surface',
        category: 'Roads & Bridges',
        status: 'pending',
        subdivision: 'Rainbow Village',
        barangay: 'Barangay 171',
        location_string: 'Barangay 171, Caloocan City',
        latitude: 14.7392,
        longitude: 121.0280,
        created_at: '2026-10-23T08:45:00Z',
        updated_at: '2026-10-24T09:10:00Z',
        attachments_count: 1,
        stage: 'Stage 4 of 5',
        image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
        department_title: 'Received by the department.',
        department_message: 'No action needed while under review.'
    },
    {
        id: 'sample-4',
        ticket_id: 'PUL-2026-4745',
        title: 'Water leak on sidewalk',
        category: 'Water Supply & Distribution',
        status: 'pending',
        subdivision: 'Camarin Commercial Ctr',
        barangay: 'Barangay 171',
        location_string: 'Barangay 171, Caloocan City',
        latitude: 14.7541,
        longitude: 121.0395,
        created_at: '2026-10-21T16:20:00Z',
        updated_at: '2026-10-22T11:30:00Z',
        attachments_count: 1,
        image_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
        department_title: 'Received by the department.',
        department_message: 'No action needed while under review.'
    },
    {
        id: 'sample-5',
        ticket_id: 'PUL-2026-1633',
        title: 'Reported civic concern',
        category: 'Public Buildings & Facilities',
        status: 'pending',
        subdivision: 'Bagumbong',
        barangay: 'Barangay 171',
        location_string: 'Barangay 171, Caloocan City',
        latitude: 14.7430,
        longitude: 121.0348,
        created_at: '2026-10-18T11:10:00Z',
        updated_at: '2026-10-19T13:45:00Z',
        attachments_count: 1,
        image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        department_title: 'Received by the department.',
        department_message: 'No action needed while under review.'
    }
];

const MyReports = ({
    user,
    userReports = [],
    loadingReports,
    handleSetModal,
    containerVariants,
    setZoomedImage,
    reportStatusFilter,
    setReportStatusFilter,
    handleCancelReport,
    onSelectReportForDetails,
    onOpenMap,
    showToast,
    t
}) => {
    const isLocalhost = isLocalDevHost();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All categories');
    const [selectedDateFilter, setSelectedDateFilter] = useState('All dates');
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;
    const [openFaq, setOpenFaq] = useState(null);
    const [previewSampleData, setPreviewSampleData] = useState(false);
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const catDropdownRef = useRef(null);
    const dateDropdownRef = useRef(null);

    useEffect(() => {
        if (!isCatDropdownOpen && !isDateDropdownOpen) return;
        const handleClickOutside = (e) => {
            if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
                setIsCatDropdownOpen(false);
            }
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
                setIsDateDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsCatDropdownOpen(false);
                setIsDateDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isCatDropdownOpen, isDateDropdownOpen]);

    // Determine data source (live reports take precedence; fallback to sample demo reports only when preview requested)
    const hasLiveReports = userReports && userReports.length > 0;
    const isPopulated = hasLiveReports || previewSampleData;
    const baseReports = hasLiveReports ? userReports : (previewSampleData ? SAMPLE_REPORTS_LIST : []);

    // Available categories for dropdown (Strictly matching the 8 civic issue categories from official scope)
    const categoriesList = useMemo(() => [
        'All categories',
        ...CIVIC_ISSUE_CATEGORIES
    ], []);

    // Available dates for dropdown
    const datesList = useMemo(() => {
        const set = new Set();
        baseReports.forEach(r => {
            const d = r.created_at ? new Date(r.created_at) : new Date();
            const str = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            set.add(str);
        });
        return ['All dates', ...Array.from(set)];
    }, [baseReports]);

    // Stat metric counts across the base list
    const totalCount = baseReports.length;
    const awaitingReviewCount = useMemo(() => {
        return baseReports.filter(r => ['pending', 'unverified', 'received', 'under_review'].includes((r.status || '').toLowerCase())).length;
    }, [baseReports]);
    const inProgressCount = useMemo(() => {
        return baseReports.filter(r => ['dispatched', 'approved_internal', 'in_progress', 'assigned'].includes((r.status || '').toLowerCase())).length;
    }, [baseReports]);
    const resolvedCount = useMemo(() => {
        return baseReports.filter(r => ['resolved', 'completed', 'fixed'].includes((r.status || '').toLowerCase())).length;
    }, [baseReports]);
    const rejectedCount = useMemo(() => {
        return baseReports.filter(r => ['rejected', 'declined', 'invalid', 'spam'].includes((r.status || '').toLowerCase())).length;
    }, [baseReports]);

    // Filtered reports
    const filteredReports = useMemo(() => {
        return baseReports.filter(r => {
            // Status Tab Filter
            const s = (r.status || '').toLowerCase();
            const isTicketSearch = searchQuery.trim().toUpperCase().startsWith('PUL-');
            if (!isTicketSearch && (reportStatusFilter === 'pending' || reportStatusFilter === 'awaiting_review')) {
                if (!['pending', 'unverified', 'received', 'under_review'].includes(s)) return false;
            } else if (!isTicketSearch && reportStatusFilter === 'in_progress') {
                if (!['dispatched', 'approved_internal', 'in_progress', 'assigned'].includes(s)) return false;
            } else if (!isTicketSearch && reportStatusFilter === 'resolved') {
                if (!['resolved', 'completed', 'fixed'].includes(s)) return false;
            } else if (!isTicketSearch && reportStatusFilter === 'rejected') {
                if (!['rejected', 'declined', 'invalid', 'spam'].includes(s)) return false;
            }

            // Category Filter (Accurately matches against official civic issue categories)
            if (selectedCategory !== 'All categories') {
                const cat = r.category || r.ai_category;
                if (!matchesCivicCategory(cat, selectedCategory)) return false;
            }

            // Date Filter
            if (selectedDateFilter !== 'All dates') {
                const d = r.created_at ? new Date(r.created_at) : new Date();
                const m = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                if (m !== selectedDateFilter) return false;
            }

            // Text search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchId = (r.ticket_id || '').toLowerCase().includes(q);
                const matchCat = (r.category || r.ai_category || '').toLowerCase().includes(q);
                const matchLoc = (r.location_string || r.barangay || '').toLowerCase().includes(q);
                const matchTitle = (r.title || '').toLowerCase().includes(q);
                if (!matchId && !matchCat && !matchLoc && !matchTitle) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [baseReports, reportStatusFilter, selectedCategory, selectedDateFilter, searchQuery, sortOrder]);

    // Reset pagination when any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedDateFilter, reportStatusFilter, sortOrder]);

    // 5 Reports per page pagination
    const totalReportsCount = filteredReports.length;
    const totalPages = Math.max(1, Math.ceil(totalReportsCount / ITEMS_PER_PAGE));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalReportsCount);
    const paginatedReports = useMemo(() => {
        return filteredReports.slice(startIndex, endIndex);
    }, [filteredReports, startIndex, endIndex]);

    const statusPillOptions = [
        { id: 'all', label: 'All', count: totalCount, icon: null },
        { id: 'pending', label: 'Awaiting review', count: awaitingReviewCount, icon: Clock, color: 'text-amber-500' },
        { id: 'in_progress', label: 'In progress', count: inProgressCount, icon: Wrench, color: 'text-sky-500' },
        { id: 'resolved', label: 'Resolved', count: resolvedCount, icon: CheckCircle2, color: 'text-emerald-500' },
        { id: 'rejected', label: 'Rejected', count: rejectedCount, icon: XCircle, color: 'text-rose-500' }
    ];

    const [isExporting, setIsExporting] = useState(false);
    const handleExportXLSX = async () => {
        const reportsToExport = (filteredReports && filteredReports.length > 0) ? filteredReports : baseReports;
        if (!reportsToExport || reportsToExport.length === 0 || isExporting) {
            if (!isExporting) showToast?.('No reports available to export.', 'warning');
            return;
        }
        setIsExporting(true);
        try {
            const residentName = user?.first_name || user?.name || 'Citizen';
            const ok = await exportReportsToXLSX(reportsToExport, residentName);
            if (ok && showToast) {
                showToast(`Exported ${reportsToExport.length} report(s) to Excel.`);
            }
        } finally {
            setIsExporting(false);
        }
    };
    const handleExportCSV = handleExportXLSX;

    const getCategoryIcon = (categoryStr) => {
        const cat = (categoryStr || '').toLowerCase();
        if (cat.includes('safety') || cat.includes('hazard')) return <AlertTriangle size={13} className="text-rose-500 shrink-0" />;
        if (cat.includes('light')) return <Lightbulb size={13} className="text-amber-500 shrink-0" />;
        if (cat.includes('water') || cat.includes('leak')) return <Droplets size={13} className="text-blue-500 shrink-0" />;
        if (cat.includes('drain') || cat.includes('flood')) return <Waves size={13} className="text-cyan-500 shrink-0" />;
        if (cat.includes('electric') || cat.includes('wire')) return <Zap size={13} className="text-amber-500 shrink-0" />;
        if (cat.includes('traffic') || cat.includes('sign')) return <Signpost size={13} className="text-orange-500 shrink-0" />;
        if (cat.includes('facilit') || cat.includes('building') || cat.includes('park') || cat.includes('hall')) return <Building2 size={13} className="text-indigo-500 shrink-0" />;
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('asphalt') || cat.includes('infrastructure')) return <Wrench size={13} className="text-slate-500 shrink-0" />;
        return <Wrench size={13} className="text-slate-500 shrink-0" />;
    };

    const getReportDisplayTitle = (report) => {
        if (report.title && report.title.trim() && !report.title.toLowerCase().includes('civic infrastructure concern')) {
            return report.title;
        }
        if (report.description && report.description.trim()) {
            const firstSentence = report.description.split('.')[0].trim();
            if (firstSentence.length > 5 && firstSentence.length < 50) {
                return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
            }
        }
        const cat = (report.category || report.ai_category || '').toLowerCase();
        if (cat.includes('safety') || cat.includes('hazard')) return 'Reported public safety hazard';
        if (cat.includes('light')) return 'Streetlight not working';
        if (cat.includes('road') || cat.includes('pothole') || cat.includes('asphalt') || cat.includes('infrastructure')) return 'Damaged road surface';
        if (cat.includes('water') || cat.includes('leak')) return 'Water leak on sidewalk';
        if (cat.includes('drain') || cat.includes('flood')) return 'Clogged roadside drain';
        if (cat.includes('electric') || cat.includes('wire')) return 'Exposed electrical wiring';
        if (cat.includes('traffic') || cat.includes('sign')) return 'Damaged traffic and road sign';
        return 'Reported civic concern';
    };

    const getReportThumbnail = getReportPhotoUrl;

    const getReportDisplayCategory = (report) => {
        const raw = (report.category || report.ai_category || '').toLowerCase();
        if (raw.includes('safety') || raw.includes('hazard')) return 'Public Safety & Hazards';
        if (raw.includes('light') || raw.includes('power') || raw.includes('electric')) return 'Power & Street Lighting';
        if (raw.includes('road') || raw.includes('bridge') || raw.includes('pothole') || raw.includes('asphalt')) return 'Roads & Bridges';
        if (raw.includes('water') || raw.includes('leak')) return 'Water Supply & Distribution';
        if (raw.includes('drain') || raw.includes('flood')) return 'Drainage & Flooding';
        if (raw.includes('facilit') || raw.includes('building') || raw.includes('hall')) return 'Public Buildings & Facilities';
        if (raw.includes('traffic') || raw.includes('sign')) return 'Traffic & Road Signs';
        return report.category || report.ai_category || 'Civic Infrastructure';
    };

    const getLocationString = (report) => {
        if (report.barangay) {
            const brgy = report.barangay.toLowerCase().includes('barangay')
                ? report.barangay
                : `Barangay ${report.barangay}`;
            return `${brgy}, Caloocan City`;
        }
        if (report.location_string) {
            const match = report.location_string.match(/(Barangay\s+\w+)/i);
            if (match) return `${match[1]}, Caloocan City`;
            return report.location_string;
        }
        return 'Barangay 171, Caloocan City';
    };

    const getDepartmentNotice = (report, status) => {
        if (report.department_title && report.department_message) {
            return {
                title: report.department_title,
                message: report.department_message
            };
        }

        if (['rejected', 'declined', 'invalid', 'spam'].includes(status)) {
            return {
                title: 'Not accepted after review.',
                message: report.rejection_reason || report.department_note || "Open the report to read the department's reason."
            };
        }

        if (['pending', 'unverified', 'received', 'under_review'].includes(status)) {
            return {
                title: 'Received by the department.',
                message: report.department_note || 'No action needed while under review.'
            };
        }

        if (['dispatched', 'approved_internal', 'in_progress', 'assigned'].includes(status)) {
            const stageText = report.stage || 'Stage 4 of 5';
            return {
                title: 'Department work is in progress.',
                message: report.department_note || `Follow this report for updates. ${stageText}`
            };
        }

        if (['resolved', 'completed', 'fixed'].includes(status)) {
            return {
                title: 'Marked resolved.',
                message: report.department_note || 'Review the completion update.'
            };
        }

        return {
            title: 'Received by the department.',
            message: report.department_note || 'Waiting for review.'
        };
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full space-y-6"
        >
            {/* Top Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] dark:text-white tracking-tight">
                        My Reports
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Submit a concern, follow its progress, and review the city&apos;s response.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {isLocalhost && !isNativeAndroid() && (
                        <button
                            type="button"
                            onClick={handleExportXLSX}
                            disabled={isExporting}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                            title="Export reports to Excel (.xlsx)"
                            aria-label="Export reports to Excel"
                        >
                            <Download size={13} className="text-slate-500 dark:text-slate-400" />
                            <span>{isExporting ? 'Exporting…' : 'Export'}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleSetModal('file-report')}
                        className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                        <Plus size={16} strokeWidth={2.8} />
                        <span>New report</span>
                    </button>
                </div>
            </div>

            {/* 4 Stats Metrics Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Total Reports */}
                <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                        <FileText size={17} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            Total
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-[#0B1528] dark:text-white leading-tight font-mono">
                            {totalCount}
                        </div>
                    </div>
                </div>

                {/* Awaiting Review */}
                <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center shrink-0">
                        <Clock size={17} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            Awaiting review
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-[#0B1528] dark:text-white leading-tight font-mono">
                            {awaitingReviewCount}
                        </div>
                    </div>
                </div>

                {/* In Progress */}
                <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
                        <Settings size={17} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            In progress
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-[#0B1528] dark:text-white leading-tight font-mono">
                            {inProgressCount}
                        </div>
                    </div>
                </div>

                {/* Resolved */}
                <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={17} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            Resolved
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-[#0B1528] dark:text-white leading-tight font-mono">
                            {resolvedCount}
                        </div>
                    </div>
                </div>
            </div>

            {!isPopulated ? (
                /* Empty State matching Civic Aperture / media_1793035273112_74fac838.jpg */
                <div className="space-y-6">
                    {/* 2-Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Left Column (Span 2) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Card 1: Your first report starts here */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs relative overflow-hidden">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="max-w-md">
                                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            Your first report starts here
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                            You haven&apos;t submitted a report yet. Share a local infrastructure concern and track updates in this space.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 mt-5">
                                            <button
                                                type="button"
                                                onClick={() => handleSetModal('file-report')}
                                                className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                                            >
                                                <Plus size={16} strokeWidth={2.8} />
                                                <span>Create your first report</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSetModal('map')}
                                                className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <span>Explore nearby concerns</span>
                                                <ArrowRight size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewSampleData(true)}
                                                className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                                <Eye size={14} />
                                                <span>Preview sample reports</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Graphic Illustration */}
                                    <div className="flex justify-center md:justify-end shrink-0">
                                        <svg width="190" height="135" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-xs">
                                            <path d="M120 20 H200 M100 50 H210 M110 80 H210 M130 110 H200" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
                                            <path d="M130 20 V120 M165 15 V125 M200 20 V115" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
                                            <path d="M140 100 C 155 90, 150 65, 175 52" stroke="#F97316" strokeWidth="2" strokeDasharray="3 3" />
                                            <circle cx="140" cy="100" r="3" fill="#F97316" />
                                            <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.05))">
                                                <path d="M25 20 C25 15 28 12 33 12 H100 L125 37 V115 C125 120 122 123 117 123 H33 C28 123 25 120 25 115 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
                                                <path d="M100 12 V32 C100 35 102 37 105 37 H125" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
                                                <rect x="38" y="32" width="35" height="4" rx="2" fill="#94A3B8" />
                                                <rect x="38" y="44" width="70" height="3" rx="1.5" fill="#E2E8F0" />
                                                <rect x="38" y="53" width="60" height="3" rx="1.5" fill="#E2E8F0" />
                                                <rect x="38" y="62" width="65" height="3" rx="1.5" fill="#E2E8F0" />
                                                <rect x="38" y="71" width="45" height="3" rx="1.5" fill="#E2E8F0" />
                                            </g>
                                            <g filter="drop-shadow(0 6px 10px rgba(0,0,0,0.08))">
                                                <rect x="15" y="75" width="68" height="52" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
                                                <rect x="20" y="80" width="58" height="42" rx="4" fill="#F8FAFC" />
                                                <circle cx="62" cy="90" r="4" fill="#FDBA74" />
                                                <path d="M22 120 L36 98 L50 120 Z" fill="#93C5FD" />
                                                <path d="M42 120 L58 92 L76 120 Z" fill="#60A5FA" opacity="0.9" />
                                            </g>
                                            <g filter="drop-shadow(0 6px 8px rgba(234,88,12,0.3))">
                                                <path d="M175 32 C167 32 161 38 161 46 C161 56 175 70 175 70 C175 70 189 56 189 46 C189 38 183 32 175 32 Z" fill="#EA580C" />
                                                <circle cx="175" cy="45" r="4.5" fill="#FFFFFF" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>

                                {/* Bottom 3 feature items */}
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <BarChart2 size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Track status
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                See how your report progresses from review to resolution.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageSquare size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Read department feedback
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                View updates and responses from the Engineering Department.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <Paperclip size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Review your attachments
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Check the photos and files you submitted with your report.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: How your report moves forward */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-6">
                                    How your report moves forward
                                </h2>

                                <div className="relative">
                                    {/* Connecting Line */}
                                    <div className="hidden sm:block absolute top-4.5 left-10 right-10 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
                                        {/* Step 1 */}
                                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                                            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                                                <FileText size={16} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Received</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight sm:max-w-[120px]">
                                                    Your report is submitted and recorded in the system.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                                            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                                                <Search size={16} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Verified</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight sm:max-w-[120px]">
                                                    We check the details and attachments.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                                            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                                                <Users size={16} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Assigned</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight sm:max-w-[120px]">
                                                    Your report is endorsed to the proper team.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                                            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                                                <Settings size={16} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">In progress</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight sm:max-w-[120px]">
                                                    The team works on the concern.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 5 */}
                                        <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                                            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-2xs shrink-0">
                                                <Check size={16} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Resolved</div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight sm:max-w-[120px]">
                                                    The concern is addressed and the report is closed.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Notice Box */}
                                <div className="mt-6 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center gap-2.5 text-xs text-sky-800 dark:text-sky-300">
                                    <Info size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
                                    <span>Reports may also be rejected or cancelled. Check the report for the reason.</span>
                                </div>
                            </div>

                            {/* Card 3: What you'll see after submitting */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-5">
                                    What you&apos;ll see after submitting
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <FileText size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Report summary
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Category, location, date, and attached photos.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <MessageSquare size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Latest update
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Current status and department feedback.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                            <List size={16} strokeWidth={2.2} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Next steps
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Any information or action needed from you.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Card 1: Prepare a helpful report */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                                    Prepare a helpful report
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Exact location
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Use a map pin or a clear landmark.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Clear photo
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Show the concern safely and clearly.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                Short description
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Tell us what happened and when.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Common report categories */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                                    Common report categories
                                </h2>
                                <div className="flex flex-wrap gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Signpost size={14} className="text-sky-600 dark:text-sky-400" />
                                        <span>Roads &amp; bridges</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Waves size={14} className="text-sky-600 dark:text-sky-400" />
                                        <span>Drainage</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Lightbulb size={14} className="text-amber-500" />
                                        <span>Street lighting</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Droplets size={14} className="text-blue-500" />
                                        <span>Water pipeline</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="px-3.5 py-2.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                        <AlertTriangle size={14} className="text-rose-500" />
                                        <span>Safety hazards</span>
                                    </button>
                                </div>
                            </div>

                            {/* Card 3: Need help? */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
                                    <BookOpen size={18} strokeWidth={2.2} />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Need help?
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                    Learn how to submit a detailed and effective report with photos and a clear description.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleSetModal('reporting-guide')}
                                    className="text-xs font-bold text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 flex items-center gap-1 mt-3 cursor-pointer transition-colors"
                                >
                                    <span>Read reporting guide</span>
                                    <ArrowRight size={13} />
                                </button>
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 text-[11px] text-slate-400 dark:text-slate-500">
                                    For urgent danger, use emergency contacts.
                                </div>
                            </div>

                            {/* Card 4: Your privacy matters */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                                    <Shield size={18} strokeWidth={2.2} />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Your privacy matters
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    Avoid including unnecessary personal information in descriptions or photos.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Full-Width Section: Questions about your reports? */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                            Questions about your reports?
                        </h2>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {/* Q1 */}
                            <div className="py-3.5">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === 0 ? null : 0)}
                                    className="w-full flex items-center justify-between text-left gap-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                                >
                                    <span>Where can I find my report ID?</span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${openFaq === 0 ? 'rotate-180 text-orange-600' : ''}`}
                                    />
                                </button>
                                {openFaq === 0 && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed pl-1">
                                        Every submitted report receives a unique tracking ID (e.g., ENG-2026-0842) displayed at the top of your report card and in your email/SMS confirmation.
                                    </p>
                                )}
                            </div>

                            {/* Q2 */}
                            <div className="py-3.5">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
                                    className="w-full flex items-center justify-between text-left gap-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                                >
                                    <span>How do I check updates?</span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${openFaq === 1 ? 'rotate-180 text-orange-600' : ''}`}
                                    />
                                </button>
                                {openFaq === 1 && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed pl-1">
                                        You can check updates directly from this page once submitted. The city engineering team posts real-time status changes, notes, and photos as work progresses.
                                    </p>
                                )}
                            </div>

                            {/* Q3 */}
                            <div className="py-3.5">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
                                    className="w-full flex items-center justify-between text-left gap-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                                >
                                    <span>What if my report is rejected?</span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${openFaq === 2 ? 'rotate-180 text-orange-600' : ''}`}
                                    />
                                </button>
                                {openFaq === 2 && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed pl-1">
                                        If a report is outside city jurisdiction, duplicated, or lacks sufficient information, officials will leave a specific reason. You can review the feedback and submit an updated report.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Populated State with Toolbar + Cards */
                <>
                    {/* Filter Toolbar: Search + Category + Date Dropdowns */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                        {/* Search Field */}
                        <div className="relative flex-1 min-w-0">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by ID, category, or location..."
                                className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 transition-all shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dropdowns Row: 2-column on mobile, inline on sm+ */}
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 shrink-0">
                            {/* Custom Categories Dropdown */}
                            <div className="relative w-full sm:w-auto" ref={catDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCatDropdownOpen(!isCatDropdownOpen);
                                        setIsDateDropdownOpen(false);
                                    }}
                                    aria-haspopup="listbox"
                                    aria-expanded={isCatDropdownOpen}
                                    className={`w-full sm:w-auto h-10 px-3 sm:px-3.5 bg-white dark:bg-slate-900 border rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 transition-all shadow-2xs cursor-pointer select-none ${
                                        isCatDropdownOpen
                                            ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-xs'
                                            : 'border-slate-200/90 dark:border-slate-800 hover:border-[#EA580C]/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="truncate max-w-[100px] sm:max-w-[150px]">{selectedCategory}</span>
                                    <ChevronDown
                                        size={14}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${isCatDropdownOpen ? 'rotate-180 text-[#EA580C]' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isCatDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            role="listbox"
                                            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-[calc(100vw-2.5rem)] max-w-[280px] sm:w-64 max-h-72 overflow-y-auto bg-white dark:bg-[#0C1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/60 p-1.5 z-50"
                                        >
                                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                                <span>Filter by Category</span>
                                                <span className="text-[9px] font-mono text-slate-400 font-normal">{categoriesList.length}</span>
                                            </div>
                                            {categoriesList.map(cat => {
                                                const isSelected = selectedCategory === cat;
                                                const CatIcon = cat === 'All categories' ? Layers : getCategoryIconComponent(cat);
                                                return (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setIsCatDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-[#EA580C]/10 text-[#EA580C] dark:text-orange-400'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                                <CatIcon size={13} strokeWidth={2.2} />
                                                            </div>
                                                            <span className="truncate">{cat}</span>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0 ml-2">
                                                                <Check size={11} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Custom Date Dropdown */}
                            <div className="relative w-full sm:w-auto" ref={dateDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDateDropdownOpen(!isDateDropdownOpen);
                                        setIsCatDropdownOpen(false);
                                    }}
                                    aria-haspopup="listbox"
                                    aria-expanded={isDateDropdownOpen}
                                    className={`w-full sm:w-auto h-10 px-3 sm:px-3.5 bg-white dark:bg-slate-900 border rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 transition-all shadow-2xs cursor-pointer select-none ${
                                        isDateDropdownOpen
                                            ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-xs'
                                            : 'border-slate-200/90 dark:border-slate-800 hover:border-[#EA580C]/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                        <Calendar size={13} className="text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[85px] sm:max-w-[135px]">{selectedDateFilter}</span>
                                    </div>
                                    <ChevronDown
                                        size={14}
                                        className={`text-slate-400 transition-transform duration-200 shrink-0 ${isDateDropdownOpen ? 'rotate-180 text-[#EA580C]' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isDateDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            role="listbox"
                                            className="absolute right-0 top-full mt-1.5 w-[calc(100vw-2.5rem)] max-w-[240px] sm:w-56 max-h-60 overflow-y-auto bg-white dark:bg-[#0C1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/60 p-1.5 z-50"
                                        >
                                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                                <span>Filter by Date</span>
                                                <span className="text-[9px] font-mono text-slate-400 font-normal">{datesList.length}</span>
                                            </div>
                                            {datesList.map(d => {
                                                const isSelected = selectedDateFilter === d;
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        onClick={() => {
                                                            setSelectedDateFilter(d);
                                                            setIsDateDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium border border-transparent'
                                                        }`}
                                                    >
                                                        <span className="truncate">{d}</span>
                                                        {isSelected && (
                                                            <div className="w-4 h-4 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0 ml-2">
                                                                <Check size={11} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
                        {statusPillOptions.map((opt) => {
                            const isSelected = (reportStatusFilter === opt.id) || (opt.id === 'all' && (!reportStatusFilter || reportStatusFilter === 'all'));
                            const IconComponent = opt.icon;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setReportStatusFilter(opt.id)}
                                    className={`group h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer select-none shrink-0 ${
                                        isSelected
                                            ? 'bg-[#EA580C] text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                                    }`}
                                >
                                    {IconComponent && (
                                        <IconComponent
                                            size={14}
                                            className={isSelected ? 'text-white' : (opt.color || 'text-slate-500')}
                                        />
                                    )}
                                    <span>{opt.label}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold transition-colors ${
                                            isSelected
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                        }`}
                                    >
                                        {opt.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Month Heading & Sort Order Row */}
                    <div className="flex items-center justify-between pt-2 pb-1 border-b border-slate-100 dark:border-slate-800/80">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {selectedDateFilter !== 'All dates' ? selectedDateFilter : 'October 2026'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        >
                            <ArrowUpDown size={13} />
                            <span>Sorted: {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
                        </button>
                    </div>

                    {previewSampleData && !hasLiveReports && (
                        <div className="p-3.5 rounded-xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 flex items-center justify-between text-xs text-orange-900 dark:text-orange-200">
                            <span className="flex items-center gap-2">
                                <Info size={15} className="text-orange-600 shrink-0" />
                                <span>Previewing sample demonstration reports. Submit your own report anytime to track live updates.</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewSampleData(false)}
                                className="font-bold underline hover:text-orange-950 dark:hover:text-white cursor-pointer ml-3 shrink-0"
                            >
                                Exit preview
                            </button>
                        </div>
                    )}

                    {/* Reports Cards Grid (Image 1 Approved Design: 3-Column Grid Cards) */}
                    {filteredReports.length === 0 ? (
                        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No reports found matching your selected filters.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {paginatedReports.map((report) => {
                                const status = (report.status || 'pending').toLowerCase();
                                const isPending = ['pending', 'unverified', 'received', 'under_review'].includes(status);
                                const isInProgress = ['dispatched', 'approved_internal', 'in_progress', 'assigned'].includes(status);
                                const isResolved = ['resolved', 'completed', 'fixed'].includes(status);
                                const isRejected = ['rejected', 'declined', 'invalid', 'spam'].includes(status);

                                const dateStr = report.created_at
                                    ? new Date(report.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                      })
                                    : new Date().toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                      });

                                const displayTitle = getReportDisplayTitle(report);
                                const displayCategory = getReportDisplayCategory(report);
                                const thumbnailSrc = getReportThumbnail(report);
                                const attachmentCount = report.attachments_count || (report.media_urls && report.media_urls.length > 0 ? report.media_urls.length : (report.photos && report.photos.length > 0 ? report.photos.length : 1));
                                const locationStr = getLocationString(report);

                                return (
                                    <div
                                        key={report.id || report.ticket_id}
                                        className="bg-white dark:bg-[#0B1324] border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between group"
                                    >
                                        {/* Top Photo Banner */}
                                        <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-slate-900 shrink-0">
                                            <ReportEvidenceImage
                                                src={thumbnailSrc}
                                                alt={displayTitle}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />

                                            {/* Floating Status Pill (Top-Left overlay on photo) */}
                                            <div className="absolute top-3 left-3 z-10">
                                                {isRejected ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ef4444] text-white shadow-md">
                                                        <XCircle size={13} strokeWidth={2.5} className="text-white shrink-0" />
                                                        <span>Rejected</span>
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f59e0b] text-white shadow-md">
                                                        <Clock size={13} strokeWidth={2.5} className="text-white shrink-0" />
                                                        <span className="text-white">Awaiting review</span>
                                                    </span>
                                                ) : isInProgress ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500 text-white shadow-md">
                                                        <Settings size={13} strokeWidth={2.2} className="text-white shrink-0" />
                                                        <span>In progress</span>
                                                    </span>
                                                ) : isResolved ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-md">
                                                        <CheckCircle2 size={13} strokeWidth={2.5} className="text-white shrink-0" />
                                                        <span>Resolved</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#f59e0b] text-white shadow-md">
                                                        <Clock size={13} strokeWidth={2.5} className="text-white shrink-0" />
                                                        <span className="text-white">Awaiting review</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Content Body */}
                                        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1">
                                            <div>
                                                {/* Title */}
                                                <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1" title={displayTitle}>
                                                    {displayTitle}
                                                </h4>

                                                {/* Category Subtitle */}
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                                    {displayCategory}
                                                </p>

                                                {/* Metadata Rows: Ticket ID, Location, Date & Attachment */}
                                                <div className="mt-3.5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                    {/* Ticket ID */}
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={15} className="text-slate-400 shrink-0" strokeWidth={1.8} />
                                                        <span className="font-mono">{report.ticket_id || 'PUL-2026-0000'}</span>
                                                    </div>

                                                    {/* Location */}
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={15} className="text-slate-400 shrink-0" strokeWidth={1.8} />
                                                        <span className="truncate">{locationStr}</span>
                                                    </div>

                                                    {/* Date & Attachment */}
                                                    <div className="flex items-center gap-2 pt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={15} className="text-slate-400 shrink-0" strokeWidth={1.8} />
                                                            <span>{dateStr}</span>
                                                        </div>
                                                        <span className="text-slate-300 dark:text-slate-700 select-none">|</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <ImageIcon size={15} className="text-slate-400 shrink-0" strokeWidth={1.8} />
                                                            <span>{attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Button: View Details */}
                                            <button
                                                type="button"
                                                onClick={() => onSelectReportForDetails(report)}
                                                className="w-full mt-5 py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                            >
                                                <span>View details</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottom Pagination & Count Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 pb-16 sm:pb-20 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {totalReportsCount === 0 ? (
                                <span>Showing 0 of 0 reports</span>
                            ) : (
                                <span>
                                    Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{endIndex}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalReportsCount}</span> reports
                                </span>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5 self-center sm:self-auto select-none">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(1, prev - 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={validPage <= 1}
                                    className="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#EA580C] hover:text-[#EA580C] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} strokeWidth={2.5} />
                                    <span>Previous</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                                        const isCurrent = pageNum === validPage;
                                        return (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                onClick={() => {
                                                    setCurrentPage(pageNum);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center ${
                                                    isCurrent
                                                        ? 'bg-[#EA580C] text-white shadow-xs'
                                                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#EA580C] hover:text-[#EA580C] shadow-2xs'
                                                }`}
                                                aria-label={`Page ${pageNum}`}
                                                aria-current={isCurrent ? 'page' : undefined}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={validPage >= totalPages}
                                    className="h-9 px-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#EA580C] hover:text-[#EA580C] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                    aria-label="Next page"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </motion.div>
    );
};
export default MyReports;
