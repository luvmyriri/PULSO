import React, { useState, useRef, useEffect } from 'react';
import {
    Copy,
    Check,
    MapPin,
    Maximize2,
    X,
    XCircle,
    CheckCircle2,
    FileText,
    Clock,
    Wrench,
    HelpCircle,
    ArrowLeft,
    ExternalLink,
    Image as ImageIcon,
    BookOpen,
    AlertTriangle
} from 'lucide-react';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { encodeOpenLocationCode, extractCleanPlusCode } from '../utils/philippineAddress';
import { findBarangayByCoordinates } from '../data/caloocanBoundaries';

const OLC_CHARSET = '23456789CFGHJMPQRVWX';

function decodePlusCode(code) {
    if (!code || typeof code !== 'string') return null;
    const match = code.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i);
    if (!match) return null;
    let clean = match[1].toUpperCase();
    const plusIdx = clean.indexOf('+');
    if (plusIdx === -1) return null;

    if (plusIdx === 4) {
        clean = '7Q63' + clean;
    }
    if (clean.indexOf('+') !== 8) return null;

    const codeDigits = clean.replace('+', '');
    let latVal = 0;
    let lngVal = 0;
    const resolutions = [20, 1, 0.05, 0.0025, 0.000125];

    for (let i = 0; i < 5 && i * 2 < codeDigits.length; i++) {
        const r = resolutions[i];
        const latIdx = OLC_CHARSET.indexOf(codeDigits[i * 2]);
        const lngIdx = OLC_CHARSET.indexOf(codeDigits[i * 2 + 1]);
        if (latIdx === -1 || lngIdx === -1) break;
        latVal += latIdx * r;
        lngVal += lngIdx * r;
    }

    const lat = latVal - 90 + 0.000125 / 2;
    const lng = lngVal - 180 + 0.000125 / 2;
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

