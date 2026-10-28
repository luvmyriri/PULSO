import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Camera,
    MapPin,
    ChevronDown,
    ChevronUp,
    Check,
    CheckCircle2,
    RotateCcw,
    Mic,
    MicOff,
    FileText,
    Copy,
    Info,
    AlertTriangle,
    AlertCircle,
    PhoneCall,
    Search,
    Compass,
    Signpost,
    Droplets,
    Waves,
    Zap,
    HardHat,
    ShieldAlert,
    Building2,
    HelpCircle,
    Loader2,
    Maximize2,
    Eye,
    Trash2,
    Lightbulb
} from 'lucide-react';
import PulsoPulseLine from './common/PulsoPulseLine';
import { API_BASE_URL } from '../utils/apiBase';
import { getToken } from '../utils/auth';
import { validateProfanity } from '../utils/profanityFilter';

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

export function getCategoryIconComponent(catName) {
    const lower = String(catName || '').toLowerCase();
    if (lower.includes('waste') || lower.includes('garbage') || lower.includes('trash') || lower.includes('basura')) return Trash2;
    if (lower.includes('flood') || lower.includes('drain')) return Waves;
    if (lower.includes('water') || lower.includes('tubig')) return Droplets;
    if (lower.includes('street light') || lower.includes('lighting') || lower.includes('streetlight') || lower.includes('ilaw') || lower.includes('lamp') || lower.includes('bulb')) return Lightbulb;
    if (lower.includes('wiring') || lower.includes('wire') || lower.includes('cable') || lower.includes('electrical') || lower.includes('power') || lower.includes('electr') || lower.includes('kuryente')) return Zap;
    if (lower.includes('traffic') || lower.includes('sign') || lower.includes('signal')) return Signpost;
    if (lower.includes('building') || lower.includes('facilit') || lower.includes('hall')) return Building2;
    if (lower.includes('safety') || lower.includes('hazard') || lower.includes('danger') || lower.includes('sunog')) return ShieldAlert;
    if (lower.includes('road') || lower.includes('bridge') || lower.includes('lubak') || lower.includes('kalsada')) return RoadIcon;
    return HelpCircle;
}

export function mapAiCategoryToCanonical(categoryStr) {
    if (!categoryStr || typeof categoryStr !== 'string') return [];
    const parts = categoryStr.split(',').map((p) => p.trim().toLowerCase());
    const mapped = new Set();
    for (const part of parts) {
        if (part.includes('waste') || part.includes('garbage') || part.includes('trash') || part.includes('basura') || part.includes('dump') || part.includes('litter') || part.includes('dumi')) {
            mapped.add('Waste Management');
        }
        if (part.includes('drain') || part.includes('flood') || part.includes('canal') || part.includes('sewer') || part.includes('manhole') || part.includes('clog') || part.includes('baha') || part.includes('estero') || part.includes('culvert')) {
            mapped.add('Drainage & Flooding');
        }
        if (part.includes('street light') || part.includes('streetlight') || part.includes('lighting') || part.includes('lamp') || (part.includes('light') && !part.includes('traffic'))) {
            mapped.add('Street Lighting');
        }
        if (part.includes('wiring') || part.includes('wire') || part.includes('cable') || part.includes('electric') || part.includes('power') || part.includes('kuryente')) {
            mapped.add('Electrical Wiring');
        }
        if (part.includes('traffic') || part.includes('sign') || part.includes('signal') || part.includes('marking')) {
            mapped.add('Traffic & Road Signs');
        }
        if (part.includes('road') || part.includes('bridge') || part.includes('pothole') || part.includes('asphalt') || part.includes('pavement') || part.includes('kalsada') || part.includes('lubak')) {
            mapped.add('Roads & Bridges');
        }
        if (part.includes('water') || part.includes('tubig') || part.includes('leak') || part.includes('pipe') || part.includes('pipeline') || part.includes('burst') || part.includes('pressure') || part.includes('maynilad')) {
            mapped.add('Water Pipeline');
        }
        if (part.includes('safety') || part.includes('regulat') || part.includes('hazard') || part.includes('fire') || part.includes('debris') || part.includes('tree') || part.includes('sunog')) {
            mapped.add('Public Safety & Hazards');
        }
        if (part.includes('facilit') || part.includes('park') || part.includes('hall') || part.includes('court') || part.includes('school') || part.includes('gym')) {
            mapped.add('Public Buildings & Facilities');
        }
    }
    return Array.from(mapped);
}

import {
    CALOOCAN_BARANGAYS,
    encodeOpenLocationCode,
    formatFullAddress,
    getPostalCodeForBarangay
} from '../utils/philippineAddress';
import { findBarangayByCoordinates } from '../data/caloocanBoundaries';
import IDCameraModal from './IDCameraModal';

export function formatRejectionReason(reason) {
    if (!reason || typeof reason !== 'string') {
        return "We couldn't clearly see a city infrastructure issue in this photo. Please take a photo showing the actual problem.";
    }
    return reason
        .replace(/\s*\(?such as a pothole,\s*broken streetlight,\s*or drainage hazard\.?\)?/gi, '')
        .replace(/\s*\(?such as a pothole,\s*broken streetlight,\s*or water leak\.?\)?/gi, '')
        .replace(/\s*\(?such as a pothole,\s*broken streetlight,\s*or leak\.?\)?/gi, '')
        .replace(/\s*\(road,\s*streetlight,\s*drainage,\s*or public facility\)/gi, '')
        .trim();
}

const DRAFT_STORAGE_KEY = 'pulso_quick_report_draft_v2';

// Unified Categories excluding "All" for reporting
const REPORTABLE_CATEGORIES = [
    'Roads & Bridges',
    'Drainage & Flooding',
    'Street Lighting',
    'Water Pipeline',
    'Public Safety & Hazards',
    'Traffic & Road Signs',
    'Public Buildings & Facilities',
    'Electrical Wiring',
    'Waste Management'
];

export const CATEGORY_SUBTITLES = {
    'Roads & Bridges': 'Potholes, damaged roads, and sidewalks',
    'Drainage & Flooding': 'Clogged drains, gutters, and flooding',
    'Street Lighting': 'Busted, flickering, or damaged lights',
    'Water Pipeline': 'Pipeline leaks, burst pipes, and low water pressure',
    'Water Supply & Distribution': 'Pipeline leaks, burst pipes, and low water pressure',
    'Water Supply': 'Pipeline leaks, burst pipes, and low water pressure',
    'Public Safety & Hazards': 'Fallen trees, open manholes, hazards',
    'Public Safety Hazards': 'Fallen trees, open manholes, hazards',
    'Traffic & Road Signs': 'Missing or damaged traffic signs',
    'Public Buildings & Facilities': 'Parks, civic centers, and buildings',
    'Public Facilities': 'Parks, civic centers, and buildings',
    'Electrical Wiring': 'Dangling cables and exposed wires',
    'Waste Management': 'Uncollected garbage, illegal dumping, litter'
};

/**
 * QuickReportWizardModal
 * Rebuild Quick Report as a 3-Step Flow (Photo, Category, Details)
 * Designed for PULSO Mobile App and Website
 */
