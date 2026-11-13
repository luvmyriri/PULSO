import { useTranslation } from 'react-i18next';
import ResidentInformationReply from './ResidentInformationReply';
import { API_BASE_URL } from '../utils/apiBase';
import { useGovernmentData } from '../utils/governmentApi';
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
import { cleanResidentAddress } from '../utils/locationPrivacy';

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
 *   - Right: Location and clarification help
 */
function ReportDetailViewContent({
    report,
    onBack,
    onOpenMap,
    setZoomedImage,
    onReportUpdated,
    onRefreshReport
}) {

    const { t } = useTranslation();
    const [informationReceipt, setInformationReceipt] = useState(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const containerRef = useRef(null);
    const [imageFailed, setImageFailed] = useState(false);
    const activity = useGovernmentData(Number.isInteger(Number(report.id)) && !report.is_sample ? `/api/reports/${report.id}/timeline` : null);
    useEffect(() => { setImageFailed(false); }, [report.id, report.image_url]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            containerRef.current?.querySelector('h1')?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [report?.id, report?.ticket_id]);

    const ticketId = report.ticket_id || `Report ${report.id}`;
    const categoryName = report.categories?.length ? report.categories.join(' + ') : report.category || report.ai_category || 'Public Safety & Hazards';

    // Format date e.g. "Oct 27, 2026"
    const formattedDate = report.created_at
        ? new Date(report.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
          })
        : 'Date not recorded';

    // Robust Geotag Coordinate Resolution Waterfall:
    // 1. Direct coordinate fields (latitude / lat / coordinates / location / geometry)
    let resolvedLat = null;
    let resolvedLng = null;

    const candidateLat =
        report.location_lat ??
        report.latitude ??
        report.lat ??
        report.coords?.latitude ??
        report.coords?.lat ??
        report.coordinates?.lat ??
        report.location?.lat ??
        (Array.isArray(report.geometry?.coordinates) ? report.geometry.coordinates[1] : null);

    const candidateLng =
        report.location_lng ??
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

    const reportLat = resolvedLat;
    const reportLng = resolvedLng;
    const isValidCoordinate = Number.isFinite(reportLat) && Number.isFinite(reportLng);
    const rawAddress = cleanResidentAddress(report.location_string || report.address || report.location_barangay || report.barangay) || t('locationPrivacy.empty');
    const locationAccuracyMeters = report.accuracy_m > 0 ? Math.round(report.accuracy_m) : null;

    // Google Maps SDK context
    const { isLoaded: isMapsLoaded } = useGoogleMaps();

    // Primary evidence photo
    const imageSource = report.image_url || report.media_urls?.[0] || report.photos?.[0] || null;
    const evidencePhotoUrl = imageSource?.startsWith('/') ? `${API_BASE_URL}${imageSource}` : imageSource;
    // Retain the server-confirmed reply status while the detail refresh is pending
    // or unavailable. A newer report revision takes precedence over this receipt.
    const confirmedStatus = informationReceipt?.previousUpdatedAt === report.updated_at ? informationReceipt?.status : null;
    const rawStatus = (confirmedStatus || report.status || 'Not recorded').toLowerCase().trim();
    const isRejected = ['rejected', 'declined', 'invalid', 'spam'].includes(rawStatus);
    const isResolved = ['resolved', 'closed'].includes(rawStatus);
    const isInProgress = ['in_progress', 'dispatched'].includes(rawStatus);

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
        bannerSubtitle = 'The department has recorded this concern as resolved.';
        bannerTitleColor = 'text-emerald-950 dark:text-emerald-100';
        bannerSubtitleColor = 'text-emerald-800/80 dark:text-emerald-300/80';
    } else if (isInProgress) {
        bannerStyle = 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40';
        bannerIcon = <Clock size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />;
        bannerTitle = 'Department work is in progress';
        bannerSubtitle = 'The department has recorded work in progress on this concern.';
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

    if (!isRejected && !isResolved && !isInProgress && !['pending', 'received', 'unverified'].includes(rawStatus)) {
        bannerTitle = `Report status: ${rawStatus.replaceAll('_', ' ')}`;
        bannerSubtitle = rawStatus === 'needs_information' ? t('informationReply.banner') : 'See the recorded department activity below.';
        if (rawStatus === 'needs_information') bannerTitle = t('informationReply.title');
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
                    <h1 tabIndex={-1} className="focus-visible:outline-3 focus-visible:outline-blue-600 text-2xl sm:text-3xl font-extrabold text-[#0B1528] dark:text-white tracking-tight leading-tight">
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

            {informationReceipt && rawStatus !== 'needs_information' && <p role="status" className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">{t('informationReply.success')}</p>}

            {/* ── 4. Main 2-Column Responsive Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                {/* ── Left Column: Feedback, Evidence, Information (Span 2) ── */}
                <div className="lg:col-span-2 space-y-5">
                    {rawStatus === 'needs_information' && <ResidentInformationReply
                        key={report.id}
                        report={report}
                        activity={activity}
                        onRefreshReport={onRefreshReport}
                        onSubmitted={result => {
                            setInformationReceipt({ status: result.status, previousUpdatedAt: report.updated_at });
                            activity.reload();
                            onReportUpdated?.(result);
                        }}
                    />}


                    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
                        <h2 className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white"><ImageIcon size={18}/>Submitted evidence</h2>
                        {evidencePhotoUrl && !imageFailed ? <>
                            <button type="button" onClick={() => handlePhotoExpand(evidencePhotoUrl)} className="block w-full max-w-md rounded-xl overflow-hidden focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-4">
                                <img src={evidencePhotoUrl} alt={`Submitted evidence for ${categoryName}`} className="w-full h-52 sm:h-56 object-contain" onError={() => setImageFailed(true)}/>
                            </button>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Submitted image · Select to enlarge</p>
                        </> : <p className="text-sm text-slate-600 dark:text-slate-300">{imageFailed ? 'The submitted image could not be loaded.' : 'No image was attached to this report.'}</p>}
                    </section>

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
                    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                        <h2 className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white"><MapPin size={18}/>Location</h2>
                        <p className="text-sm text-slate-700 dark:text-slate-200 break-words">{rawAddress}</p>
                        {isValidCoordinate ? <>
                            {isMapsLoaded && <div className="h-48 rounded-xl overflow-hidden" aria-label="Reported location map">
                                <GoogleMap center={{lat:reportLat,lng:reportLng}} zoom={16} mapContainerClassName="w-full h-full" options={{disableDefaultUI:true,gestureHandling:'none',keyboardShortcuts:false,clickableIcons:false}}/>
                            </div>}
                            {locationAccuracyMeters && <p className="text-xs text-slate-600 dark:text-slate-300">Recorded accuracy: ±{locationAccuracyMeters} m</p>}
                            <button type="button" onClick={() => onOpenMap ? onOpenMap({...report,lat:reportLat,lng:reportLng}) : window.open(`https://www.google.com/maps?q=${reportLat},${reportLng}`, '_blank', 'noopener,noreferrer')} className="min-h-11 w-full px-4 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-sm focus-visible:outline-3 focus-visible:outline-blue-600">View on map</button>
                        </> : <p className="text-xs text-slate-600 dark:text-slate-300">Coordinates not recorded. The address above remains available.</p>}
                    </section>

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

export default function ReportDetailView(props) {
    return props.report ? <ReportDetailViewContent {...props}/> : null;
}