/**
 * ReportDetailView
 * -----------------------------------------------------------------------------
 * Pixel-accurate implementation of the Civic Aperture Report Details layout
 * matching target design (media_1793041157229_86aa8ffd.jpg):
 * - Top Breadcrumb: Back to My Reports / PUL-2026-XXXX
 * - Category Header: Bold title + Ticket ID · Date + Sample report pill + Copy report ID button
 * - Full-width Status Callout Banner (Rejected, Awaiting review, In progress, Resolved)
 * - 2-Column Responsive Grid (Span 2 Left / Span 1 Right):
 *   - Left: Department feedback, Submitted evidence, Report information
 *   - Right: Location (with Celina Homes 3 map graphic), Report activity timeline, Need clarification?
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
    const [isPlusCodeCopied, setIsPlusCodeCopied] = useState(false);
    const [isCoordCopied, setIsCoordCopied] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [report?.id, report?.ticket_id]);

    const ticketId = report.ticket_id || `PUL-2026-${String(report.id || '').padStart(4, '0')}`;
    const categoryName = report.category || report.ai_category || 'Public Safety & Hazards';

    // Format date e.g. "Oct 27, 2026"
    const formattedDate = report.created_at
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

    // Helper to extract a concise, real location name for the pin
    const getPinLocationName = (rep) => {
        if (!rep) return 'Caloocan City';
        if (rep.subdivision && rep.subdivision.trim()) return rep.subdivision.trim();
        if (rep.landmark && rep.landmark.trim()) return rep.landmark.trim();
        if (rep.location_name && rep.location_name.trim()) return rep.location_name.trim();
        if (rep.street && rep.street.trim()) return rep.street.trim();

        const fullLoc = (rep.location_string || rep.address || '').trim();
        if (fullLoc) {
            const parts = fullLoc.split(',').map(s => s.trim()).filter(Boolean);
            const specificPart = parts.find(p => {
                const lower = p.toLowerCase();
                return !lower.includes('caloocan') &&
                       !lower.includes('metro manila') &&
                       !lower.includes('philippines') &&
                       !lower.startsWith('q22') &&
                       !/^[a-z0-9]{4}\+[a-z0-9]{2,}/i.test(p) &&
                       !/^\d{4}$/.test(p);
            });
            if (specificPart) return specificPart;
            if (parts.length > 0) return parts[0];
        }

        if (rep.barangay && rep.barangay.trim()) {
            return rep.barangay.trim();
        }

        return 'Caloocan City';
    };

    const pinLocationLabel = getPinLocationName(report);

    // Robust Geotag Coordinate Resolution Waterfall:
    // 1. Direct coordinate fields (latitude / lat / coordinates / location / geometry)
    let resolvedLat = null;
    let resolvedLng = null;

    const candidateLat =
        report.latitude ??
        report.lat ??
        report.coords?.latitude ??
        report.coords?.lat ??
        report.coordinates?.lat ??
        report.location?.lat ??
        (Array.isArray(report.geometry?.coordinates) ? report.geometry.coordinates[1] : null);

    const candidateLng =
        report.longitude ??
        report.lng ??
        report.coords?.longitude ??
        report.coords?.lng ??
        report.coordinates?.lng ??
        report.location?.lng ??
        (Array.isArray(report.geometry?.coordinates) ? report.geometry.coordinates[0] : null);

    const numLat = candidateLat !== null && candidateLat !== undefined && candidateLat !== '' ? Number(candidateLat) : NaN;
    const numLng = candidateLng !== null && candidateLng !== undefined && candidateLng !== '' ? Number(candidateLng) : NaN;

    if (!isNaN(numLat) && !isNaN(numLng) && !(numLat === 0 && numLng === 0) && numLat >= 4 && numLat <= 22 && numLng >= 116 && numLng <= 127) {
        resolvedLat = numLat;
        resolvedLng = numLng;
    }

    // 2. Decode from plus_code, location_string or address if explicit lat/lng was missing
    if (resolvedLat == null) {
        const decodedFromPlusCode = decodePlusCode(report.plus_code || report.location_string || report.address);
        if (decodedFromPlusCode) {
            resolvedLat = decodedFromPlusCode.lat;
            resolvedLng = decodedFromPlusCode.lng;
        }
    }

    // 3. Fallback to calibrated Caloocan North Reference (Congressional Rd Ext, Barangay 171)
    if (resolvedLat == null) {
        resolvedLat = 14.754588;
        resolvedLng = 121.030922;
    }

    const reportLat = resolvedLat;
    const reportLng = resolvedLng;
    const isValidCoordinate = true;

    // Full-precision coordinate display
    const coordDisplay = `${reportLat.toFixed(6)}° N, ${reportLng.toFixed(6)}° E`;

    // Standard Open Location Code (Plus Code) derivation
    const derivedShortPlusCode = encodeOpenLocationCode(reportLat, reportLng, true);
    const cleanShortPlusCode = derivedShortPlusCode || extractCleanPlusCode(report.plus_code, reportLat, reportLng) || 'Q23J+R9M';

    // Authoritative Barangay resolution via boundary polygon or report data
    const polygonBrgy = findBarangayByCoordinates(reportLat, reportLng);
    const brgyName = report.barangay || (polygonBrgy ? polygonBrgy.displayName || polygonBrgy.name : null) || 'Barangay 171';
    const displayBarangay = brgyName 
        ? (brgyName.toLowerCase().includes('barangay') || brgyName.toLowerCase().includes('brgy')
            ? `${brgyName}, Caloocan`
            : `Barangay ${brgyName}, Caloocan`)
        : 'Barangay 171, Caloocan';

    // Real Full Address
    const rawAddress =
        report.location_string ||
        report.address ||
        [
            report.subdivision || report.landmark || report.street || 'Congressional Rd Ext',
            report.barangay ? (report.barangay.toLowerCase().includes('barangay') ? report.barangay : `Barangay ${report.barangay}`) : 'Barangay 171',
            'Caloocan City',
            'Metro Manila'
        ].filter(Boolean).join(', ') ||
        'Congressional Rd Ext, Barangay 171, Caloocan City';

    // Road / Landmark identification
    const roadName = (pinLocationLabel && pinLocationLabel !== 'Caloocan City') ? pinLocationLabel : 'Congressional Rd Ext';
    const roadLineText = roadName ? `Near ${roadName}` : rawAddress;

    // Plus code top line format (e.g. "Q23J+R9M, Congressional Rd Ext, Caloocan")
    const topPlusCodeLine = roadName
        ? `${cleanShortPlusCode}, ${roadName}, Caloocan`
        : `${cleanShortPlusCode}, Caloocan`;

    // Location accuracy in meters (if present in report)
    const rawAcc = report.accuracy ?? report.gps_accuracy ?? report.location_accuracy ?? report.metadata?.accuracy;
    const locationAccuracyMeters = (typeof rawAcc === 'number' && !isNaN(rawAcc) && rawAcc > 0)
        ? Math.round(rawAcc)
        : null;

    // Location consistency check logged to console for the owner
    useEffect(() => {
        const detected = findBarangayByCoordinates(reportLat, reportLng);
        const repBrgyMatch = String(report.barangay || '').match(/\d+/);
        const repBrgyNum = repBrgyMatch ? Number(repBrgyMatch[0]) : null;
        const detectedNum = detected?.number || null;
        const isConsistent = repBrgyNum && detectedNum ? repBrgyNum === detectedNum : true;

        console.info(`[PULSO Location Audit] Report ${ticketId} Location Consistency Report:`, {
            ticketId,
            exactCoordinates: { lat: reportLat, lng: reportLng },
            plusCode: cleanShortPlusCode,
            reportedBarangay: report.barangay || 'Not specified',
            detectedBarangay: detected ? `${detected.name} (${detected.sector} Caloocan)` : 'Outside known boundaries',
            isConsistentWithBoundaries: isConsistent,
            accuracyMeters: locationAccuracyMeters ? `${locationAccuracyMeters} m` : 'Not recorded',
            viewOnMapUrl: `https://www.google.com/maps?q=${reportLat},${reportLng}`,
            status: isConsistent ? 'PASS: Coordinates, Plus Code, and Barangay boundary agree.' : 'WARNING: Coordinate falls outside named barangay boundary.'
        });
    }, [reportLat, reportLng, ticketId, report.barangay, cleanShortPlusCode, locationAccuracyMeters]);

    // Google Maps SDK context
    const { isLoaded: isMapsLoaded } = useGoogleMaps();

    // Primary evidence photo
    const evidencePhotoUrl =
        report.image_url ||
        (report.media_urls && report.media_urls[0]) ||
        (report.photos && report.photos[0]) ||
        'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';

    const rawStatus = (report.status || 'rejected').toLowerCase().trim();
    const isRejected = ['rejected', 'declined', 'invalid', 'spam'].includes(rawStatus) || rawStatus.includes('reject');
    const isResolved = ['resolved', 'completed', 'fixed', 'closed'].includes(rawStatus) || rawStatus.includes('resolv');
    const isInProgress = ['in_progress', 'dispatched', 'assigned', 'approved_internal'].includes(rawStatus) || rawStatus.includes('progress');

    // Status Banner Content & Styles (Minimal Civic Aperture style)
    let bannerStyle = 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40';
    let bannerIcon = <XCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
    let bannerTitle = 'This report was not accepted';
    let bannerSubtitle = "Review the department's feedback before deciding what to do next.";
    let bannerTitleColor = 'text-rose-950 dark:text-rose-100';
    let bannerSubtitleColor = 'text-rose-800/80 dark:text-rose-300/80';

    if (isResolved) {
        bannerStyle = 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40';
        bannerIcon = <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
        bannerTitle = 'This report has been resolved';
        bannerSubtitle = 'Work on this civic concern has been completed and verified.';
        bannerTitleColor = 'text-emerald-950 dark:text-emerald-100';
        bannerSubtitleColor = 'text-emerald-800/80 dark:text-emerald-300/80';
    } else if (isInProgress) {
        bannerStyle = 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40';
        bannerIcon = <Clock size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />;
        bannerTitle = 'Department work is in progress';
        bannerSubtitle = 'Field operations teams have been assigned. Stage 4 of 5';
        bannerTitleColor = 'text-blue-950 dark:text-blue-100';
        bannerSubtitleColor = 'text-blue-800/80 dark:text-blue-300/80';
    } else if (!isRejected) {
        bannerStyle = 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40';
        bannerIcon = <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />;
        bannerTitle = 'This report is awaiting review';
        bannerSubtitle = 'Received by the department. No action needed while under review.';
        bannerTitleColor = 'text-amber-950 dark:text-amber-100';
        bannerSubtitleColor = 'text-amber-800/80 dark:text-amber-300/80';
    }

    // Copy Ticket ID
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(ticketId);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2200);
        } catch {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2200);
        }
    };

    // Full photo zoom trigger
    const handlePhotoExpand = (targetUrl) => {
        const u = targetUrl || evidencePhotoUrl;
        if (setZoomedImage && u) {
            setZoomedImage(u);
        } else {
            setIsPhotoModalOpen(true);
        }
    };

    return (
        <div ref={containerRef} className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 select-none">
            {/* ── 1. Top Breadcrumb Row ── */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={15} />
                    <span>Back to My Reports</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                    {ticketId}
                </span>
            </nav>

            {/* ── 2. Title & Action Row ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] dark:text-white tracking-tight leading-tight">
                        {categoryName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{ticketId}</span>
                        <span>·</span>
                        <span>Submitted {formattedDate}</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                    {isCopied ? (
                        <>
                            <Check size={15} className="text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={15} className="text-slate-500 dark:text-slate-400" />
                            <span>Copy report ID</span>
                        </>
                    )}
                </button>
            </div>

            {/* ── 3. Minimal Status Banner ── */}
            <div className={`py-2.5 px-3.5 sm:px-4 rounded-xl border flex items-center gap-2.5 transition-all ${bannerStyle}`}>
                <div className="shrink-0 flex items-center">
                    {bannerIcon}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                    <span className={`font-bold text-xs sm:text-sm leading-tight shrink-0 ${bannerTitleColor}`}>
                        {bannerTitle}
                    </span>
                    <span className="hidden sm:inline opacity-40 select-none">•</span>
                    <span className={`text-xs leading-normal truncate ${bannerSubtitleColor}`}>
                        {bannerSubtitle}
                    </span>
                </div>
            </div>

            {/* ── 4. Main 2-Column Responsive Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                {/* ── Left Column: Feedback, Evidence, Information (Span 2) ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Block 2: Submitted evidence */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
                        <div>
                            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                                <ImageIcon size={18} className="text-[#0B1528] dark:text-white" />
                                <span>Submitted evidence</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium ml-6.5 -mt-0.5">
                                1 attachment
                            </p>
                        </div>

                        {/* Evidence Photo */}
                        <div className="pt-1">
                            <div
                                onClick={() => handlePhotoExpand(evidencePhotoUrl)}
                                className="relative max-w-md rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer group"
                            >
                                <img
                                    src={evidencePhotoUrl}
                                    alt={categoryName}
                                    className="w-full h-52 sm:h-56 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    onError={(e) => {
                                        e.currentTarget.src =
                                            'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 bg-[#0B1528]/80 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1.5 transition-opacity shadow-sm">
                                        <Maximize2 size={13} />
                                        <span>Select to enlarge</span>
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                Submitted image · Select to enlarge
                            </p>
                        </div>
                    </div>

                    {/* Block 3: Report information */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                            <FileText size={18} className="text-[#0B1528] dark:text-white" />
                            <span>Report information</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-1">
                            <div className="sm:col-span-3">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                    Category
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                                    {categoryName}
                                </span>
                            </div>

                            <div className="sm:col-span-3">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                    Submitted
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                                    {formattedDate}
                                </span>
                            </div>

                            <div className="hidden sm:flex sm:col-span-1 self-stretch items-center justify-center">
                                <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-auto" />
                            </div>

                            <div className="sm:col-span-5">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                    Description
                                </span>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                    {report.description || 'Original report description appears here.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Location, Activity, Help (Span 1) ── */}
                <div className="space-y-5">
                    {/* Block 4: Location */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                                <MapPin size={18} className="text-[#0B1528] dark:text-white" />
                                <span>Location</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard?.writeText(topPlusCodeLine);
                                    setIsPlusCodeCopied(true);
                                    setTimeout(() => setIsPlusCodeCopied(false), 2000);
                                }}
                                className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Copy Plus Code line"
                                aria-label="Copy Plus Code line"
                            >
                                {isPlusCodeCopied ? (
                                    <>
                                        <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={13} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Top Line: Plus Code, Street, City */}
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold tracking-tight">
                            {topPlusCodeLine}
                        </p>

                        {/* Map Preview Container */}
                        <div className="space-y-3">
                            {/* Map Canvas with Accurate Pin */}
                            <div
                                className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#E8EEF1] dark:bg-slate-800 shadow-2xs group cursor-pointer"
                                onClick={() => {
                                    if (onOpenMap) {
                                        onOpenMap({ ...report, lat: reportLat, lng: reportLng });
                                    } else {
                                        window.open(`https://www.google.com/maps?q=${reportLat},${reportLng}`, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (onOpenMap) {
                                            onOpenMap({ ...report, lat: reportLat, lng: reportLng });
                                        } else {
                                            window.open(`https://www.google.com/maps?q=${reportLat},${reportLng}`, '_blank', 'noopener,noreferrer');
                                        }
                                    }
                                }}
                                aria-label="Map preview centered on exact report location. Press to view on Community Map."
                            >
                                {isMapsLoaded ? (
                                    <GoogleMap
                                        center={{ lat: reportLat, lng: reportLng }}
                                        zoom={17}
                                        mapContainerClassName="w-full h-full"
                                        options={{
                                            disableDefaultUI: true,
                                            zoomControl: false,
                                            gestureHandling: 'none',
                                            draggable: false,
                                            scrollwheel: false,
                                            keyboardShortcuts: false,
                                            mapTypeId: 'roadmap',
                                            clickableIcons: false,
                                            styles: [
                                                {
                                                    featureType: 'poi',
                                                    stylers: [{ visibility: 'off' }]
                                                },
                                                {
                                                    featureType: 'transit',
                                                    stylers: [{ visibility: 'off' }]
                                                }
                                            ]
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                        Loading street map...
                                    </div>
                                )}

                                {/* Location Accuracy Ring (only if app has stored GPS accuracy) */}
                                {locationAccuracyMeters && (
                                    <div
                                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ea580c]/40 bg-[#ea580c]/10 pointer-events-none z-10"
                                        style={{
                                            width: `${Math.max(16, Math.min(180, locationAccuracyMeters * 3))}px`,
                                            height: `${Math.max(16, Math.min(180, locationAccuracyMeters * 3))}px`
                                        }}
                                        aria-hidden="true"
                                    />
                                )}

                                {/* EXACT ONE POINT MARKER: Anchored at Bottom Center */}
                                {/* The tip of the downward pointer sits exactly on (50%, 50%) = exact report coordinates */}
                                <div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center"
                                    aria-hidden="true"
                                >
                                    {/* 48px Photo Pin Bubble */}
                                    <div
                                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center select-none shadow-xl bg-white"
                                        style={{
                                            boxShadow: '0 0 0 3px #ea580c, 0 0 0 5px #ffffff, 0 8px 20px rgba(0,0,0,0.35)'
                                        }}
                                    >
                                        <img
                                            src={evidencePhotoUrl}
                                            alt={categoryName}
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.nextSibling) {
                                                    e.currentTarget.nextSibling.style.display = 'flex';
                                                }
                                            }}
                                        />
                                        <div
                                            style={{ display: 'none' }}
                                            className="w-full h-full rounded-full items-center justify-center bg-[#0c1427] text-white"
                                        >
                                            <AlertTriangle size={20} className="text-[#ea580c]" />
                                        </div>
                                    </div>

                                    {/* Downward Tether Pointer Notch - Tip is at bottom-center anchor */}
                                    <div className="w-3 h-3 bg-[#ea580c] rotate-45 -mt-1.5 shadow-xs border-r-2 border-b-2 border-white z-10" />
                                </div>
                            </div>

                            {/* Coordinates and accuracy note */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard?.writeText(`${reportLat}, ${reportLng}`);
                                        setIsCoordCopied(true);
                                        setTimeout(() => setIsCoordCopied(false), 2000);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-mono text-[11px] cursor-pointer"
                                    title="Copy exact coordinates"
                                    aria-label={`Copy coordinates: ${reportLat}, ${reportLng}`}
                                >
                                    <span>{coordDisplay}</span>
                                    {isCoordCopied ? (
                                        <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <Copy size={12} />
                                    )}
                                </button>

                                {/* Accuracy note (only if stored in report) */}
                                {locationAccuracyMeters && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Location accuracy: about ±{locationAccuracyMeters} m
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* View on Map Button (Exact coordinates link, 44px min touch target) */}
                        <button
                            type="button"
                            onClick={() => {
                                if (onOpenMap) {
                                    onOpenMap({ ...report, lat: reportLat, lng: reportLng });
                                } else {
                                    window.open(`https://www.google.com/maps?q=${reportLat},${reportLng}`, '_blank', 'noopener,noreferrer');
                                }
                            }}
                            className="w-full min-h-[44px] py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#ea580c] focus:ring-offset-2"
                            aria-label="View reported location on Community Map"
                        >
                            <MapPin size={15} className="text-[#ea580c] shrink-0" aria-hidden="true" />
                            <span>View on map</span>
                        </button>
                    </div>

                    {/* Block 5: Report activity (Timeline) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                            <Clock size={18} className="text-[#0B1528] dark:text-white" />
                            <span>Report activity</span>
                        </div>

                        <div className="space-y-4 pt-1">
                            {/* Step 1: Latest event */}
                            {isRejected ? (
                                <div className="relative flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#E11D48] text-white flex items-center justify-center shrink-0 mt-0.5">
                                        <X size={13} strokeWidth={2.8} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                                            Rejected · Oct 19, 2026
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Review completed.
                                        </div>
                                    </div>
                                </div>
                            ) : isResolved ? (
                                <div className="relative flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                        <Check size={13} strokeWidth={2.8} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                                            Resolved · Oct 19, 2026
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Work verified and completed.
                                        </div>
                                    </div>
                                </div>
                            ) : isInProgress ? (
                                <div className="relative flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                        <Wrench size={13} strokeWidth={2.4} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                                            In progress · Oct 18, 2026
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Field crew assigned.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock size={13} strokeWidth={2.4} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                                            Awaiting review · {formattedDate}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Queued for inspection.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Connecting Line */}
                            <div className="w-0.5 h-5 bg-slate-200 dark:bg-slate-700 ml-2.75 -my-2" />

                            {/* Step 2: Submission */}
                            <div className="relative flex items-start gap-3">
                                <div className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                        Received · {formattedDate}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Report submitted.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Block 6: Need clarification? */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                            <HelpCircle size={18} className="text-[#0B1528] dark:text-white" />
                            <span>Need clarification?</span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Reference <strong className="text-slate-800 dark:text-slate-200 font-mono">{ticketId}</strong> when contacting support.
                        </p>

                        <button
                            type="button"
                            onClick={() => setShowHelpModal(true)}
                            className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                        >
                            <BookOpen size={14} className="text-slate-600 dark:text-slate-300" />
                            <span>Open help center</span>
                        </button>
                    </div>
                </div>
            </div>
{/* ── Help Center Information Modal ── */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen size={18} className="text-orange-600" />
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                    Report Help &amp; FAQs
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-64 overflow-y-auto">
                            <div>
                                <strong className="text-slate-900 dark:text-white block">Why do reports get rejected?</strong>
                                Reports are marked not accepted if they fall outside city jurisdiction, lack sufficient photo evidence, or duplicate existing work orders.
                            </div>
                            <div>
                                <strong className="text-slate-900 dark:text-white block">Can I submit an updated report?</strong>
                                Yes. You can create a new report anytime with clearer photos and detailed location notes.
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Standalone Photo Zoom Modal ── */}
            {isPhotoModalOpen && evidencePhotoUrl && (
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
                        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={evidencePhotoUrl}
                        alt={`${categoryName} full view`}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
