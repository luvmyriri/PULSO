import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Users, Database, LifeBuoy, SlidersHorizontal, BarChart2, Building2, Settings, ChevronRight, ChevronDown, ChevronUp, X, Camera, MapPin, PhoneCall, Search, BookOpen, ShieldCheck, Plus, Info, Droplets, Zap, FileText, AlertTriangle, Map as MapIcon, Monitor, ShieldAlert, Lock, Shield, Check, MicOff, Volume2, Landmark, Lightbulb, Cone, Edit3, Wrench, HelpCircle, Signpost } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from "../../utils/apiBase";
import NearbyIssuesMapModal from "../../components/NearbyIssuesMapModal";
import QuickReportWizardModal from "../../components/QuickReportWizardModal";
import { COMBINED_CALOOCAN_BOUNDS } from "../../data/caloocanBoundaries";
import { EMERGENCY_HOTLINES, LGU_SERVICES_LIST } from './residentConstants';

// Rich metadata for each report category — color + info popover content
const CATEGORY_META = {
    'Water Supply & Distribution': {
        color: 'blue',
        icon: <Droplets size={20} strokeWidth={1.7} />,
        scope: [
            'De-clogging of blocked canals, storm drains, and manholes',
            'Localized flooding and estero flood control (city jurisdiction)',
            'Broken city pipes, water fountains, and public drainage infrastructure',
            'Note: Potable water main lines (Maynilad) are reported for coordination',
        ],
    },
    'Power & Street Lighting': {
        color: 'yellow',
        icon: <Lightbulb size={20} strokeWidth={1.7} />,
        scope: [
            'Installation and replacement of burned-out streetlight bulbs',
            'Repair of city-owned electrical wiring and lamp posts',
            'Ensuring nighttime safety along city and barangay roads',
        ],
    },
    'Roads & Bridges': {
        color: 'orange',
        icon: <Cone size={20} strokeWidth={1.7} />,
        scope: [
            'Local city roads and barangay road repair',
            'Pothole patching, asphalt cracking, and broken pavement',
            'Damaged footbridges, pedestrian crossings, and curbs',
            'Sidewalk cracks and carriageway obstructions',
        ],
    },
    'Traffic & Road Signs': {
        color: 'purple',
        icon: <Signpost size={20} strokeWidth={1.7} />,
        scope: [
            'Broken or malfunctioning traffic light signals and timers',
            'Missing, damaged, or obscured regulatory street signs',
            'Damaged median railings, bollards, and lane markers',
            'Street nameplates and directional civic signage',
        ],
    },
    'Public Safety & Hazards': {
        color: 'red',
        icon: <ShieldAlert size={20} strokeWidth={1.7} />,
        scope: [
            'Structural safety inspection of buildings and retaining walls',
            'Debris and fallen tree clearing along roadways after typhoons',
            'Immediate public safety hazards and carriageway obstacles',
            'Building permit and national building code safety violations',
        ],
    },
    'Public Buildings & Facilities': {
        color: 'indigo',
        icon: <Building2 size={20} strokeWidth={1.7} />,
        scope: [
            'Construction and maintenance of public school buildings',
            'Barangay health centers and City Hall facility repairs',
            'Basketball courts, public plazas, and community playgrounds',
            'Covered courts, parks, and other city-owned facilities',
        ],
    },
    'Others': {
        color: 'purple',
        icon: <HelpCircle size={20} strokeWidth={1.7} />,
        scope: [
            'General civic infrastructure concerns not covered by defined categories',
            'Uncategorized city engineering maintenance requests',
            'Cross-departmental issues requiring dispatcher manual review',
            'Note: Detailed description in Additional Notes is required for routing',
        ],
    },
};

// Backward-compatible category aliases
CATEGORY_META['Water Supply Network'] = CATEGORY_META['Water Supply & Distribution'];

CATEGORY_META['Water & Drainage'] = CATEGORY_META['Water Supply & Distribution'];

CATEGORY_META['Water Pipeline'] = CATEGORY_META['Water Supply & Distribution'];

CATEGORY_META['Water pipeline'] = CATEGORY_META['Water Supply & Distribution'];

CATEGORY_META['Roads & Drainage'] = CATEGORY_META['Roads & Bridges'];

CATEGORY_META['Public Safety & Regulatory'] = CATEGORY_META['Public Safety & Hazards'];

CATEGORY_META['Public Facilities'] = CATEGORY_META['Public Buildings & Facilities'];

CATEGORY_META['Public Facilities & Buildings'] = CATEGORY_META['Public Buildings & Facilities'];

CATEGORY_META['Street Lighting & Power'] = CATEGORY_META['Power & Street Lighting'];

CATEGORY_META['Street Lighting'] = CATEGORY_META['Power & Street Lighting'];