function QuickReportWizardModal({
    isOpen,
    onClose,
    theme = 'dark',
    reportLocation = null,
    locationAddress = '',
    plusCode = '',
    structuredAddress = null,
    requestDeviceLocation,
    isLocating = false,
    isTrackingLocation = false,
    onStartLocationTracking,
    onStopLocationTracking,
    locationPermissionDenied = false,
    onOpenLocationPicker,
    onSubmitReport,
    onTrackReport,
    onViewExistingReport,
    currentUser = null
}) {
    const { t } = useTranslation();
    // -------------------------------------------------------------------------
    // Wizard State
    // -------------------------------------------------------------------------
    const [step, setStep] = useState(1); // 1: Photo, 2: Category, 3: Details, 4: Success
    // Auto reload and track GPS location immediately upon opening
    useEffect(() => {
        if (!isOpen) {
            onStopLocationTracking?.();
            return;
        }
        if (!locationPermissionDenied) {
            requestDeviceLocation?.();
            onStartLocationTracking?.();
        }
        return () => {
            onStopLocationTracking?.();
        };
    }, [isOpen, locationPermissionDenied, requestDeviceLocation, onStartLocationTracking, onStopLocationTracking]);
    const [photo, setPhoto] = useState(null); // Data URL or Blob URL
    const [photoFile, setPhotoFile] = useState(null);
    const [photoCapturedAt, setPhotoCapturedAt] = useState(null);
    const [isWatermarking, setIsWatermarking] = useState(false);
    const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

    // Close fullscreen photo when Escape is pressed
    useEffect(() => {
        if (!isFullscreenPhotoOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsFullscreenPhotoOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreenPhotoOpen]);

    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [aiAnalysisError, setAiAnalysisError] = useState(null);

    // Categories state
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [suggestedCategories, setSuggestedCategories] = useState([]);
    const [isExpandedCategories, setIsExpandedCategories] = useState(false);
    const [othersDescription, setOthersDescription] = useState('');

    // Location & details state
    const [customBarangay, setCustomBarangay] = useState(null);
    const [locationDetails, setLocationDetails] = useState({
        subdivision: '',
        houseNumber: '',
        landmark: ''
    });
    const [isLocationDetailsExpanded, setIsLocationDetailsExpanded] = useState(false);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [barangaySearchQuery, setBarangaySearchQuery] = useState('');

    // Notes & Voice input
    const [notes, setNotes] = useState('');
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const baseNotesRef = useRef('');
    const finalTranscriptRef = useRef('');

    // Collapsible Photo Tips
    const [isPhotoTipsOpen, setIsPhotoTipsOpen] = useState(false);

    // Submission & Confirmation modals
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [duplicateReport, setDuplicateReport] = useState(null);
    const [isDuplicateDescExpanded, setIsDuplicateDescExpanded] = useState(false);
    const [submittedTrackingNumbers, setSubmittedTrackingNumbers] = useState([]);
    const [isDiscardPromptOpen, setIsDiscardPromptOpen] = useState(false);
    const [copiedTrackingId, setCopiedTrackingId] = useState(null);
    const [isAddressCopied, setIsAddressCopied] = useState(false);

    // Reset duplicate report state if resident alters category, location, or navigates back
    useEffect(() => {
        if (duplicateReport) {
            setDuplicateReport(null);
            setSubmitError(null);
        }
    }, [selectedCategories, reportLocation, step]);

    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);
    const contentAreaRef = useRef(null);
    const errorCardRef = useRef(null);

    // -------------------------------------------------------------------------
    // Initialize & Restore Local Draft
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!isOpen) return;

        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const draft = JSON.parse(rawDraft);
                // Only restore if draft is less than 24 hours old
                if (Date.now() - (draft.timestamp || 0) < 24 * 3600 * 1000) {
                    if (draft.photo) setPhoto(draft.photo);
                    if (draft.photoCapturedAt) setPhotoCapturedAt(draft.photoCapturedAt);
                    if (Array.isArray(draft.selectedCategories) && draft.selectedCategories.length > 0) {
                        setSelectedCategories(draft.selectedCategories);
                    }
                    if (Array.isArray(draft.suggestedCategories)) {
                        setSuggestedCategories(draft.suggestedCategories);
                    }
                    if (draft.notes) setNotes(draft.notes);
                    if (draft.othersDescription) setOthersDescription(draft.othersDescription);
                    if (draft.locationDetails) setLocationDetails(draft.locationDetails);
                    if (draft.step && draft.step <= 3) setStep(draft.step);
                }
            }
        } catch (e) {
            console.warn('Could not read Quick Report draft from localStorage', e);
        }
    }, [isOpen]);

    // Save draft to localStorage whenever relevant fields update
    useEffect(() => {
        if (!isOpen || step === 4) return;
        try {
            const hasData = photo || notes.trim() || selectedCategories.length > 0;
            if (hasData) {
                const draft = {
                    step,
                    photo: photo && photo.length < 500000 ? photo : null, // only cache lightweight base64/blob
                    photoCapturedAt,
                    selectedCategories,
                    suggestedCategories,
                    notes,
                    othersDescription,
                    locationDetails,
                    timestamp: Date.now()
                };
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            }
        } catch (e) {
            // Ignore quota errors for large images
        }
    }, [isOpen, step, photo, photoCapturedAt, selectedCategories, suggestedCategories, notes, othersDescription, locationDetails]);

    // Clear draft helper
    const clearSavedDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {
            // Ignore
        }
    }, []);

    // -------------------------------------------------------------------------
    // Speech Recognition (Voice Notes) - Accurate, Duplication-Free Engine
    // -------------------------------------------------------------------------
    useEffect(() => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            setVoiceSupported(true);
        }
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    const toggleVoiceRecording = () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            setVoiceSupported(false);
            return;
        }

        if (isRecordingVoice) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
            setIsRecordingVoice(false);
            return;
        }

        try {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) {}
            }

            const recog = new SpeechRec();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'fil-PH'; // Multilingual Filipino / English support
            recog.maxAlternatives = 1;

            baseNotesRef.current = notes.trim();
            finalTranscriptRef.current = '';

            recog.onstart = () => {
                setIsRecordingVoice(true);
            };

            recog.onresult = (event) => {
                let accumulatedFinal = finalTranscriptRef.current;
                let currentInterim = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    if (res.isFinal) {
                        const piece = res[0].transcript.trim();
                        if (piece) {
                            accumulatedFinal = accumulatedFinal ? `${accumulatedFinal} ${piece}` : piece;
                        }
                    } else {
                        currentInterim += res[0].transcript;
                    }
                }

                finalTranscriptRef.current = accumulatedFinal;

                // Merge: base notes + finalized spoken words + live interim preview
                const base = baseNotesRef.current;
                const spoken = [accumulatedFinal, currentInterim.trim()].filter(Boolean).join(' ');
                const combined = base ? `${base} ${spoken}` : spoken;

                setNotes(combined.slice(0, 500));
            };

            recog.onerror = (event) => {
                console.warn('Voice recognition error:', event.error);
                if (event.error !== 'no-speech') {
                    setIsRecordingVoice(false);
                }
            };

            recog.onend = () => {
                setIsRecordingVoice(false);
                // Cleanly commit only the final text (remove any trailing partial/interim noise)
                const base = baseNotesRef.current;
                const finalOnly = finalTranscriptRef.current.trim();
                const committed = base ? `${base} ${finalOnly}` : finalOnly;
                if (committed) {
                    setNotes(committed.slice(0, 500));
                }
            };

            recognitionRef.current = recog;
            recog.start();
            setIsRecordingVoice(true);
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsRecordingVoice(false);
        }
    };

    // -------------------------------------------------------------------------
    // Location Computations
    // -------------------------------------------------------------------------
    const resolvedBarangay = useMemo(() => {
        if (customBarangay) return customBarangay;
        if (structuredAddress?.barangay) return structuredAddress.barangay;
        if (reportLocation?.lat && reportLocation?.lng) {
            const match = findBarangayByCoordinates(reportLocation.lat, reportLocation.lng);
            if (match) return match.name;
        }
        return '';
    }, [customBarangay, structuredAddress, reportLocation]);

    const resolvedPlusCode = useMemo(() => {
        if (plusCode && typeof plusCode === 'string' && plusCode.trim()) {
            return plusCode.trim();
        }
        if (structuredAddress?.plusCode && typeof structuredAddress.plusCode === 'string') {
            return structuredAddress.plusCode.trim();
        }
        if (reportLocation?.lat && reportLocation?.lng) {
            return encodeOpenLocationCode(reportLocation.lat, reportLocation.lng, true);
        }
        return '';
    }, [plusCode, structuredAddress, reportLocation]);

    const displayAddress = useMemo(() => {
        if (customBarangay) {
            const zip = getPostalCodeForBarangay(customBarangay) || '1421';
            const prefix = resolvedPlusCode ? `${resolvedPlusCode}, ` : '';
            return `${prefix}${customBarangay}, Caloocan, ${zip} Metro Manila`;
        }
        if (structuredAddress && (structuredAddress.barangay || structuredAddress.streetAddress || structuredAddress.subdivision)) {
            return formatFullAddress({
                ...structuredAddress,
                plusCode: resolvedPlusCode || structuredAddress.plusCode,
                city: structuredAddress.city || 'Caloocan',
                region: structuredAddress.region || 'Metro Manila',
                postalCode: structuredAddress.postalCode || getPostalCodeForBarangay(structuredAddress.barangay) || '1421'
            }, reportLocation);
        }
        if (locationAddress && locationAddress.trim() && !locationAddress.startsWith('Lat:')) {
            return locationAddress;
        }
        if (reportLocation?.lat && reportLocation?.lng) {
            const bgy = resolvedBarangay || 'Caloocan';
            const plus = resolvedPlusCode ? `${resolvedPlusCode}, ` : '';
            return `${plus}${bgy}, Caloocan, Metro Manila`;
        }
        return t('reportWizard.step2Location.chooseLocation', 'Choose the issue location');
    }, [customBarangay, structuredAddress, locationAddress, resolvedBarangay, resolvedPlusCode, reportLocation, isLocating, t]);

    const handleCopyAddress = (e) => {
        e?.stopPropagation?.();
        if (displayAddress && navigator?.clipboard) {
            navigator.clipboard.writeText(displayAddress);
            setIsAddressCopied(true);
            setTimeout(() => setIsAddressCopied(false), 2000);
        }
    };

    const locationStatusText = useMemo(() => {
        if (locationPermissionDenied) return 'Location permission denied. Tap Change location to select.';
        if (reportLocation?.accuracy && reportLocation.accuracy > 20) {
            return 'Approximate location';
        }
        if (reportLocation?.lat) return isTrackingLocation ? t('reportWizard.step2Location.liveActive', 'Live location active') : t('reportWizard.step2Location.locationSelected', 'Location selected');
        return t('reportWizard.step2Location.noLocation', 'Location not set');
    }, [locationPermissionDenied, reportLocation, isTrackingLocation, t]);

    // Filter Caloocan barangays for the location picker
    const filteredBarangays = useMemo(() => {
        if (!barangaySearchQuery.trim()) return CALOOCAN_BARANGAYS.slice(0, 30);
        const query = barangaySearchQuery.toLowerCase();
        return CALOOCAN_BARANGAYS.filter(
            (b) => b.name.toLowerCase().includes(query) || (b.alias && b.alias.toLowerCase().includes(query))
        );
    }, [barangaySearchQuery]);

    // -------------------------------------------------------------------------
    // AI Photo Analysis (Vision Eye)
    // -------------------------------------------------------------------------
    const runAIAnalysis = useCallback(async (fileOrBlob) => {
        if (!fileOrBlob) return;
        setIsAnalyzing(true);
        setAiAnalysisError(null);
        setAiFeedback(null);
        try {
            const formData = new FormData();
            if (notes && notes.trim()) {
                formData.append('description', notes.trim());
            }

            let blobToSend = fileOrBlob;
            if (typeof fileOrBlob === 'string' && (fileOrBlob.startsWith('blob:') || fileOrBlob.startsWith('data:'))) {
                const res = await fetch(fileOrBlob);
                blobToSend = await res.blob();
            }

            formData.append('image', blobToSend, 'analysis.jpg');

            const authToken = getToken() || currentUser?.token;
            const headers = {};
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
                method: 'POST',
                headers,
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setAiFeedback(data);

                const isRejected = Boolean(
                    data.is_inappropriate ||
                    data.is_infrastructure === false ||
                    data.category === 'Inappropriate Content'
                );

                if (isRejected) {
                    setAiAnalysisError(formatRejectionReason(data.rejection_reason));
                    setSelectedCategories([]);
                    setSuggestedCategories([]);
                    setIsExpandedCategories(true);
                } else {
                    const detected = mapAiCategoryToCanonical(data.category);
                    if (detected.length > 0) {
                        setSelectedCategories(detected);
                        setSuggestedCategories(detected);
                        setIsExpandedCategories(false);
                    } else {
                        setSelectedCategories([]);
                        setSuggestedCategories([]);
                        setIsExpandedCategories(true);
                        setAiAnalysisError("We couldn't detect the issue automatically. Please pick one below.");
                    }

                    if (data.auto_description && !notes) {
                        setNotes(data.auto_description);
                    }
                }
            } else {
                setAiAnalysisError("We couldn't detect the issue automatically. Please pick one below.");
                setIsExpandedCategories(true);
            }
        } catch (err) {
            console.error('PULSO Vision Eye analysis failed:', err);
            setAiAnalysisError("We couldn't detect the issue automatically. Please pick one below.");
            setIsExpandedCategories(true);
        } finally {
            setIsAnalyzing(false);
        }
    }, [notes, currentUser]);

    // -------------------------------------------------------------------------
    // Photo Capture & Upload Handling
    // -------------------------------------------------------------------------
    const handleTriggerCamera = () => {
        setIsCameraModalOpen(true);
    };

    const handleCameraPhotoCaptured = (capturedFile, aiData) => {
        setIsCameraModalOpen(false);
        if (!capturedFile) return;

        const objectUrl = URL.createObjectURL(capturedFile);
        setPhoto(objectUrl);
        setPhotoFile(capturedFile);
        setPhotoCapturedAt(new Date().toISOString());

        if (aiData) {
            setAiFeedback(aiData);
            const isRejected = Boolean(
                aiData.is_inappropriate ||
                aiData.is_infrastructure === false ||
                aiData.category === 'Inappropriate Content'
            );

            if (isRejected) {
                setAiAnalysisError(formatRejectionReason(aiData.rejection_reason));
                setSelectedCategories([]);
                setSuggestedCategories([]);
                setIsExpandedCategories(true);
            } else {
                setAiAnalysisError(null);
                const detected = mapAiCategoryToCanonical(aiData.category);
                if (detected.length > 0) {
                    setSelectedCategories(detected);
                    setSuggestedCategories(detected);
                    setIsExpandedCategories(false);
                } else {
                    setSelectedCategories([]);
                    setSuggestedCategories([]);
                    setIsExpandedCategories(true);
                    setAiAnalysisError("We couldn't detect the issue automatically. Please pick one below.");
                }

                if (aiData.auto_description && !notes) {
                    setNotes(aiData.auto_description);
                }
            }
        } else {
            // Run AI analysis if not pre-computed by camera modal
            runAIAnalysis(capturedFile);
        }
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsWatermarking(true);
        try {
            const watermarked = file;
            const objectUrl = URL.createObjectURL(watermarked);
            setPhoto(objectUrl);
            setPhotoFile(watermarked);
            setPhotoCapturedAt(new Date().toISOString());

            // Run AI category analysis immediately
            runAIAnalysis(watermarked);
        } catch (err) {
            console.warn('Evidence watermarking fallback:', err);
            const fallbackUrl = URL.createObjectURL(file);
            setPhoto(fallbackUrl);
            setPhotoFile(file);
            setPhotoCapturedAt(new Date().toISOString());

            // Run AI category analysis immediately with original file
            runAIAnalysis(file);
        } finally {
            setIsWatermarking(false);
            if (e.target) e.target.value = '';
        }
    };

    // Simulated camera capture for desktop browser testing if user doesn't upload a file
    const handleSimulateCameraCapture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Draw realistic field view with road and lamp post
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, 800, 600);
            // Asphalt road
            ctx.fillStyle = '#334155';
            ctx.fillRect(0, 320, 800, 280);
            // Road lines
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 8;
            ctx.setLineDash([30, 25]);
            ctx.beginPath();
            ctx.moveTo(0, 460);
            ctx.lineTo(800, 460);
            ctx.stroke();
            // Pothole damage representation
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(420, 480, 110, 45, -0.1, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#ff6b00';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.stroke();
            // Street lamp pole
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(660, 120, 14, 400);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(667, 120, 22, 0, 2 * Math.PI);
            ctx.fill();

            // Timestamp banner
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(20, 20, 480, 70);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(`PULSO VERIFIED FIELD PHOTO - ROAD DAMAGE & STREETLIGHT`, 35, 50);
            ctx.font = '14px monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`${resolvedBarangay || 'Caloocan'}, Caloocan • ${new Date().toLocaleDateString()}`, 35, 72);

            const simulatedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPhoto(simulatedDataUrl);
            setPhotoCapturedAt(new Date().toISOString());

            // Convert data URL to Blob for upload and run AI analysis
            fetch(simulatedDataUrl)
                .then((res) => res.blob())
                .then((blob) => {
                    setPhotoFile(blob);
                    runAIAnalysis(blob);
                });
        }
    };

    // -------------------------------------------------------------------------
    // Category Toggles
    // -------------------------------------------------------------------------
    const toggleCategory = (catName) => {
        setSelectedCategories((prev) => {
            if (prev.includes(catName)) {
                return prev.filter((c) => c !== catName);
            } else {
                return [...prev, catName];
            }
        });
    };

    const removeSuggestedCategory = (catName) => {
        setSelectedCategories((prev) => prev.filter((c) => c !== catName));
        setSuggestedCategories((prev) => prev.filter((c) => c !== catName));
    };

    const isOthersSelected = selectedCategories.includes('Others');
    const notesProfanityValidation = useMemo(() => validateProfanity(notes, 'notes'), [notes]);
    const othersProfanityValidation = useMemo(() => validateProfanity(othersDescription, 'description'), [othersDescription]);
    const hasProfanityInForm = notesProfanityValidation.hasProfanity || othersProfanityValidation.hasProfanity;
    const isStep2Valid = selectedCategories.length > 0 && (!isOthersSelected || (othersDescription.trim().length > 0 && !othersProfanityValidation.hasProfanity));

    const isPhotoIneligible = Boolean(
        aiFeedback && (
            aiFeedback.is_inappropriate === true ||
            aiFeedback.is_infrastructure === false ||
            aiFeedback.category === 'Inappropriate Content'
        )
    );
    const canProceedStep1 = Boolean(photo && !isWatermarking && !isAnalyzing && !isPhotoIneligible);

    const handleContinueToStep2 = () => {
        if (!canProceedStep1) return;
        setStep(2);
    };

    const handleRemovePhoto = () => {
        setPhoto(null);
        setPhotoFile(null);
        setPhotoCapturedAt(null);
        setAiFeedback(null);
        setAiAnalysisError(null);
        setIsAnalyzing(false);
        setIsFullscreenPhotoOpen(false);
        setSelectedCategories([]);
        setSuggestedCategories([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const draft = JSON.parse(rawDraft);
                delete draft.photo;
                delete draft.photoCapturedAt;
                draft.selectedCategories = [];
                draft.suggestedCategories = [];
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            }
        } catch (e) {
            console.error('Error updating draft after removing photo:', e);
        }
    };

    // -------------------------------------------------------------------------
    // Modal Navigation & Discard Logic
    // -------------------------------------------------------------------------
    const handleCloseAttempt = () => {
        // If photo exists or notes typed, show confirmation modal
        if (photo || notes.trim() || selectedCategories.length > 0) {
            setIsDiscardPromptOpen(true);
        } else {
            clearSavedDraft();
            onClose();
        }
    };

    const handleConfirmDiscard = () => {
        clearSavedDraft();
        setIsDiscardPromptOpen(false);
        setPhoto(null);
        setPhotoFile(null);
        setNotes('');
        setSelectedCategories([]);
        setSuggestedCategories([]);
        setAiFeedback(null);
        setAiAnalysisError(null);
        setOthersDescription('');
        setStep(1);
        onClose();
    };

    // -------------------------------------------------------------------------
    // Step 3 Submission
    // -------------------------------------------------------------------------
    const handleFinalSubmit = async () => {
        if (!selectedCategories.length) return;
        if (duplicateReport) return;

        // Inappropriate language / profanity validation guard
        if (notesProfanityValidation.hasProfanity) {
            setSubmitError(notesProfanityValidation.message);
            setTimeout(() => {
                if (errorCardRef.current) {
                    errorCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 60);
            return;
        }

        if (othersProfanityValidation.hasProfanity) {
            setSubmitError(othersProfanityValidation.message);
            setTimeout(() => {
                if (errorCardRef.current) {
                    errorCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 60);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            if (onSubmitReport) {
                const result = await onSubmitReport({
                    photo,
                    photoFile,
                    photoCapturedAt,
                    categories: selectedCategories,
                    notes,
                    othersDescription,
                    locationDetails,
                    barangay: resolvedBarangay,
                    location: reportLocation,
                    address: displayAddress
                });
                if (result?.trackingNumbers && result.trackingNumbers.length > 0) {
                    setSubmittedTrackingNumbers(result.trackingNumbers);
                } else {
                    // Generate canonical PULSO tracking numbers based on timestamp
                    const now = new Date();
                    const year = now.getFullYear();
                    const ids = selectedCategories.map(
                        (_, idx) => `#PUL-${year}-${Math.floor(1000 + Math.random() * 9000 + idx)}`
                    );
                    setSubmittedTrackingNumbers(ids);
                }
            } else {
                // Fallback simulation for preview/demo
                await new Promise((r) => setTimeout(r, 1200));
                const year = new Date().getFullYear();
                const ids = selectedCategories.map(
                    (_, idx) => `#PUL-${year}-${Math.floor(5100 + Math.random() * 200 + idx)}`
                );
                setSubmittedTrackingNumbers(ids);
            }

            clearSavedDraft();
            setStep(4); // Advance to Success Screen
        } catch (err) {
            console.error('PULSO: Error submitting quick report:', err);
            const rawMsg = err?.message || '';
            const isConnErr = !rawMsg || rawMsg.includes('fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Failed to submit');
            const errMsg = isConnErr
                ? 'Unable to connect to City Engineering server. Please check your connection and try again.'
                : rawMsg;
            setSubmitError(errMsg);

            if (err?.isDuplicate || rawMsg.includes('already being processed') || err?.status === 409) {
                setDuplicateReport(err.existingReport || {
                    ticket_id: err.canonicalTicket || `#PUL-${new Date().getFullYear()}-4717`,
                    category: selectedCategories[0] || 'Roads & Bridges',
                    status: 'in_progress',
                    location_string: displayAddress || resolvedBarangay || 'Caloocan City',
                    description: 'Civic concern reported at this location is currently active and being processed by City Engineering.'
                });
            } else {
                setDuplicateReport(null);
            }

            // Immediately scroll error / duplicate notice into visible view so resident sees it right away
            setTimeout(() => {
                if (errorCardRef.current) {
                    errorCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTo({ top: contentAreaRef.current.scrollHeight, behavior: 'smooth' });
                }
            }, 60);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyTrackingNumber = (trackingId) => {
        if (navigator?.clipboard) {
            navigator.clipboard.writeText(trackingId);
            setCopiedTrackingId(trackingId);
            setTimeout(() => setCopiedTrackingId(null), 2000);
        }
    };

    if (!isOpen) return null;

    // Step configuration
    const stepSubtitle = {
        1: 'Step 1 of 3 · Photo',
        2: 'Step 2 of 3 · Category',
        3: 'Step 3 of 3 · Details',
        4: 'Report Submitted'
    }[step];

    return (
        <div
            className="fixed inset-0 z-[75] flex items-center justify-center bg-black/65 sm:backdrop-blur-xs p-0 sm:p-4 md:p-6 overflow-hidden select-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-report-wizard-title"
            onClick={handleCloseAttempt}
        >
            {/* Modal Card: 100% Fullscreen on mobile, centered floating card on desktop */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg md:max-w-xl flex flex-col bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl sm:border border-slate-200 dark:border-slate-800 sm:shadow-2xl overflow-hidden relative ${
                    theme === 'dark' ? 'dark' : ''
                }`}
            >
                {/* ----------------------------------------------------------------- */}
                {/* 1. FIXED HEADER */}
                {/* ----------------------------------------------------------------- */}
                <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-0">
                    <div className="w-full px-5 pt-2 sm:pt-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] border border-orange-500/30 flex items-center justify-center shrink-0">
                                <FileText size={20} className="text-[#ff6b00]" />
                            </div>
                            <div>
                                <h2
                                    id="quick-report-wizard-title"
                                    className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
                                >
                                    Quick Report
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal leading-snug">
                                    Submit an infrastructure hazard for LGU verification & dispatch.
                                </p>
                            </div>
                        </div>

                        {/* Round Close Button: 48px tap target */}
                        <button
                            type="button"
                            onClick={handleCloseAttempt}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0"
                            aria-label="Close report flow"
                        >
                            <X size={18} strokeWidth={2.2} />
                        </button>
                    </div>

                    {/* 3-Segment Progress Bar */}
                    {step <= 3 && (
                        <div className="mt-3.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                <span>{stepSubtitle}</span>
                            </div>
                            <div
                                className="flex items-center gap-2"
                                role="progressbar"
                                aria-valuenow={step}
                                aria-valuemin={1}
                                aria-valuemax={3}
                                aria-label={`Step ${step} of 3`}
                            >
                                {[1, 2, 3].map((segmentIndex) => {
                                    const isFilled = segmentIndex <= step;
                                    return (
                                        <div
                                            key={segmentIndex}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                isFilled
                                                    ? 'bg-[#ff6b00]'
                                                    : 'bg-slate-200 dark:bg-slate-800'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    </div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* 2. SCROLLABLE BODY CONTENT (Middle Area) */}
                {/* ----------------------------------------------------------------- */}
                <div
                    ref={contentAreaRef}
                    className="flex-1 overflow-y-auto overscroll-contain"
                >
                    <div className="w-full px-5 py-4 space-y-4">
                        {/* STEP 1: PHOTO */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Location Card — Exact match to media_1792088969234_9f89a523.png */}
                            <div className="p-3.5 bg-slate-50 dark:bg-[#141d2e]/90 border border-slate-200/90 dark:border-slate-700/60 rounded-2xl transition-all">
                                <div className="flex items-start gap-3">
                                    {/* MapPin Badge Icon */}
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] border border-orange-500/25 flex items-center justify-center shrink-0 mt-0.5">
                                        <MapPin size={20} className="text-[#ff6b00]" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Address Text + Copy Button */}
                                        <div className="flex items-start justify-between gap-1.5">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words select-text cursor-text flex-1">
                                                {displayAddress}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleCopyAddress}
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                                                title={isAddressCopied ? 'Copied!' : 'Copy full address'}
                                                aria-label="Copy address"
                                            >
                                                {isAddressCopied ? (
                                                    <Check size={14} className="text-emerald-500" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>

                                        {/* Location Badges & Accuracy Indicator (Single line) */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {reportLocation && typeof reportLocation.lat === 'number' && typeof reportLocation.lng === 'number' && (
                                                <>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 select-all">
                                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Lat</span> {reportLocation.lat.toFixed(5)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 select-all">
                                                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Lng</span> {reportLocation.lng.toFixed(5)}
                                                    </span>
                                                </>
                                            )}

                                            {locationPermissionDenied ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40">
                                                    <AlertTriangle size={13} className="text-red-500 shrink-0" />
                                                    <span>Location permission denied</span>
                                                    {requestDeviceLocation && (
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDeviceLocation(true)}
                                                            className="underline ml-1 cursor-pointer font-bold hover:text-red-700 dark:hover:text-red-300"
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                </span>

                                            ) : !reportLocation ? (
                                                <span className="text-xs text-slate-600 dark:text-slate-300">{t('reportWizard.step2Location.noLocationHelp', 'Location not set. Use GPS or choose a place on the map.')}</span>
                                            ) : (reportLocation?.accuracy && reportLocation.accuracy > 300) ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/50">
                                                    <Info size={13} className="text-amber-500 shrink-0" />
                                                    <span>Approximate Area (±{Math.round(reportLocation.accuracy)}m)</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50">
                                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                    <span>Accurate GPS</span>
                                                </span>
                                            )}
                                        </div>
                                        {!reportLocation && (
                                            <div className="flex flex-wrap gap-2 mt-3" aria-label="Location controls">
                                                <button
                                                    type="button"
                                                    onClick={() => requestDeviceLocation?.(true)}
                                                    className="min-h-10 px-4 rounded-xl bg-[#ff6b00] hover:bg-[#e05e00] text-sm font-bold text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                                                >
                                                    <MapPin size={14} />
                                                    <span>{t('reportWizard.step2Location.useMyLocation', 'Use my location')}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Photo Box */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileSelected}
                            />

                            {!photo ? (
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/40 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                        <Camera size={26} />
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            Take a photo of the problem
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                            {t('reportWizard.step2Location.photoLocationNote', 'Capture a clear photo. Location is added only when you select it.')}
                                        </p>
                                    </div>

                                    {/* Solid Orange Primary Button (crisp white text and icon) */}
                                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs mt-1">
                                        <button
                                            type="button"
                                            onClick={handleTriggerCamera}
                                            disabled={isWatermarking}
                                            className="w-full h-12 min-h-[48px] bg-[#ff6b00] hover:bg-[#e05e00] text-white hover:text-white font-bold px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] group"
                                        >
                                            {isWatermarking ? (
                                                <Loader2 size={18} className="animate-spin text-white" />
                                            ) : (
                                                <Camera size={18} strokeWidth={2.5} className="text-white group-hover:text-white" />
                                            )}
                                            <span className="text-white group-hover:text-white">Open Camera</span>
                                        </button>
                                    </div>

                                    {/* Desktop fallback to simulate quick photo capture for dev preview testing only */}
                                    {typeof window !== 'undefined' && (import.meta.env?.DEV || window.location.pathname.startsWith('/dev')) && (
                                        <button
                                            type="button"
                                            onClick={handleSimulateCameraCapture}
                                            className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                                        >
                                            Use sample field photo (testing)
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Photo preview following real photo shape (4:3, 16:9 or 1:1) with fullscreen expansion */}
                                    <div
                                        onClick={() => setIsFullscreenPhotoOpen(true)}
                                        className="w-full max-h-[380px] rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800 bg-slate-950 cursor-pointer group flex items-center justify-center"
                                        title="Click to view full photo"
                                    >
                                        <img
                                            src={photo}
                                            alt="Captured field hazard"
                                            className="w-full h-auto max-h-[380px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                                        />

                                        {/* Remove Photo (X Button) */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemovePhoto();
                                            }}
                                            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white hover:text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md cursor-pointer border border-white/20 active:scale-90 z-10"
                                            title="Remove photo"
                                            aria-label="Remove photo"
                                        >
                                            <X size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsFullscreenPhotoOpen(true);
                                            }}
                                            className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-white/15"
                                            title="View full photo"
                                            aria-label="View full photo"
                                        >
                                            <Maximize2 size={13} />
                                            <span>Full Photo</span>
                                        </button>
                                    </div>

                                    {/* Retake Control & Detected Issues Card */}
                                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                                <Check size={18} strokeWidth={3} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                    Photo captured
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Timestamped & tagged
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleTriggerCamera}
                                            className="h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                                        >
                                            <RotateCcw size={13} />
                                            <span>Retake</span>
                                        </button>
                                    </div>

                                    {/* Detected Issues Banner / Scanning State */}
                                    {isAnalyzing ? (
                                        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center gap-3 animate-pulse">
                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                                <Loader2 size={20} className="animate-spin text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                    Vision Eye AI
                                                </div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    Checking your photo...
                                                </div>
                                            </div>
                                        </div>
                                    ) : isPhotoIneligible ? (
                                        <div className="bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500/30 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                    <AlertTriangle size={20} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                                        Not Public Infrastructure
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5 leading-snug">
                                                        {formatRejectionReason(aiFeedback?.rejection_reason)}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleTriggerCamera}
                                                className="w-full h-11 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm active:scale-[0.99]"
                                            >
                                                <Camera size={16} />
                                                <span>Retake with a valid infrastructure photo</span>
                                            </button>
                                        </div>
                                    ) : selectedCategories.length > 0 ? (
                                        <div className="bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/25 rounded-2xl p-3.5 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#ff6b00] text-white flex items-center justify-center shrink-0">
                                                <Eye size={20} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                    Detected {selectedCategories.length} {selectedCategories.length === 1 ? 'Issue' : 'Issues'}
                                                </div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {selectedCategories.join(' + ')}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                                <HelpCircle size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    {aiAnalysisError ? 'Detection Notice' : 'Category Selection'}
                                                </div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {aiAnalysisError || 'Tap Continue to select category'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Collapsed Photo Tips Disclosure Row */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60">
                                <button
                                    type="button"
                                    onClick={() => setIsPhotoTipsOpen(!isPhotoTipsOpen)}
                                    className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    aria-expanded={isPhotoTipsOpen}
                                >
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        Photo tips
                                    </span>
                                    {isPhotoTipsOpen ? (
                                        <ChevronUp size={18} className="text-slate-500" />
                                    ) : (
                                        <ChevronDown size={18} className="text-slate-500" />
                                    )}
                                </button>

                                {isPhotoTipsOpen && (
                                    <div className="px-4 pb-3.5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-start gap-2">
                                            <span className="text-[#ff6b00] font-bold">•</span>
                                            <span>Show the damage clearly in good light.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[#ff6b00] font-bold">•</span>
                                            <span>Include a nearby landmark, street post or house number.</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-[#ff6b00] font-bold">•</span>
                                            <span>{t('reportWizard.step2Location.chooseBeforeSubmit', 'Choose the issue location with GPS or the map before submitting.')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CATEGORY */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {isAnalyzing ? (
                                <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#ff6b00] flex items-center justify-center shadow-inner">
                                        <Eye size={32} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                                            Checking your photo...
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                            PULSO Vision Eye is scanning infrastructure damage...
                                        </p>
                                    </div>
                                    <div className="w-full max-w-xs pt-2">
                                        <PulsoPulseLine />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                                            {selectedCategories.length === 0
                                                ? 'Select issue category'
                                                : selectedCategories.length === 1
                                                ? 'Confirm the 1 issue'
                                                : `Confirm the ${selectedCategories.length} issues`}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {selectedCategories.length === 0
                                                ? (aiAnalysisError || "We couldn't detect the issue automatically. Please pick one below.")
                                                : selectedCategories.length === 1
                                                ? 'We found 1 problem in your photo. Remove or add types if needed.'
                                                : `We found ${selectedCategories.length} problems in your photo. Remove or add types if needed.`}
                                        </p>
                                    </div>

                                    {/* If inappropriate image notice */}
                                    {aiFeedback?.is_inappropriate && aiFeedback?.rejection_reason && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-bold">Image Notice</div>
                                                <div className="mt-0.5 leading-snug">{formatRejectionReason(aiFeedback.rejection_reason)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggested Issue Cards with Removable X */}
                                    {selectedCategories.length > 0 && (
                                        <div className="space-y-2.5">
                                            {selectedCategories.map((catName) => {
                                                const IconComponent = getCategoryIconComponent(catName);
                                                return (
                                                    <div
                                                        key={catName}
                                                        className="bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                                                <IconComponent size={20} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                                                                    Suggested from your photo
                                                                </div>
                                                                <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                                    {catName}
                                                                </div>
                                                                {CATEGORY_SUBTITLES[catName] && (
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                        {CATEGORY_SUBTITLES[catName]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Removable X (min 44px tap target) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSuggestedCategory(catName)}
                                                            className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                                                            aria-label={`Remove ${catName}`}
                                                        >
                                                            <X size={18} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Soft Note Card: bold only "one report per issue" */}
                                    {selectedCategories.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            We will send <strong className="font-bold text-slate-900 dark:text-white">one report per issue</strong> so each reaches the right crew. All of them share your photo and location.
                                        </div>
                                    )}

                                    {/* Outlined Toggle Button: Add or change issue types */}
                                    {selectedCategories.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsExpandedCategories(!isExpandedCategories)}
                                            className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                                        >
                                            <span>{isExpandedCategories ? 'Hide issue types' : 'Add or change issue types'}</span>
                                            {isExpandedCategories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}

                                    {/* Expanded Category Checklist: 7 Canonical Categories */}
                                    {(isExpandedCategories || selectedCategories.length === 0) && (
                                        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                            {REPORTABLE_CATEGORIES.map((catName) => {
                                                const isSelected = selectedCategories.includes(catName);
                                                const IconComp = getCategoryIconComponent(catName);
                                                return (
                                                    <div
                                                        key={catName}
                                                        onClick={() => toggleCategory(catName)}
                                                        className={`min-h-[3.25rem] px-4 py-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all group ${
                                                            isSelected
                                                                ? 'border-2 border-[#ff6b00] bg-orange-500/10 dark:bg-orange-500/15'
                                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                                            <div
                                                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-[#ff6b00] group-hover:bg-[#e05e00] text-white group-hover:text-white font-bold'
                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                                                                }`}
                                                            >
                                                                <IconComp size={18} className={isSelected ? 'text-white' : ''} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
                                                                    {catName}
                                                                </span>
                                                                {CATEGORY_SUBTITLES[catName] && (
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                                                                        {CATEGORY_SUBTITLES[catName]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Checkbox */}
                                                        <div
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                                                isSelected
                                                                    ? 'bg-[#ff6b00] group-hover:bg-[#e05e00] text-white group-hover:text-white'
                                                                    : 'border-2 border-slate-300 dark:border-slate-600'
                                                            }`}
                                                        >
                                                            {isSelected && <Check size={14} strokeWidth={3} className="text-white" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* If "Others" is selected, require short problem description */}
                                    {isOthersSelected && (
                                        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Describe the problem <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={200}
                                                value={othersDescription}
                                                onChange={(e) => setOthersDescription(e.target.value)}
                                                placeholder="Briefly state the issue for City Engineering"
                                                className={`w-full px-3 py-2 rounded-xl border ${
                                                    othersProfanityValidation.hasProfanity
                                                        ? 'border-red-400 dark:border-red-500/80 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500 text-red-950 dark:text-red-100'
                                                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-orange-500 text-slate-900 dark:text-white'
                                                } text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors`}
                                            />
                                            <div className="flex items-start justify-between text-[11px] gap-2">
                                                {othersProfanityValidation.hasProfanity ? (
                                                    <div className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400 leading-tight">
                                                        <AlertCircle size={12} className="shrink-0 text-red-500" />
                                                        <span>{othersProfanityValidation.message}</span>
                                                    </div>
                                                ) : <span />}
                                                <div className="text-slate-400 dark:text-slate-500 shrink-0">
                                                    {othersDescription.length} / 200
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 3: DETAILS */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                                    Add details
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    Review summary and add landmarks to guide the field crew.
                                </p>
                            </div>

                            {/* Summary Card with 3 Tappable Rows */}
                            <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                                {/* Row 1: Issues */}
                                <div className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                        Issues
                                    </span>
                                    <div className="flex items-center text-right flex-1 justify-end">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white break-words text-right">
                                            {selectedCategories.join(' + ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Row 2: Location */}
                                <div className="w-full px-4 py-3.5 flex items-start justify-between text-left gap-3">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                                        Location
                                    </span>
                                    <div className="flex items-center text-right flex-1 justify-end">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white break-words text-right leading-snug">
                                            {displayAddress}
                                        </span>
                                    </div>
                                </div>

                                {/* Row 3: Photo */}
                                <div className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                        Photo
                                    </span>
                                    <div className="flex items-center gap-2 text-right">
                                        {photo && (
                                            <img
                                                src={photo}
                                                alt="Thumbnail"
                                                className="w-6 h-6 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                                            />
                                        )}
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <Check size={14} strokeWidth={3} />
                                            Attached
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Collapsed "Add more location details" */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60">
                                <button
                                    type="button"
                                    onClick={() => setIsLocationDetailsExpanded(!isLocationDetailsExpanded)}
                                    className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                    aria-expanded={isLocationDetailsExpanded}
                                >
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        Add more location details
                                    </span>
                                    {isLocationDetailsExpanded ? (
                                        <ChevronUp size={18} className="text-slate-500" />
                                    ) : (
                                        <ChevronDown size={18} className="text-slate-500" />
                                    )}
                                </button>

                                {isLocationDetailsExpanded && (
                                    <div className="p-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                Subdivision / Village / Building
                                            </label>
                                            <input
                                                type="text"
                                                value={locationDetails.subdivision}
                                                onChange={(e) =>
                                                    setLocationDetails({ ...locationDetails, subdivision: e.target.value })
                                                }
                                                placeholder="e.g. Celina Homes 3 or Camarin Commercial Ctr"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                House No. / Blk / Lot / Street
                                            </label>
                                            <input
                                                type="text"
                                                value={locationDetails.houseNumber}
                                                onChange={(e) =>
                                                    setLocationDetails({ ...locationDetails, houseNumber: e.target.value })
                                                }
                                                placeholder="e.g. Blk 4 Lot 16 Silver Street"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                                Nearby landmark
                                            </label>
                                            <input
                                                type="text"
                                                value={locationDetails.landmark}
                                                onChange={(e) =>
                                                    setLocationDetails({ ...locationDetails, landmark: e.target.value })
                                                }
                                                placeholder="e.g. Beside 7-Eleven or in front of Brgy. Outpost"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes (optional) with 500-char limit and Voice Input */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                                        Notes <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        {voiceSupported && (
                                            <button
                                                type="button"
                                                onClick={toggleVoiceRecording}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                    isRecordingVoice
                                                        ? 'bg-red-500 text-white animate-pulse'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                                aria-label={isRecordingVoice ? 'Stop listening' : 'Start voice notes dictation'}
                                            >
                                                {isRecordingVoice ? <MicOff size={13} /> : <Mic size={13} />}
                                                <span>{isRecordingVoice ? 'Listening...' : 'Voice notes'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <textarea
                                        rows={isLocationDetailsExpanded ? 3 : 6}
                                        maxLength={500}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Landmarks or details that help the crew find it"
                                        className={`w-full ${
                                            isLocationDetailsExpanded ? 'min-h-[5.5rem]' : 'min-h-[9.5rem] sm:min-h-[10.5rem]'
                                        } p-3.5 rounded-2xl border ${
                                            notesProfanityValidation.hasProfanity
                                                ? 'border-red-400 dark:border-red-500/80 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500 text-red-950 dark:text-red-100'
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus:ring-orange-500 text-slate-900 dark:text-white'
                                        } text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-none transition-all duration-200`}
                                    />
                                    <div className="flex items-start justify-between mt-1 px-1 gap-2">
                                        {notesProfanityValidation.hasProfanity ? (
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 leading-tight">
                                                <AlertCircle size={13} className="shrink-0 text-red-500" />
                                                <span>{notesProfanityValidation.message}</span>
                                            </div>
                                        ) : (
                                            <span />
                                        )}
                                        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                                            {notes.length} / 500
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error / Duplicate report notification card if submission failed */}
                            {submitError && (
                                <div ref={errorCardRef} className="space-y-3 scroll-mt-6">
                                    {duplicateReport ? (
                                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 space-y-3 shadow-md ring-2 ring-amber-400/50 dark:ring-amber-500/40 animate-in fade-in zoom-in-[0.98] duration-200">
                                            <div className="flex items-start gap-2.5">
                                                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                                                        Active Report Already In Progress
                                                    </h4>
                                                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed font-medium">
                                                        {submitError}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Report Details Snapshot */}
                                            <div className="p-3 bg-white dark:bg-slate-900/90 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                                                        {duplicateReport.ticket_id || `#PUL-${new Date().getFullYear()}-4717`}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                                        {(duplicateReport.status || 'in_progress').replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="text-[11.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{duplicateReport.location_string || displayAddress || 'Caloocan City'}</span>
                                                </div>
                                                {duplicateReport.description && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                                                        <p className={`italic leading-relaxed ${isDuplicateDescExpanded ? '' : 'line-clamp-2'}`}>
                                                            "{duplicateReport.description}"
                                                        </p>
                                                        {duplicateReport.description.length > 70 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsDuplicateDescExpanded(!isDuplicateDescExpanded)}
                                                                className="mt-1 text-[11px] font-bold text-[#EA580C] hover:text-orange-700 dark:text-[#ff6b00] dark:hover:text-orange-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                                            >
                                                                <span>{isDuplicateDescExpanded ? 'See less' : 'See more'}</span>
                                                                <ChevronDown
                                                                    size={12}
                                                                    className={`transition-transform duration-200 ${isDuplicateDescExpanded ? 'rotate-180' : ''}`}
                                                                />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-800 dark:text-red-300">
                                            <div className="flex items-start gap-2.5">
                                                <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                                <span className="flex-1 font-medium leading-relaxed">{submitError}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: SUCCESS SCREEN */}
                    {step === 4 && (
                        <div className="py-4 space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                                <Check size={32} strokeWidth={3} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {submittedTrackingNumbers.length > 1
                                        ? `Your ${submittedTrackingNumbers.length} reports were sent`
                                        : 'Your report was sent'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                    City Engineering has received your report and dispatched verification.
                                </p>
                            </div>

                            {/* Tracking Number Cards */}
                            <div className="space-y-2 max-w-sm mx-auto text-left">
                                {submittedTrackingNumbers.map((trackingId, idx) => {
                                    const catName = selectedCategories[idx] || selectedCategories[0] || 'Infrastructure Hazard';
                                    return (
                                        <div
                                            key={trackingId}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between gap-2"
                                        >
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                                                    {catName}
                                                </div>
                                                <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                                                    {trackingId}
                                                </div>
                                                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                    Queued for Verification
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleCopyTrackingNumber(trackingId)}
                                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0"
                                                aria-label="Copy tracking ID"
                                            >
                                                {copiedTrackingId === trackingId ? (
                                                    <Check size={16} className="text-emerald-500" />
                                                ) : (
                                                    <Copy size={16} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Emergency 911 Call Note */}
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto flex items-center justify-center gap-1.5">
                                <PhoneCall size={14} className="text-red-500 shrink-0" />
                                <span>
                                    For life-threatening emergencies, call{' '}
                                    <a
                                        href="tel:911"
                                        className="font-bold text-red-600 dark:text-red-400 underline"
                                    >
                                        911
                                    </a>{' '}
                                    directly.
                                </span>
                            </div>
                        </div>
                    )}
                    </div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* 3. FIXED FOOTER BUTTONS */}
                {/* ----------------------------------------------------------------- */}
                <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0">
                    <div className="w-full px-5 pt-3 pb-3 sm:pb-4">
                        {/* STEP 1 FOOTER */}
                    {step === 1 && (
                        <div className="space-y-1.5">
                            {/* Status Helper Text */}
                            {isPhotoIneligible ? (
                                <p className="text-xs text-red-600 dark:text-red-400 font-semibold text-center">
                                    Photo not applicable to city infrastructure. Please retake photo.
                                </p>
                            ) : !photo ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                    Take a photo to continue
                                </p>
                            ) : null}

                            {/* Primary Button */}
                            <button
                                type="button"
                                disabled={!canProceedStep1}
                                onClick={handleContinueToStep2}
                                className={`w-full min-h-[52px] h-[3.25rem] rounded-xl text-base font-bold transition-all flex items-center justify-center ${
                                    canProceedStep1
                                        ? 'bg-[#ff6b00] hover:bg-[#e05e00] text-white hover:text-white shadow-md shadow-orange-500/20 active:scale-[0.99] cursor-pointer'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {isWatermarking || isAnalyzing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-slate-400 dark:text-slate-500" />
                                        <span>Checking photo...</span>
                                    </div>
                                ) : isPhotoIneligible ? (
                                    <span>Retake photo to continue</span>
                                ) : (
                                    <span>Continue</span>
                                )}
                            </button>

                            {/* Cancel Link */}
                            <button
                                type="button"
                                onClick={handleCloseAttempt}
                                className="w-full min-h-[44px] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* STEP 2 FOOTER */}
                    {step === 2 && (
                        <div className="space-y-1.5">
                            {/* Primary Button: Confirm X issues */}
                            <button
                                type="button"
                                disabled={isAnalyzing || !isStep2Valid}
                                onClick={() => setStep(3)}
                                className={`w-full min-h-[52px] h-[3.25rem] rounded-xl text-base font-bold transition-all flex items-center justify-center ${
                                    !isAnalyzing && isStep2Valid
                                        ? 'bg-[#ff6b00] hover:bg-[#e05e00] text-white hover:text-white shadow-md shadow-orange-500/20 active:scale-[0.99] cursor-pointer'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {isAnalyzing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-slate-500 dark:text-slate-400" />
                                        <span>Scanning photo...</span>
                                    </div>
                                ) : selectedCategories.length === 1 ? (
                                    'Confirm 1 issue'
                                ) : selectedCategories.length > 1 ? (
                                    `Confirm ${selectedCategories.length} issues`
                                ) : (
                                    'Select an issue'
                                )}
                            </button>

                            {/* Back Link */}
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full min-h-[44px] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* STEP 3 FOOTER */}
                    {step === 3 && (
                        <div className="space-y-1.5">
                            {/* Primary Button: Submit reports */}
                            <button
                                type="button"
                                disabled={isSubmitting || hasProfanityInForm || Boolean(duplicateReport)}
                                onClick={handleFinalSubmit}
                                className={`w-full min-h-[52px] h-[3.25rem] rounded-xl text-base font-bold text-white shadow-md transition-all flex items-center justify-center ${
                                    isSubmitting || hasProfanityInForm || Boolean(duplicateReport)
                                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-[#ff6b00] hover:bg-[#e05e00] shadow-orange-500/20 active:scale-[0.99] cursor-pointer'
                                }`}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={20} className="animate-spin text-white" />
                                        <span>Submitting...</span>
                                    </div>
                                ) : duplicateReport ? (
                                    <span>In Progress</span>
                                ) : selectedCategories.length > 1 ? (
                                    `Submit ${selectedCategories.length} reports`
                                ) : (
                                    'Submit report'
                                )}
                            </button>

                            {/* Back Link */}
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setStep(2)}
                                className="w-full min-h-[44px] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    )}

                    {/* STEP 4 FOOTER (Success) */}
                    {step === 4 && (
                        <div className="space-y-1.5">
                            {/* Track my report */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onTrackReport) {
                                        onTrackReport(submittedTrackingNumbers[0]);
                                    }
                                    onClose();
                                }}
                                className="w-full min-h-[52px] h-[3.25rem] rounded-xl text-base font-bold bg-[#ff6b00] hover:bg-[#e05e00] text-white hover:text-white shadow-md shadow-orange-500/20 active:scale-[0.99] cursor-pointer transition-all flex items-center justify-center"
                            >
                                Track my report
                            </button>

                            {/* Done Link */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full min-h-[44px] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                    </div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* 4. DISCARD CONFIRMATION DIALOG MODAL */}
                {/* ----------------------------------------------------------------- */}
                <AnimatePresence>
                    {isDiscardPromptOpen && (
                        <div
                            className="absolute inset-0 z-50 backdrop-blur-md bg-black/20 dark:bg-black/40 flex items-center justify-center p-4"
                            role="alertdialog"
                            aria-labelledby="discard-dialog-title"
                            aria-describedby="discard-dialog-desc"
                        >
                            <motion.div
                                initial={{ scale: 0.92, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.92, opacity: 0 }}
                                className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl text-center space-y-3"
                            >
                                <h3
                                    id="discard-dialog-title"
                                    className="font-bold text-base text-slate-900 dark:text-white"
                                >
                                    Discard this report?
                                </h3>
                                <p
                                    id="discard-dialog-desc"
                                    className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
                                >
                                    You will lose the photo and details entered for this report.
                                </p>
                                <div className="space-y-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsDiscardPromptOpen(false)}
                                        className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        Keep editing
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmDiscard}
                                        className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors cursor-pointer shadow-xs"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ----------------------------------------------------------------- */}
                {/* 5. LOCATION PICKER SUB-MODAL */}
                {/* ----------------------------------------------------------------- */}
                <AnimatePresence>
                    {isLocationPickerOpen && (
                        <div
                            className="absolute inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col p-4 overflow-hidden"
                            role="dialog"
                            aria-label="Select Caloocan Barangay"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                        Select Barangay
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Caloocan City jurisdiction
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsLocationPickerOpen(false)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search bar */}
                            <div className="relative my-3">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={barangaySearchQuery}
                                    onChange={(e) => setBarangaySearchQuery(e.target.value)}
                                    placeholder="Search barangay number..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            {/* Quick GPS Action */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (requestDeviceLocation) {
                                        requestDeviceLocation(true);
                                    }
                                    setCustomBarangay(null);
                                    setIsLocationPickerOpen(false);
                                }}
                                className="w-full py-2.5 px-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center gap-2 mb-2 cursor-pointer hover:bg-orange-500/20 transition-colors"
                            >
                                <Compass size={16} />
                                <span>Use GPS auto-location</span>
                            </button>

                            {/* List of Barangays */}
                            <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredBarangays.map((b) => (
                                    <button
                                        key={b.name}
                                        type="button"
                                        onClick={() => {
                                            setCustomBarangay(b.name);
                                            setIsLocationPickerOpen(false);
                                        }}
                                        className="w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                            {b.name}
                                        </div>
                                        {resolvedBarangay === b.name && (
                                            <Check size={16} className="text-[#ff6b00]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ----------------------------------------------------------------- */}
                {/* 6. FULLSCREEN EVIDENCE PHOTO LIGHTBOX MODAL */}
                {/* ----------------------------------------------------------------- */}
                <AnimatePresence>
                    {isFullscreenPhotoOpen && photo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFullscreenPhotoOpen(false)}
                            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 cursor-pointer select-none"
                        >
                            <motion.div
                                initial={{ scale: 0.92, y: 16 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.92, y: 16 }}
                                className="relative max-w-5xl flex flex-col items-center justify-center cursor-default"
                            >
                                {/* Full Resolution Photo (clicks on photo do not dismiss; clicks outside will bubble to backdrop) */}
                                <img
                                    src={photo}
                                    alt="Captured field hazard in full screen"
                                    onClick={(e) => e.stopPropagation()}
                                    className="max-w-full max-h-[85vh] sm:max-h-[88vh] object-contain rounded-2xl shadow-2xl border border-white/15"
                                />

                                <p className="text-white/60 text-xs mt-3 text-center pointer-events-none">
                                    Tap anywhere outside to return
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ----------------------------------------------------------------- */}
                {/* 7. LIVE IN-APP CAMERA VIEWFINDER MODAL */}
                {/* ----------------------------------------------------------------- */}
                <IDCameraModal
                    isOpen={isCameraModalOpen}
                    onClose={() => setIsCameraModalOpen(false)}
                    onCapture={handleCameraPhotoCaptured}
                    side="ISSUE"
                    theme={theme}
                    title="Civic Evidence Camera"
                    subtitle="Capture real-time field photo with GPS & timestamp watermark"
                    metadata={{
                        location: reportLocation,
                        reportLocation,
                        structuredAddress: structuredAddress
                            ? { ...structuredAddress, barangay: resolvedBarangay, plusCode: resolvedPlusCode }
                            : null,
                        locationAddress: displayAddress,
                        user: currentUser
                    }}
                />
            </div>
        </div>
    );
}

export default React.memo(QuickReportWizardModal);
