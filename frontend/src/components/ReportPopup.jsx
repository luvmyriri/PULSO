import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronDown,
    ChevronUp,
    Eye,
    ShieldCheck,
    Droplets,
    Waves,
    Mountain,
    Zap,
    Car,
    Signpost,
    AlertTriangle,
    Building2,
    MoreHorizontal
} from 'lucide-react';
import { getReportPhotoUrl } from '../utils/reportMedia';
import useReportImageSource from '../utils/useReportImageSource';
import PulsoPulseLine from './common/PulsoPulseLine';

/**
 * Maps raw backend status to human-readable status name and styling
 */
export function getFriendlyStatusName(rawStatus) {
    if (!rawStatus) return { name: 'Received', isResolved: false };
    const s = String(rawStatus).toLowerCase().trim();

    if (s === 'resolved' || s === 'completed' || s === 'closed') {
        return { name: 'Resolved', isResolved: true };
    }
    if (s === 'in_progress' || s === 'in progress' || s === 'investigating' || s === 'under repair' || s === 'repairing') {
        return { name: 'In Progress', isResolved: false };
    }
    if (s === 'assigned' || s === 'dispatched' || s === 'scheduled') {
        return { name: 'Assigned', isResolved: false };
    }
    if (s === 'verified' || s === 'approved' || s === 'validated') {
        return { name: 'Verified', isResolved: false };
    }
    if (s === 'received' || s === 'pending' || s === 'submitted' || s === 'new' || s === 'approved_internal') {
        return { name: 'Received', isResolved: false };
    }

    console.warn(`[PULSO Map Popup] Unrecognized status code: "${rawStatus}", displaying "In review"`);
    return { name: 'In review', isResolved: false };
}

/**
 * Returns corresponding category icon component
 */
export const RoadIcon = ({ size = 20, className = '', style = {} }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" />
    </svg>
);

export function getCategoryIconComponent(category, rawCategory) {
    const cat = (category || rawCategory || '').toLowerCase();
    if (cat.includes('flood') || cat.includes('drain')) return Waves;
    if (cat.includes('water') || cat.includes('tubig')) return Droplets;
    if (cat.includes('power') || cat.includes('light') || cat.includes('electric') || cat.includes('kuryente')) return Zap;
    if (cat.includes('traffic') || cat.includes('sign') || cat.includes('signal')) return Signpost;
    if (cat.includes('building') || cat.includes('facilit') || cat.includes('hall')) return Building2;
    if (cat.includes('safety') || cat.includes('hazard') || cat.includes('danger') || cat.includes('sunog')) return AlertTriangle;
    if (cat.includes('road') || cat.includes('bridge') || cat.includes('pothole') || cat.includes('lubak') || cat.includes('kalsada')) return RoadIcon;
    return MoreHorizontal;
}

/**
 * Fullscreen Image Lightbox with Pinch-zoom & Close button
 */
function PhotoLightbox({ imageUrl, alt, onClose, isDark = false }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Full screen report photo viewer"
            className={`fixed inset-0 z-[9999] backdrop-blur-md flex items-center justify-center p-4 select-none touch-pinch-zoom transition-colors ${
                isDark ? 'bg-black/90 text-white' : 'bg-slate-100/95 text-slate-900'
            }`}
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close photo view"
                className={`absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] z-10 ${
                    isDark
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-white text-slate-800 shadow-md border border-slate-200/80 hover:bg-slate-50'
                }`}
            >
                <X size={24} />
            </button>
            <img
                src={imageUrl}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-black/10 dark:border-white/10"
            />
        </div>
    );
}

/**
 * ReportPopup Component
 * Floating Bottom Card adhering strictly to the Civic Aperture redesign contract
 */