const COLOR_MAP = {
    orange: { ring: 'ring-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/15', dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-400', badge: 'bg-orange-500' },
    blue: { ring: 'ring-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/15', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-400', badge: 'bg-blue-500' },
    yellow: { ring: 'ring-yellow-500', bg: 'bg-yellow-500/10 dark:bg-yellow-500/15', dot: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-400', badge: 'bg-yellow-500' },
    red: { ring: 'ring-red-500', bg: 'bg-red-500/10 dark:bg-red-500/15', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-400', badge: 'bg-red-500' },
    green: { ring: 'ring-green-500', bg: 'bg-green-500/10 dark:bg-green-500/15', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-400', badge: 'bg-green-500' },
    purple: { ring: 'ring-purple-500', bg: 'bg-purple-500/10 dark:bg-purple-500/15', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-400', badge: 'bg-purple-500' },
    indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-400', badge: 'bg-indigo-500' },
};

const ReportCategoryRadio = ({ value, onChange, options, disabled = false, disabledReason = '' }) => {
    const [tooltip, setTooltip] = useState(null); // key of open tooltip
    const tooltipRef = useRef(null);

    // Ensure array format for toggling
    const selectedOptions = Array.isArray(value) ? value : (value ? [value] : []);

    useEffect(() => {
        const handler = e => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setTooltip(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleToggle = (opt) => {
        if (disabled) return;
        if (selectedOptions.includes(opt)) {
            onChange(selectedOptions.filter(v => v !== opt));
        } else {
            if (selectedOptions.length < 3) {
                onChange([...selectedOptions, opt]);
            }
        }
    };

    return (
        <div className={`space-y-2.5 transition-opacity duration-200 ${disabled ? 'cursor-not-allowed select-none' : ''}`}>
            {/* Header with Live Counter */}
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                    <p className={`text-[12px] font-bold uppercase tracking-wider ${disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        Issue Category
                    </p>
                    <span className={`text-[11px] ${
                        disabledReason
                            ? (disabledReason.includes('photo of the problem') || disabledReason.includes('Invalid')
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : 'text-amber-600 dark:text-amber-400 font-semibold')
                            : 'text-slate-500 dark:text-slate-400 font-semibold'
                    } flex items-center gap-1`}>
                        {disabledReason ? (
                            <>
                                {disabledReason.includes('photo') && !disabledReason.includes('problem') ? (
                                    <Camera size={12} className="inline shrink-0" />
                                ) : (
                                    <AlertTriangle size={12} className="inline shrink-0" />
                                )}
                                <span>{disabledReason}</span>
                            </>
                        ) : (
                            '(Required)'
                        )}
                    </span>
                </div>
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                    disabled
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                        : selectedOptions.length === 3
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                            : selectedOptions.length > 0
                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                    {disabled && <Lock size={10} className="inline shrink-0" />}
                    {disabled ? 'Locked' : `${selectedOptions.length}/3 selected`}
                </span>
            </div>

            {/* Accessible Single-Line Category Cards */}
            <div className="flex flex-col gap-1 sm:gap-1.5 max-h-[295px] sm:max-h-[315px] overflow-y-auto pr-1 scrollbar-thin" ref={tooltipRef}>
                {options.map((optObj, index) => {
                    const opt = typeof optObj === 'string' ? optObj : optObj.value;
                    const label = typeof optObj === 'string' ? optObj : optObj.label;
                    const meta = CATEGORY_META[opt] || CATEGORY_META['Roads & Bridges'] || CATEGORY_META['Roads & Drainage'];
                    const clr = COLOR_MAP[meta?.color] || COLOR_MAP.orange;
                    const selected = selectedOptions.includes(opt);
                    const infoOpen = tooltip === opt;
                    const atCapacity = !selected && selectedOptions.length >= 3;
                    const isTopRow = index < 2;

                    return (
                        <div key={opt} className={`relative group w-full ${disabled ? 'cursor-not-allowed' : ''}`} title={disabled ? (disabledReason || 'Please capture photo first to select categories') : undefined}>
                            <div
                                onClick={() => {
                                    if (!disabled && !atCapacity) {
                                        handleToggle(opt);
                                        setTooltip(null);
                                    }
                                }}
                                aria-disabled={disabled}
                                className={`flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[40px] rounded-xl border transition-all duration-150 select-none w-full ${
                                    disabled
                                        ? 'border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-slate-900/50 opacity-40 grayscale cursor-not-allowed text-slate-400 dark:text-slate-600 pointer-events-none'
                                        : selected
                                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/15 ring-2 ring-orange-500/40 text-slate-900 dark:text-white shadow-xs'
                                            : atCapacity
                                                ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                                : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:shadow-xs cursor-pointer'
                                }`}
                                title={disabled ? (disabledReason || 'Please capture photo of the problem to select categories') : atCapacity ? 'Maximum 3 categories selected' : undefined}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className={`p-1 sm:p-1.5 rounded-lg shrink-0 transition-colors ${
                                        disabled
                                            ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600'
                                            : selected
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:text-orange-500'
                                    }`}>
                                        {meta?.icon}
                                    </div>

                                    <span className={`text-xs sm:text-[13px] font-bold whitespace-nowrap truncate ${
                                        disabled
                                            ? 'text-slate-400 dark:text-slate-600'
                                            : selected
                                                ? 'text-orange-950 dark:text-orange-100 font-extrabold'
                                                : 'text-slate-900 dark:text-slate-100'
                                    }`}>
                                        {label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {selected && !disabled && (
                                        <span className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs">
                                            <Check size={11} strokeWidth={3} />
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={e => {
                                            e.stopPropagation();
                                            if (!disabled) setTooltip(infoOpen ? null : opt);
                                        }}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-colors shrink-0 ${
                                            disabled
                                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed pointer-events-none'
                                                : infoOpen
                                                    ? 'bg-orange-500 text-white'
                                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                        title="View jurisdiction & scope"
                                    >
                                        <Info size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Info Popover with Theme-Aware Light/Dark Colors */}
                            <AnimatePresence>
                                {infoOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: isTopRow ? -5 : 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: isTopRow ? -5 : 5 }}
                                        className={`absolute right-0 ${
                                            isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'
                                        } z-[120] w-[calc(100vw-3rem)] max-w-xs sm:w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 pointer-events-auto`}
                                    >
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-orange-500">{meta.icon}</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{label}</span>
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Scope of Jurisdiction</p>
                                        <ul className="space-y-1.5">
                                            {meta.scope.map((line, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">
                                                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${clr.badge} shrink-0`} />
                                                    <span>{line}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ResidentModals = ({
    activeModal, setActiveModal, selectedPost, setSelectedPost, isLoaded, loadError, map, setMap, panorama, setPanorama, reportLocation, setReportLocation,
    locationAddress, setLocationAddress, plusCode, setPlusCode, geocodingAddress, structuredAddress, setStructuredAddress, reportCategory, setReportCategory, reportNotes, setReportNotes, selectedImage, setSelectedImage,
    submittingReport, handleFileReport, isSelectingLocation, setIsSelectingLocation, isIDCameraOpen, setIsIDCameraOpen, checkJurisdiction,
    reverseGeocode, mapOptions, pulseRadius, processedHazards, reportsLoading, reportsError, onRetryReports, selectedHazard, setSelectedHazard, svLocation, handleStreetViewClick,
    getIconForCategory, getMarkerSVG, getCategoryColor, mapFilter, setMapFilter,
    isAnalyzing, aiFeedback, setAiFeedback,
    reportToCancel, setReportToCancel, confirmCancelReport,
    isSubmitConfirmOpen, setIsSubmitConfirmOpen, actuallySubmitReport,
    setZoomedImage,
    photoPinIcons, getCachedIcon, theme, borderData,
    isLocating, locatingStep, requestDeviceLocation, isTrackingLocation, startDeviceLocationTracking, stopDeviceLocationTracking,
    locationPermissionDenied, photoMetadata, setPhotoMetadata,
    showHeatmap, setShowHeatmap,
    mapLayerType, setMapLayerType,
    mapCategoryFilter, setMapCategoryFilter,
    heatmapPoints, mapFilteredHazards,
    showToast,
    t,
    handleQuickReportSubmit,
    currentUser,
    setActiveTab,
    setSelectedReportForDetails,
    setIsAIChatOpen
}) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const [isSvFullscreen, setIsSvFullscreen] = useState(false);
    const [currentMapZoom, setCurrentMapZoom] = useState(11);
    const [activeSector, setActiveSector] = useState('all');
    const [helpSearchQuery, setHelpSearchQuery] = useState('');
    const [expandedFaqId, setExpandedFaqId] = useState(1);
    const [dontShowGuideAgain, setDontShowGuideAgain] = useState(() => {
        try {
            return localStorage.getItem('pulso_hide_reporting_guide') === 'true';
        } catch (_) {
            return false;
        }
    });

    const handleToggleGuidePreference = (checked) => {
        setDontShowGuideAgain(checked);
        try {
            if (checked) {
                localStorage.setItem('pulso_hide_reporting_guide', 'true');
            } else {
                localStorage.removeItem('pulso_hide_reporting_guide');
            }
        } catch (_) {}
    };

    // Auto-reset fullscreen when Street View closes
    useEffect(() => {
        if (!svLocation) {
            setIsSvFullscreen(false);
        }
    }, [svLocation]);

    // Memoized District & Barangay Boundary Polygon Options matching Government Dispatcher GIS Map
    const northPolygonOptions = React.useMemo(() => ({
        strokeColor: '#f97316',
        strokeOpacity: activeSector === 'south' ? 0.35 : 1.0,
        strokeWeight: activeSector === 'north' ? 2.5 : 2.2,
        fillColor: '#f97316',
        fillOpacity: activeSector === 'south' ? 0.02 : (theme === 'dark' ? 0.10 : 0.06),
        clickable: false,
        zIndex: activeSector === 'north' ? 3 : 2,
    }), [theme, activeSector]);

    const southPolygonOptions = React.useMemo(() => ({
        strokeColor: '#ff6b00',
        strokeOpacity: activeSector === 'north' ? 0.35 : 1.0,
        strokeWeight: activeSector === 'south' ? 2.5 : 2.2,
        fillColor: '#ff6b00',
        fillOpacity: activeSector === 'north' ? 0.02 : (theme === 'dark' ? 0.08 : 0.05),
        clickable: false,
        zIndex: activeSector === 'south' ? 3 : 1,
    }), [theme, activeSector]);

    // Pre-indexed memoized barangay polygons (only instantiated once from GeoJSON)
    const memoizedBarangayPolygons = React.useMemo(() => {
        if (!borderData?.features || borderData.features.length === 0) return [];
        return borderData.features.map((feature, i) => {
            const isNorth = (feature.properties?.sector || '') === 'North';
            const paths = feature.geometry?.type === 'MultiPolygon'
                ? feature.geometry.coordinates.map(poly => poly[0].map(c => ({ lng: c[0], lat: c[1] })))
                : [feature.geometry?.coordinates?.[0]?.map(c => ({ lng: c[0], lat: c[1] })) || []];
            return { id: `brgy-${i}`, isNorth, paths };
        });
    }, [borderData]);



    // Default Map View: Frame full Caloocan bounds (North + South) when opening maps
    useEffect(() => {
        if (activeModal === 'map' && map && window.google && window.google.maps) {
            const bounds = new window.google.maps.LatLngBounds(
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
                new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
            );
            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }
    }, [activeModal, map]);

    // Stop listening if modal closes
    useEffect(() => {
        if (!activeModal && recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, [activeModal, isListening]);

    // Map Categories Horizontal Scroll State & Controls
    const mapCategoryScrollRef = useRef(null);
    const [canScrollMapCatLeft, setCanScrollMapCatLeft] = useState(false);
    const [canScrollMapCatRight, setCanScrollMapCatRight] = useState(true);

    const updateMapCatScroll = useCallback(() => {
        const el = mapCategoryScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollMapCatLeft(scrollLeft > 2);
        setCanScrollMapCatRight(scrollLeft < scrollWidth - clientWidth - 2);
    }, []);

    const scrollMapCategories = (direction) => {
        const el = mapCategoryScrollRef.current;
        if (!el) return;
        const scrollAmount = 140;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateMapCatScroll, 300);
    };

    useEffect(() => {
        if (activeModal === 'map') {
            updateMapCatScroll();
            const timer = setTimeout(updateMapCatScroll, 120);
            window.addEventListener('resize', updateMapCatScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateMapCatScroll);
            };
        }
    }, [activeModal, updateMapCatScroll]);

    const toggleVoiceToText = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            Swal.fire({
                title: 'Speech Recognition Unavailable',
                text: 'Your current browser does not support Web Speech API. Please try Google Chrome or Microsoft Edge.',
                icon: 'warning',
                confirmButtonColor: '#f97316'
            });
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
            }
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'fil-PH'; // Supports Filipino and English in the Philippines

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setReportNotes(prev => {
                        const trimmed = prev ? prev.trim() : '';
                        const combined = trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
                        return combined.slice(0, 500);
                    });
                }
            };

            recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    Swal.fire({
                        title: 'Microphone Permission Needed',
                        text: 'Please allow microphone access in your browser settings to dictate your report notes.',
                        icon: 'info',
                        confirmButtonColor: '#f97316'
                    });
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsListening(false);
        }
    };

    const notesLength = reportNotes.length;
    const isCategorySelected = reportCategory.length > 0;
    const isOthersSelected = reportCategory.includes('Others');
    const isNotesValidForOthers = !isOthersSelected || reportNotes.trim().length >= 10;

    const isLocationReady = Boolean(reportLocation?.lat && reportLocation?.lng);
    const isLocationResolved = Boolean(reportLocation?.lat && locationAddress);
    const isLocationFailed = !reportLocation && locationPermissionDenied;

    return (
        <AnimatePresence>
            {activeModal === 'file-report' && (
                <QuickReportWizardModal
                    isOpen={activeModal === 'file-report'}
                    onClose={() => setActiveModal(null)}
                    theme={theme}
                    reportLocation={reportLocation}
                    locationAddress={locationAddress}
                    plusCode={plusCode}
                    structuredAddress={structuredAddress}
                    requestDeviceLocation={requestDeviceLocation}
                    isLocating={isLocating}
                    isGeocoding={geocodingAddress}
                    isTrackingLocation={isTrackingLocation}
                    onStartLocationTracking={startDeviceLocationTracking}
                    onStopLocationTracking={stopDeviceLocationTracking}
                    locationPermissionDenied={locationPermissionDenied}
                    onOpenLocationPicker={() => {
                        stopDeviceLocationTracking();
                        setIsSelectingLocation(true);
                        setActiveModal('map');
                    }}
                    onSubmitReport={handleQuickReportSubmit}
                    onRestoreDraftLocation={context=>{
                        stopDeviceLocationTracking();
                        setReportLocation(context.location || null);setLocationAddress(context.address || '');
                        setPlusCode(context.plusCode || '');setStructuredAddress(context.structuredAddress || null);
                    }}
                    onTrackReport={(trackingId) => {
                        setActiveTab('reports');
                    }}
                    onViewExistingReport={(report) => {
                        setActiveModal(null);
                        setActiveTab('reports');
                        setSelectedReportForDetails(report);
                    }}
                    currentUser={currentUser}
                />
            )}

            {activeModal === 'map' && (
                <NearbyIssuesMapModal
                    isOpen={activeModal === 'map'}
                    onClose={() => {
                        setActiveModal(isSelectingLocation ? 'file-report' : null);
                        setIsSelectingLocation(false);
                        if (setSelectedPost) setSelectedPost(null);
                    }}
                    theme={theme}
                    isLoaded={isLoaded}
                    loadError={loadError}
                    reports={processedHazards}
                    reportsLoading={reportsLoading}
                    reportsError={reportsError}
                    onRetryReports={onRetryReports}
                    reportLocation={reportLocation}
                    setReportLocation={setReportLocation}
                    reverseGeocode={reverseGeocode}
                    checkJurisdiction={checkJurisdiction}
                    isLocating={isLocating}
                    requestDeviceLocation={requestDeviceLocation}
                    locationPermissionDenied={locationPermissionDenied}
                    isSelectingLocation={isSelectingLocation}
                    initialSelectedReport={selectedPost}
                    onOpenReportDetail={(report) => {
                        setSelectedHazard(report);
                        if (report?.isOwnReport) {
                            setActiveModal(null);
                            setActiveTab('reports');
                        }
                    }}
                    onOpenReportForm={() => setActiveModal('file-report')}
                    photoPinIcons={photoPinIcons}
                />
            )}

            {activeModal && activeModal !== 'file-report' && activeModal !== 'map' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
                    onClick={() => setActiveModal(null)}
                >
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="pointer-events-auto transition-colors w-full sm:max-w-xl flex flex-col mt-auto sm:my-auto bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[88dvh] sm:max-h-[90dvh] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Mobile Pull Bar / Drag Pill */}
                        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0">
                            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                        </div>
                    {activeModal === 'services' && (
                        <div className="p-4 sm:p-6 md:p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">LGU Services</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Official Digital Portal Services</p>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {LGU_SERVICES_LIST(t).map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => window.open(service.url, '_blank')}
                                        className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
                                    >
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-${service.color}-500/10 text-${service.color}-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                            {service.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">{service.name}</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{service.desc}</p>
                                            <span className="text-[10px] font-black uppercase text-orange-500 mt-2 inline-block tracking-widest group-hover:translate-x-1 transition-transform">Apply Now →</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {(activeModal === 'knowledge' || activeModal === 'help-center') && (() => {
                        const FAQ_ITEMS = [
                            {
                                id: 1,
                                question: 'How do I submit a report?',
                                answer: 'Choose a category, pin the location, add evidence and details, then review and submit.'
                            },
                            {
                                id: 2,
                                question: 'Where can I find my report ID?',
                                answer: "Your report ID is displayed immediately after submission and listed under 'My Reports' in your resident dashboard."
                            },
                            {
                                id: 3,
                                question: 'What do report statuses mean?',
                                answer: 'Submitted means received; Under Review means dispatchers are assessing; Dispatched means a field team is assigned; Resolved means work is completed.'
                            },
                            {
                                id: 4,
                                question: 'Can I update my contact details?',
                                answer: 'Yes, go to Account Settings from the sidebar or profile menu to update your phone number, email address, and notification preferences.'
                            }
                        ];

                        const CATEGORY_CARDS = [
                            {
                                id: 'reporting',
                                icon: <FileText size={22} strokeWidth={2} />,
                                title: 'Reporting a concern',
                                desc: 'Learn how to submit a report, add photos and provide details.',
                                action: () => setActiveModal('reporting-guide')
                            },
                            {
                                id: 'tracking',
                                icon: <BarChart2 size={22} strokeWidth={2} />,
                                title: 'Tracking reports',
                                desc: 'Check the status of your reports and understand what happens next.',
                                action: () => {
                                    setActiveModal(null);
                                    setActiveTab('reports');
                                }
                            },
                            {
                                id: 'account',
                                icon: <User size={22} strokeWidth={2} />,
                                title: 'Account & security',
                                desc: 'Manage your account, update your details and keep it secure.',
                                action: () => {
                                    setActiveModal(null);
                                    setActiveTab('profile');
                                }
                            },
                            {
                                id: 'maps',
                                icon: <MapPin size={22} strokeWidth={2} />,
                                title: 'Maps & locations',
                                desc: 'Find, pin and understand locations on the map.',
                                action: () => setActiveModal('map')
                            }
                        ];

                        const query = helpSearchQuery.trim().toLowerCase();
                        const filteredFaqs = query
                            ? FAQ_ITEMS.filter(f => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query))
                            : FAQ_ITEMS;
                        const filteredCards = query
                            ? CATEGORY_CARDS.filter(c => c.title.toLowerCase().includes(query) || c.desc.toLowerCase().includes(query))
                            : CATEGORY_CARDS;

                        return (
                            <div className="p-5 sm:p-7 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                {/* Top Close Button */}
                                <div className="flex justify-end -mt-1 -mr-1 mb-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X size={18} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Center Icon Badge */}
                                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#EA580C] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-orange-500/25">
                                    <span className="text-2xl sm:text-3xl font-black leading-none select-none">?</span>
                                </div>

                                {/* Title & Subtitle */}
                                <h3 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white text-center leading-tight">
                                    How can we help?
                                </h3>
                                <p className="text-xs sm:text-[13.5px] text-slate-500 dark:text-slate-400 text-center mt-1 mb-4">
                                    Find answers about reporting and your account.
                                </p>

                                {/* Search Bar */}
                                <div className="relative mb-4">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={helpSearchQuery}
                                        onChange={(e) => setHelpSearchQuery(e.target.value)}
                                        placeholder="Search help topics..."
                                        className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all"
                                    />
                                    {helpSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setHelpSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* 4 Category Cards (2x2 Grid) */}
                                {filteredCards.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-5">
                                        {filteredCards.map((card) => (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={card.action}
                                                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-orange-300 dark:hover:border-orange-900/50 hover:shadow-sm transition-all text-left flex items-start justify-between gap-2.5 group cursor-pointer"
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="text-[#EA580C] shrink-0 mt-0.5">
                                                        {card.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#EA580C] transition-colors leading-snug">
                                                            {card.title}
                                                        </h4>
                                                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                                                            {card.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0 mt-1" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Frequently Asked Questions Section */}
                                <div className="mb-4">
                                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2.5">
                                        Frequently asked questions
                                    </h4>

                                    {filteredFaqs.length > 0 ? (
                                        <div className="space-y-2">
                                            {filteredFaqs.map((faq) => {
                                                const isExpanded = expandedFaqId === faq.id;
                                                return (
                                                    <div
                                                        key={faq.id}
                                                        className={`rounded-xl border transition-all ${
                                                            isExpanded
                                                                ? 'border-orange-300 dark:border-orange-900/60 bg-[#FFF7ED]/40 dark:bg-orange-950/20'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                                            className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
                                                        >
                                                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                                                {faq.question}
                                                            </span>
                                                            {isExpanded ? (
                                                                <ChevronUp size={16} className="text-[#EA580C] shrink-0" strokeWidth={2.2} />
                                                            ) : (
                                                                <ChevronDown size={16} className="text-slate-400 shrink-0" strokeWidth={2.2} />
                                                            )}
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-0">
                                                                <p className="text-xs sm:text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                                                    {faq.answer}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                No help topics found matching "{helpSearchQuery}".
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Still Need Help Callout Banner */}
                                <div className="mt-4 p-3.5 rounded-2xl bg-[#FFF7ED] dark:bg-orange-950/25 border border-[#FFEDD5] dark:border-orange-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 text-[#EA580C] flex items-center justify-center shrink-0">
                                            <LifeBuoy size={22} strokeWidth={2.2} />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                Still need help?
                                            </h5>
                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Open the support form to describe your question.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveModal(null);
                                            if (typeof setIsAIChatOpen === 'function') {
                                                setIsAIChatOpen(true);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm transition-all shrink-0 cursor-pointer self-start sm:self-auto"
                                    >
                                        Contact support
                                    </button>
                                </div>

                                {/* Bottom Footer Row */}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal(null)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveModal('reporting-guide')}
                                        className="text-xs sm:text-sm font-bold text-[#EA580C] hover:text-[#d94e07] flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        <span>View reporting guide</span>
                                        <span className="text-sm font-bold">→</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {activeModal.startsWith('calling-') && (() => {
                        const hotlineName = activeModal.split('calling-')[1];
                        const hotlineList = EMERGENCY_HOTLINES(t);
                        const hotline = hotlineList.find(h => h.name === hotlineName) || hotlineList[0];
                        return (
                            <div className="p-6 sm:p-10 md:p-12 flex flex-col items-center justify-center min-h-[360px] text-center relative overflow-hidden">
                                {/* Calling HUD Background Animation */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <motion.div
                                        animate={{ scale: [1, 1.5], opacity: [0.15, 0] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                                        className="w-48 sm:w-64 h-48 sm:h-64 rounded-full border-4 border-orange-500/20"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.1, 0] }}
                                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.5 }}
                                        className="w-48 sm:w-64 h-48 sm:h-64 rounded-full border-2 border-orange-500/10"
                                    />
                                </div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="relative z-10"
                                >
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-500 flex items-center justify-center text-white mb-6 sm:mb-8 mx-auto shadow-[0_0_40px_rgba(249,115,22,0.4)] animate-pulse">
                                        <PhoneCall size={36} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-orange-500/80 mb-2">Connecting to Secure Line</h3>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">{hotline?.name || 'Emergency Line'}</h2>
                                    <p className="text-lg sm:text-xl font-mono font-bold text-slate-400 tracking-tight mb-8 sm:mb-10">{hotline?.num || '---'}</p>

                                    <div className="flex items-center gap-6 mb-8 sm:mb-12 justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <MicOff size={18} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mute</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                                <Volume2 size={18} />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Speaker</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-[0_15px_30px_rgba(220,38,38,0.3)] active:scale-90 transition-all mx-auto cursor-pointer"
                                        aria-label="End Call"
                                    >
                                        <X size={28} strokeWidth={3} className="rotate-45" />
                                    </button>
                                    <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mt-3">End Call</p>
                                </motion.div>
                            </div>
                        );
                    })()}

                    {activeModal === 'privacy' && (
                        <div className="p-5 sm:p-7 max-h-[82vh] overflow-y-auto custom-scrollbar">
                            {/* Top row: Close button */}
                            <div className="flex items-center justify-end mb-3">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Header: Outline Shield + Title & Subtitle */}
                            <div className="flex items-center gap-3.5 mb-3.5">
                                <div className="text-[#EA580C] shrink-0">
                                    <Shield size={34} strokeWidth={1.9} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        Privacy Policy
                                    </h3>
                                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Understand how your information is used.
                                    </p>
                                </div>
                            </div>

                            {/* Info Banner Callout */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/25 border border-blue-100/90 dark:border-blue-900/30 flex items-center gap-2.5 mb-4">
                                <Info size={17} className="text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.2} />
                                <p className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-200 leading-snug">
                                    Report information may include your location, photos, and account details.
                                </p>
                            </div>

                            {/* 3 Structured Items */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                <div className="flex items-start gap-3.5 py-3 first:pt-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <User size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Information you provide
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Location, report descriptions, attachments, and contact details.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            How information is used
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            To review concerns, coordinate follow-up, and provide report updates.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3 last:pb-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <Settings size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Automated review
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            If AI assists with review, explain its role and the data involved in the final policy.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footnote & Bottom Action */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-sm">
                                    Full data handling details should match the service's actual practices.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-6 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-sm transition-all shrink-0 self-end sm:self-auto cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'terms' && (
                        <div className="p-5 sm:p-7 max-h-[82vh] overflow-y-auto custom-scrollbar">
                            {/* Top row: Close button */}
                            <div className="flex items-center justify-end mb-3">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Header: Outline FileText + Title & Subtitle */}
                            <div className="flex items-center gap-3.5 mb-3.5">
                                <div className="text-[#EA580C] shrink-0">
                                    <FileText size={34} strokeWidth={1.9} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        Terms of Service
                                    </h3>
                                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Guidelines for using PULSO.
                                    </p>
                                </div>
                            </div>

                            {/* Info Banner Callout */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/25 border border-blue-100/90 dark:border-blue-900/30 flex items-center gap-2.5 mb-4">
                                <Info size={17} className="text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.2} />
                                <p className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-200 leading-snug">
                                    Submit relevant reports and use the service respectfully.
                                </p>
                            </div>

                            {/* 3 Structured Items */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                <div className="flex items-start gap-3.5 py-3 first:pt-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <Edit3 size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Report accurately
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Describe concerns honestly and include relevant evidence.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <Users size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Be respectful
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Avoid abusive language and unrelated uploads.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3 last:pb-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <MapPin size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Check service coverage
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Use the published service-area guidance before submitting.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footnote & Bottom Action */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-sm">
                                    These guidelines are a summary and should be read together with the full terms of service.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-6 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-sm transition-all shrink-0 self-end sm:self-auto cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'post-details' && selectedPost && (
                        <div className="flex flex-col h-full max-h-[85vh]">
                            <div className="p-5 sm:p-8 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-100 dark:border-orange-500/20 shrink-0">
                                            <Bell size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{selectedPost.department}</h3>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{new Date(selectedPost.created_at).toLocaleDateString()} • Ref: {selectedPost.advisory_id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 cursor-pointer"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-6">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3">{selectedPost.title}</h2>
                                    <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedPost.description}</p>
                                </div>
                                {selectedPost.has_image && selectedPost.image_url && (
                                    <div className="mt-4 sm:mt-6 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                        <img src={`${API_BASE_URL}${selectedPost.image_url}`} alt="Advisory Content" className="w-full object-cover" />
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${selectedPost.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>Priority: {selectedPost.priority}</span>
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-500 dark:bg-blue-500/10">Category: {selectedPost.category}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModal === 'cookies' && (
                        <div className="p-5 sm:p-7 max-h-[82vh] overflow-y-auto custom-scrollbar">
                            {/* Top row: Close button */}
                            <div className="flex items-center justify-end mb-3">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Header: Outline SlidersHorizontal + Title & Subtitle */}
                            <div className="flex items-center gap-3.5 mb-3.5">
                                <div className="text-[#EA580C] shrink-0">
                                    <SlidersHorizontal size={34} strokeWidth={1.9} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                        Cookies &amp; Local Storage
                                    </h3>
                                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Understand what is stored on your device.
                                    </p>
                                </div>
                            </div>

                            {/* Info Banner Callout (Peach tint) */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-orange-50/80 dark:bg-orange-950/25 border border-orange-100/90 dark:border-orange-900/30 flex items-center gap-2.5 mb-4">
                                <Info size={17} className="text-[#EA580C] shrink-0" strokeWidth={2.2} />
                                <p className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-200 leading-snug">
                                    Storage can support sign-in, preferences, and map performance.
                                </p>
                            </div>

                            {/* 3 Structured Items */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                <div className="flex items-start gap-3.5 py-3 first:pt-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <Database size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Session storage
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Supports your signed-in session.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <Monitor size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Appearance preference
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Remembers your display choice.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3.5 py-3 last:pb-1">
                                    <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                                        <MapIcon size={18} strokeWidth={2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                            Map cache
                                        </h4>
                                        <p className="text-xs sm:text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Helps previously loaded map content load faster.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footnote & Bottom Action */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-sm">
                                    These descriptions must be checked against the implemented storage behavior.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-6 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-sm transition-all shrink-0 self-end sm:self-auto cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'reporting-guide' && (
                        <div className="p-5 sm:p-7 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Header: Rounded peach icon box + Title & Subtitle + Close */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] dark:bg-orange-950/40 border border-[#FFEDD5] dark:border-orange-900/40 flex items-center justify-center text-[#EA580C] shrink-0">
                                        <BookOpen size={26} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                            How to report a concern
                                        </h3>
                                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            A clear report helps the city understand the issue.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Section Kicker */}
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-3 mb-2 px-0.5">
                                REPORTING GUIDE
                            </div>

                            {/* Info Banner: Before you start */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/25 border border-blue-100/90 dark:border-blue-900/30 flex items-center gap-2.5 mb-3.5">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                                    i
                                </div>
                                <p className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-200 leading-snug">
                                    <span className="font-bold text-slate-900 dark:text-white">Before you start:</span> have the location, a clear photo, and a short description ready.
                                </p>
                            </div>

                            {/* 6 Numbered Steps Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5">
                                {/* Step 1 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        1
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Choose a category
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Select the type of issue that best fits your concern.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        2
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Pin the location
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Mark the exact spot and add a nearby landmark.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        3
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Add evidence
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Upload clear photos taken from a safe place.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 4 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        4
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Describe the issue
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Explain what happened and when you noticed it.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 5 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        5
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Confirm your contact details
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Check how the department can reach you.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 6 */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#EA580C] text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">
                                        6
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white leading-snug">
                                            Review and submit
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Check your information before sending the report.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Footer Row */}
                            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveModal('file-report');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-[#EA580C] hover:bg-[#d94e07] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    <span>Start a report</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeModal === 'emergency' && (
                        <div className="p-5 sm:p-7 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            {/* Header: Rounded red/orange icon box + Title & Subtitle + Close button */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                                        <PhoneCall size={24} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                            Emergency Contacts &amp; Hotlines
                                        </h3>
                                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            24/7 official municipal dispatch &amp; emergency desks for Caloocan City.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Life-Safety Alert Box */}
                            <div className="p-3 sm:p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 flex items-start gap-2.5 mb-5">
                                <ShieldAlert size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-950 dark:text-red-200 leading-snug">
                                    <span className="font-bold">Life-threatening danger or active crime?</span> Call <strong>911</strong> (National Emergency Hotline) or contact the <strong>Caloocan Command Center</strong> immediately.
                                </p>
                            </div>

                            {/* Section Kicker */}
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-0.5">
                                MUNICIPAL &amp; UTILITY EMERGENCY DESKS
                            </div>

                            {/* 4 Primary Hotlines Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
                                {/* Caloocan Command Center */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-red-300 dark:hover:border-red-800/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                                <ShieldAlert size={16} strokeWidth={2.2} />
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-red-100/80 dark:bg-red-950/60 text-[10px] font-mono font-bold text-red-700 dark:text-red-300">
                                                24/7 Command
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            Caloocan Rescue &amp; Disaster Command
                                        </h4>
                                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Citywide disaster response, emergency medical dispatch, flood rescue, and CDRRMO operations.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            (02) 8888-2256
                                        </span>
                                        <a
                                            href="tel:0288882256"
                                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <PhoneCall size={12} />
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>

                                {/* City Engineering Maintenance Desk */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-orange-300 dark:hover:border-orange-800/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] flex items-center justify-center shrink-0">
                                                <Wrench size={16} strokeWidth={2.2} />
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-orange-100/80 dark:bg-orange-950/60 text-[10px] font-mono font-bold text-orange-700 dark:text-orange-300">
                                                Public Works
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            City Engineering Maintenance Desk
                                        </h4>
                                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Urgent road cave-ins, exposed electrical conduits, collapsed bridges, and open storm drains.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            (02) 8362-0220
                                        </span>
                                        <a
                                            href="tel:0283620220"
                                            className="px-3 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#d94e07] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <PhoneCall size={12} />
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>

                                {/* Maynilad Water Emergency Hotline */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-800/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Droplets size={16} strokeWidth={2.2} />
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-950/60 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                                                Water Supply
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            Maynilad Water Emergency Hotline
                                        </h4>
                                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Major burst water mains, sudden loss of water pressure, and emergency pipeline leaks.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            1626
                                        </span>
                                        <a
                                            href="tel:1626"
                                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <PhoneCall size={12} />
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>

                                {/* Meralco Power Outages Desk */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-amber-300 dark:hover:border-amber-800/60 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                <Zap size={16} strokeWidth={2.2} />
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                                Power &amp; Grid
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                            Meralco Emergency &amp; Power Desk
                                        </h4>
                                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                            Downed high-voltage electrical wires, sparking transformers, and major area blackouts.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            16211
                                        </span>
                                        <a
                                            href="tel:16211"
                                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                        >
                                            <PhoneCall size={12} />
                                            <span>Call</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* General City Hall Public Assistance & Action Center */}
                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Landmark size={18} className="text-slate-500 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            Caloocan City Hall Public Assistance &amp; Action Center
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            General municipal assistance, citizen inquiries, and city government desk.
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href="tel:0282888811"
                                    className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#EA580C] hover:underline shrink-0"
                                >
                                    <PhoneCall size={12} />
                                    <span>(02) 8288-8811</span>
                                </a>
                            </div>

                            {/* Footnote & Bottom Action */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal max-w-sm">
                                    PULSO is for non-emergency public infrastructure maintenance. For life-threatening emergencies, always dial 911.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveModal(null)}
                                    className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm tracking-wide shadow-sm transition-all shrink-0 self-end sm:self-auto cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}

        {/* --- Submit Final Confirmation Modal --- */}
        {isSubmitConfirmOpen && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsSubmitConfirmOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[40px] shadow-2xl p-10 sm:p-12 flex flex-col items-center text-center relative overflow-hidden"
                >
                    {/* Abstract design background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />

                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] mb-8 rotate-3">
                        <ShieldCheck size={48} className="text-white drop-shadow-lg" />
                    </div>

                    <div className="space-y-3 mb-8">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Ready to Submit?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed px-2">
                            Please ensure all details are <span className="text-slate-900 dark:text-white font-bold">accurate and real</span>. Generating false reports is a serious violation.
                        </p>
                        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl">
                            <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                                ⚠️ If your report is found to be false or fake, your <span className="underline decoration-2">account may be restricted or suspended</span>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={actuallySubmitReport}
                            className="group relative w-full py-4 sm:py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl overflow-hidden active:scale-95 transition-all text-base uppercase tracking-widest shadow-xl shadow-orange-500/20"
                        >
                            <span className="relative z-10">Finalize & Submit</span>
                        </button>
                        <button
                            onClick={() => setIsSubmitConfirmOpen(false)}
                            className="w-full py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-black text-xs uppercase tracking-[0.2em] transition-colors"
                        >
                            Never mind, let me double check
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}

        {/* --- Custom High-Fidelity Retract Confirmation Modal --- */}
        {reportToCancel && (() => {
            const reportObj = typeof reportToCancel === 'object' ? reportToCancel : null;
            const reportId = reportObj ? reportObj.id : reportToCancel;
            const ticketId = reportObj?.ticket_id || reportId;

            return (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setReportToCancel(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setReportToCancel(null);
                    }}
                    tabIndex={-1}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 15 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="retract-dialog-title"
                        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-5"
                    >
                        {/* Cautionary Icon Badge */}
                        <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm relative">
                            <AlertTriangle size={32} strokeWidth={2} />
                        </div>

                        {/* Text & Ticket Badge */}
                        <div className="space-y-2">
                            <h3 id="retract-dialog-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Retract This Report?
                            </h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>{ticketId}</span>
                                {reportObj?.category && (
                                    <>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-sans font-medium text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{reportObj.category}</span>
                                    </>
                                )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-[13px] font-medium leading-relaxed pt-1">
                                Are you sure you want to retract this report? This will cancel the scheduled LGU inspection and remove the ticket from active engineering dispatch. This action <span className="text-rose-600 dark:text-rose-400 font-bold">cannot be undone</span>.
                            </p>
                        </div>

                        {/* Actions: Destructive Rose + Safe Cancel */}
                        <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full pt-2">
                            <button
                                type="button"
                                onClick={() => setReportToCancel(null)}
                                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-95 transition-all text-xs sm:text-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
                                aria-label="Keep report and close modal"
                            >
                                Keep Report
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmCancelReport(reportId)}
                                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/25 active:scale-95 transition-all text-xs sm:text-sm cursor-pointer"
                                aria-label={`Confirm retracting report ${ticketId}`}
                            >
                                Yes, Retract Report
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            );
        })()}
    </AnimatePresence>
    );
};
export default ResidentModals;