export default function ReportPopup({
    report,
    isOpen,
    onClose,
    isDark = false,
    onOpenReport,
    onOpenStreetView,
    hasLocation = false,
    cardRef,
    isLoading = false,
    error = null,
    onRetry = null
}) {
    const closeBtnRef = useRef(null);
    const [imageFailed, setImageFailed] = useState(false);
    const photo = useReportImageSource(getReportPhotoUrl(report));
    const [hasStreetView, setHasStreetView] = useState(true);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [ariaAnnouncement, setAriaAnnouncement] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Reset image load and collapsed states on report change
    useEffect(() => {
        setImageFailed(false);
        setIsCollapsed(false);
    }, [report?.id]);

    // Check Google Maps Street View coverage for this coordinate
    useEffect(() => {
        if (!report?.lat || !report?.lng || typeof window === 'undefined' || !window.google?.maps?.StreetViewService) {
            setHasStreetView(true);
            return;
        }

        let isCancelled = false;
        try {
            const svService = new window.google.maps.StreetViewService();
            svService.getPanorama(
                {
                    location: { lat: report.lat, lng: report.lng },
                    radius: 50,
                    preference: window.google.maps.StreetViewPreference?.NEAREST || 'nearest'
                },
                (data, status) => {
                    if (isCancelled) return;
                    if (status === window.google.maps.StreetViewStatus?.OK || status === 'OK') {
                        setHasStreetView(true);
                    } else {
                        setHasStreetView(false);
                    }
                }
            );
        } catch (_) {
            setHasStreetView(true);
        }

        return () => {
            isCancelled = true;
        };
    }, [report?.lat, report?.lng]);

    // Focus management: Focus close button on open
    useEffect(() => {
        if (isOpen) {
            setAriaAnnouncement(`Report popup open: ${report?.title || 'Report details'}`);
            const timer = setTimeout(() => {
                closeBtnRef.current?.focus();
            }, 80);
            return () => clearTimeout(timer);
        } else {
            setAriaAnnouncement('Report popup closed');
        }
    }, [isOpen, report?.id]);

    // Keyboard Escape to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                e.stopPropagation();
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen || !report) return null;

    const fullPhotoUrl = imageFailed ? null : photo.src;

    const categoryTitle = report.category || report.raw_category || report.report_type || report.title || 'Civic Infrastructure';
    const CategoryIcon = getCategoryIconComponent(categoryTitle, report.raw_category);

    const ticketId = report.ticket_id
        ? String(report.ticket_id).replace(/^#/, '')
        : `PUL-${report.id}`;

    const rawDistance = report.formattedDistance || report.dynamicDistance || report.distance;
    const cleanDistance = rawDistance ? String(rawDistance).replace(/\s*away\s*/i, '') : null;
    const distanceString = (hasLocation && cleanDistance) ? `${cleanDistance} away` : null;

    const statusObj = getFriendlyStatusName(report.status);
    const isOwner = Boolean(report.isOwnReport || report.isOwner);

    return (
        <>
            {/* Screen reader polite announcement */}
            <div className="sr-only" aria-live="polite">
                {ariaAnnouncement}
            </div>

            {/* Photo Lightbox */}
            {isLightboxOpen && fullPhotoUrl && (
                <PhotoLightbox
                    imageUrl={fullPhotoUrl}
                    alt={categoryTitle}
                    isDark={isDark}
                    onClose={() => setIsLightboxOpen(false)}
                />
            )}

            {/* Bottom Card Container — Anchored flush to left, right, and bottom on mobile */}
            <div className="absolute inset-x-0 bottom-0 pointer-events-none z-30 flex justify-center md:justify-end md:p-6">
                <motion.div
                    ref={cardRef}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby="report-popup-title"
                    layout
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    drag="y"
                    dragDirectionLock
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: isCollapsed ? 0.3 : 0, bottom: 0.7 }}
                    dragSnapToOrigin={true}
                    onDragEnd={(e, info) => {
                        // Drag down: collapse if expanded, dismiss if already collapsed
                        if (info.offset.y > 35 || info.velocity.y > 150) {
                            if (!isCollapsed) {
                                setIsCollapsed(true);
                            } else {
                                onClose();
                            }
                        } else if (info.offset.y < -35 || info.velocity.y < -150) {
                            // Drag up: expand if collapsed
                            if (isCollapsed) {
                                setIsCollapsed(false);
                            }
                        }
                    }}
                    style={{ touchAction: 'none' }}
                    className="pointer-events-auto touch-none w-full max-w-none md:max-w-[26rem] md:w-[26rem] bg-white dark:bg-[#0c1427] rounded-t-[1.5rem] rounded-b-none md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col select-none"
                >
                    {isCollapsed ? (
                        /* Collapsed View: Only Category, Report ID, and Distance */
                        <div
                            onClick={() => setIsCollapsed(false)}
                            className="p-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-3.5 flex flex-col cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 select-none"
                        >
                            {/* Top Drag Handle Pill */}
                            <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2.5" />

                            <div className="flex items-center justify-between gap-3">
                                {/* Left: Types of issues categories, report id, and distance */}
                                <div className="min-w-0 flex-1 pl-1">
                                    <h3
                                        id="report-popup-title"
                                        className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate"
                                    >
                                        {categoryTitle}
                                    </h3>
                                    <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 font-tabular tabular-nums truncate">
                                        {distanceString ? `${ticketId} · ${distanceString}` : ticketId}
                                    </p>
                                </div>

                                {/* Right: Expand & Close buttons */}
                                <div
                                    className="flex items-center gap-1.5 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsCollapsed(false)}
                                        aria-label="Expand report popup"
                                        title="Expand"
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        <ChevronUp size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close report popup"
                                        title="Close"
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 1. Photo Header (16:7 aspect ratio, 12:5 on ultra-narrow 320px) */}
                            <div className="relative w-full aspect-[16/7] max-[360px]:aspect-[12/5] bg-slate-100 dark:bg-slate-800/80 overflow-hidden shrink-0 touch-none">
                                {/* Centered Top Drag Handle Pill */}
                                <button
                                    type="button"
                                    onClick={() => setIsCollapsed(true)}
                                    aria-label="Collapse report popup"
                                    title="Collapse"
                                    className="absolute top-2 inset-x-0 z-20 flex justify-center cursor-pointer pointer-events-auto p-1 -m-1"
                                >
                                    <div className="w-10 h-1 rounded-full bg-white/90 dark:bg-white/80 shadow-sm backdrop-blur-xs" />
                                </button>

                                {fullPhotoUrl ? (
                                    <img
                                        src={fullPhotoUrl}
                                        alt={categoryTitle}
                                        draggable={false}
                                        onClick={() => setIsLightboxOpen(true)}
                                        onError={() => setImageFailed(true)}
                                        className="w-full h-full object-cover cursor-pointer select-none"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 select-none">
                                        <CategoryIcon size={34} className="text-[#ff6b00]" />
                                    </div>
                                )}

                                {/* Collapse & Close Buttons */}
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                                    <button
                                        type="button"
                                        onClick={() => setIsCollapsed(true)}
                                        aria-label="Collapse report popup"
                                        title="Collapse"
                                        className="w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-xs flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        <ChevronDown size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close report popup"
                                        title="Close"
                                        className="w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-xs flex items-center justify-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        <X size={15} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                    {/* Card Body (Scrollable at 200% text zoom) */}
                    <div className="p-4 sm:p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] md:pb-5 flex flex-col overflow-y-auto min-h-0">
                        {/* Error state */}
                        {error ? (
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                <AlertTriangle size={32} className="text-red-500 mb-2" />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    We can't load this report right now.
                                </p>
                                {onRetry && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-[#ff6b00] text-white hover:bg-[#ea580c] cursor-pointer"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* 2. Title: 22px bold category name */}
                                <h3
                                    id="report-popup-title"
                                    className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2"
                                >
                                    {categoryTitle}
                                </h3>

                                {/* 3. Community Report / Identity Protected Pill */}
                                <div className="mt-2 flex items-center">
                                    {isOwner ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-[#ff6b00] border border-orange-500/30">
                                            Your Report
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                                            <ShieldCheck size={13} className="text-slate-500 dark:text-slate-400" />
                                            Community Report · Identity Protected
                                        </span>
                                    )}
                                </div>

                                {/* 4. Details line: 14px slate tabular numbers */}
                                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-tabular tabular-nums">
                                    {distanceString ? `${ticketId} · ${distanceString}` : ticketId}
                                </p>

                                {/* 5. Status line: 14px semibold dot + text */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                            statusObj.isResolved
                                                ? 'bg-[#16a34a] dark:bg-[#22c55e]'
                                                : 'bg-[#B83A00] dark:bg-[#ff6b00]'
                                        }`}
                                    />
                                    <span
                                        className={`text-sm font-semibold ${
                                            statusObj.isResolved
                                                ? 'text-[#16a34a] dark:text-[#22c55e]'
                                                : 'text-[#B83A00] dark:text-[#ff6b00]'
                                        }`}
                                    >
                                        {statusObj.name}
                                    </span>
                                </div>

                                {/* 6. Primary Button: 3.25rem tall, solid orange, white text */}
                                <button
                                    type="button"
                                    onClick={() => onOpenReport && onOpenReport(report)}
                                    className="mt-4 w-full h-[3.25rem] min-h-[48px] rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] active:scale-[0.99] text-white font-semibold text-base flex items-center justify-center transition-all cursor-pointer shadow-md shadow-orange-500/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff6b00]"
                                >
                                    {isOwner ? 'View in My Reports' : 'View report'}
                                </button>

                                {/* 7. Text Link: Open Street View (48px tap area, centered) */}
                                <div className="mt-1 flex items-center justify-center min-h-[48px]">
                                    {hasStreetView ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenStreetView && onOpenStreetView(report)}
                                            className="text-base font-semibold text-[#0c1427] dark:text-white hover:text-[#ff6b00] dark:hover:text-[#ff6b00] transition-colors cursor-pointer py-2 px-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                        >
                                            Open Street View
                                        </button>
                                    ) : (
                                        <span className="text-sm font-medium text-slate-400 dark:text-slate-500 select-none py-2 px-4">
                                            Street View isn't available here
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                        </>
                    )}
                </motion.div>
            </div>
        </>
    );
}
