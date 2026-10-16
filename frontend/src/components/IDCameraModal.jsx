import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    ZapOff,
    Check,
    RotateCcw,
    CameraOff,
    Loader2
} from 'lucide-react';
import { drawEvidenceWatermark, burnEvidenceWatermark, formatWatermarkTimestamp } from '../utils/watermark';
import { formatWatermarkAddress } from '../utils/philippineAddress';
import { API_BASE_URL } from '../utils/apiBase';
import PulsoPulseLine from './common/PulsoPulseLine';
import CameraTopBar from './camera/CameraTopBar';
import CameraMessage from './camera/CameraMessage';
import ShutterButton from './camera/ShutterButton';
import RatioSelector from './camera/RatioSelector';
import WatermarkPainter from './camera/WatermarkPainter';

// ---------------------------------------------------------------------------
// Faint Guide Silhouettes for ID Viewfinder (Visual Echo of Document Layout)
// ---------------------------------------------------------------------------
function FrontIdSilhouette() {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 sm:w-48 h-auto opacity-35 select-none pointer-events-none">
            <circle cx="106" cy="14" r="4" className="stroke-white/40" strokeWidth="1" />
            <rect x="10" y="10" width="14" height="11" rx="1.5" className="fill-white/20 stroke-white/40" strokeWidth="0.8" />
            <rect x="10" y="27" width="28" height="36" rx="3" className="fill-white/10 stroke-white/40" strokeWidth="1" />
            <circle cx="24" cy="38" r="5" className="fill-white/45" />
            <path d="M15 57 C15 50 18 48 24 48 C30 48 33 50 33 57" className="fill-white/45" />
            <rect x="44" y="12" width="44" height="3" rx="1.5" className="fill-white/50" />
            <rect x="44" y="18" width="26" height="2" rx="1" className="fill-white/30" />
            <rect x="44" y="28" width="60" height="2.5" rx="1.25" className="fill-white/30" />
            <rect x="44" y="35" width="50" height="2.5" rx="1.25" className="fill-white/30" />
            <rect x="44" y="42" width="40" height="2.5" rx="1.25" className="fill-white/30" />
            <rect x="44" y="52" width="60" height="6" rx="1.5" className="fill-orange-500/20 stroke-orange-400/40" strokeWidth="0.8" />
        </svg>
    );
}

function BackIdSilhouette() {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 sm:w-48 h-auto opacity-35 select-none pointer-events-none">
            <rect x="4" y="10" width="112" height="13" rx="1" className="fill-white/25" />
            <rect x="10" y="30" width="62" height="12" rx="1.5" className="fill-white/15 stroke-white/30" strokeWidth="0.8" />
            <path d="M14 38 Q 24 33 34 39 T 52 36 T 66 38" className="stroke-white/40" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <rect x="78" y="32" width="30" height="8" rx="1.2" className="fill-white/15" />
            <g className="fill-white/35">
                <rect x="10" y="49" width="2.5" height="15" />
                <rect x="14" y="49" width="1.2" height="15" />
                <rect x="17" y="49" width="3.5" height="15" />
                <rect x="22" y="49" width="1.8" height="15" />
                <rect x="26" y="49" width="1.2" height="15" />
                <rect x="29" y="49" width="3" height="15" />
                <rect x="34" y="49" width="1.8" height="15" />
                <rect x="38" y="49" width="1.2" height="15" />
                <rect x="41" y="49" width="3.5" height="15" />
                <rect x="46" y="49" width="1.8" height="15" />
            </g>
        </svg>
    );
}

/**
 * IDCameraModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Redesigned full-screen dark camera flow (PULSO Mobile App & Website):
 * Zone 1 (Top Bar): "Take a photo" (18px bold, white) + "Photos are saved with your location and time."
 *                   48px round close (X) button with card fill & border.
 * Zone 2 (Content): Live 4:3 frame with 4 thin white corner marks & hint text,
 *                   Checking state with pulse line, Preview state (Use this photo / Retake),
 *                   Invalid state (Centered warning, "Not an infrastructure photo" pill, "Cannot proceed with this photo"),
 *                   Permission denied state, and Error state.
 * Zone 3 (Bottom Bar): Navy panel with centered shutter and flash toggle at right.
 */
const IDCameraModal = ({ 
    isOpen, 
    onClose, 
    onCapture, 
    side = 'front', 
    title = 'Take a photo', 
    subtitle = 'Photos are saved with your location and time.', 
    metadata, 
    guideText,
    idTypeName = 'ID',
    onPickFromGallery, // optional gallery picker
    // Preview simulation props (used by /dev/app-preview)
    standalone = false,
    previewMode = null, // 'live' | 'checking' | 'invalid' | 'accepted' | 'permission_denied' | 'error'
    previewSamplePhoto = null,
    ratioOverride = null,
    onRatioChange = null
}) => {
    const isIssue = side === 'ISSUE';
    const isBack = typeof side === 'string' && (side.toLowerCase().includes('back') || side.toLowerCase() === 'secondback');
    const sideWord = isBack ? 'BACK' : 'FRONT';
    const cleanIdTypeName = idTypeName || 'ID';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const modalRef = useRef(null);
    const closeBtnRef = useRef(null);

    const [error, setError] = useState(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [isLoading, setIsLoading] = useState(!previewMode);
    const [liveTime, setLiveTime] = useState(() => new Date());
    const [isVerifying, setIsVerifying] = useState(false);
    const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [capturedAiData, setCapturedAiData] = useState(null);
    const [isAccepted, setIsAccepted] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [announcement, setAnnouncement] = useState('');

    // Flash / Torch state
    const [flashOn, setFlashOn] = useState(false);
    const [isFlashSupported, setIsFlashSupported] = useState(Boolean(previewMode));

    // Aspect ratio selection state (4:3 default, persists during retakes, resets on new report)
    const [photoRatio, setPhotoRatio] = useState(ratioOverride || '4:3');
    const [isLandscape, setIsLandscape] = useState(false);
    const prevIsOpenRef = useRef(false);

    // Sync ratio if controlled via dev showcase
    useEffect(() => {
        if (ratioOverride) {
            setPhotoRatio(ratioOverride);
        }
    }, [ratioOverride]);

    // Orientation detection
    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                setIsLandscape(window.innerWidth > window.innerHeight);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset to 4:3 default every time camera opens fresh for a new report
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current && !ratioOverride) {
            setPhotoRatio('4:3');
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, ratioOverride]);

    // Apply previewMode overrides if supplied (for dev showcase testing)
    useEffect(() => {
        if (!isOpen) return;
        if (previewMode === 'checking') {
            setIsVerifying(true);
            setValidationError(null);
            setIsAccepted(false);
            setCapturedPreviewUrl(previewSamplePhoto || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80');
        } else if (previewMode === 'invalid') {
            setIsVerifying(false);
            setValidationError('This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead.');
            setIsAccepted(false);
            setCapturedPreviewUrl(previewSamplePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80');
        } else if (previewMode === 'accepted') {
            setIsVerifying(false);
            setValidationError(null);
            setIsAccepted(true);
            setCapturedPreviewUrl(previewSamplePhoto || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80');
        } else if (previewMode === 'permission_denied') {
            setError('Camera access denied. Please enable camera permissions in your phone settings.');
            setIsVerifying(false);
            setValidationError(null);
            setIsAccepted(false);
            setCapturedPreviewUrl(null);
        } else if (previewMode === 'error') {
            setError("We can't open the camera right now.");
            setIsVerifying(false);
            setValidationError(null);
            setIsAccepted(false);
            setCapturedPreviewUrl(null);
        } else if (previewMode === 'live') {
            setIsVerifying(false);
            setValidationError(null);
            setIsAccepted(false);
            setCapturedPreviewUrl(null);
            setError(null);
        }
    }, [previewMode, previewSamplePhoto, isOpen]);

    // Reset captured preview when modal opens or closes
    useEffect(() => {
        if (!isOpen) {
            if (capturedPreviewUrl && !previewMode) {
                URL.revokeObjectURL(capturedPreviewUrl);
            }
            setCapturedPreviewUrl(null);
            setCapturedBlob(null);
            setCapturedAiData(null);
            setIsAccepted(false);
            setValidationError(null);
            setIsVerifying(false);
            setFlashOn(false);
        }
    }, [isOpen]);

    const handleRetake = () => {
        if (capturedPreviewUrl && !previewMode) {
            URL.revokeObjectURL(capturedPreviewUrl);
        }
        setCapturedPreviewUrl(null);
        setCapturedBlob(null);
        setCapturedAiData(null);
        setIsAccepted(false);
        setValidationError(null);
        setIsVerifying(false);
        setAnnouncement('Returned to live camera view.');
    };

    // Live clock for real-time camera viewfinder watermark
    useEffect(() => {
        if (!isOpen || side !== 'ISSUE') return;
        setLiveTime(new Date());
        const interval = setInterval(() => {
            setLiveTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, side]);

    // Live Watermark Address & Coordinates for viewfinder
    const addressSource = metadata?.structuredAddress || metadata?.locationAddress || metadata?.address;
    const watermarkAddress = formatWatermarkAddress(
        addressSource,
        metadata?.location || metadata?.coordinates
    );

    let coordsText = '';
    const loc = metadata?.location || metadata?.coordinates;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        coordsText = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        if (typeof loc.accuracy === 'number' && loc.accuracy > 0 && loc.accuracy < 100) {
            coordsText += ` (±${Math.round(loc.accuracy)}m)`;
        }
    } else if (metadata?.lat && metadata?.lng) {
        coordsText = `${Number(metadata.lat).toFixed(4)}, ${Number(metadata.lng).toFixed(4)}`;
    }

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {}
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // Flash / Torch toggle
    const handleToggleFlash = async () => {
        const next = !flashOn;
        setFlashOn(next);
        if (streamRef.current) {
            const track = streamRef.current.getVideoTracks()[0];
            if (track && typeof track.applyConstraints === 'function') {
                try {
                    await track.applyConstraints({
                        advanced: [{ torch: next }]
                    });
                } catch (err) {
                    console.warn('Torch constraint not applied:', err);
                }
            }
        }
    };

    const startStream = useCallback(async () => {
        if (previewMode && previewMode !== 'live') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        stopStream();

        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = newStream;

            const videoTrack = newStream.getVideoTracks()[0];
            if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                const capabilities = videoTrack.getCapabilities();
                setIsFlashSupported(Boolean(capabilities?.torch));
            } else {
                setIsFlashSupported(false);
            }

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play().catch(() => {});
                        resolve();
                    };
                });
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            setHasMultipleCameras(videoDevices.length > 1);

        } catch (err) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('permission_denied');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('No camera detected. Please ensure your camera is connected.');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is in use by another application. Please close it and try again.');
            } else {
                setError(`Camera error: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [facingMode, stopStream, previewMode]);

    useEffect(() => {
        if (isOpen) {
            startStream();
        } else {
            stopStream();
        }
        return () => stopStream();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            startStream();
        }
    }, [facingMode]);

    const handleSwitchCamera = () => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const getFrameRatioClass = (ratio, isLand) => {
        if (ratio === '16:9') {
            return isLand ? 'aspect-[16/9] max-w-2xl' : 'aspect-[9/16] max-h-[64vh]';
        }
        if (ratio === '1:1') {
            return 'aspect-square max-h-[48vh] sm:max-h-[52vh]';
        }
        // '4:3'
        return isLand ? 'aspect-[4/3] max-w-xl' : 'aspect-[3/4] max-h-[56vh] sm:max-h-[60vh]';
    };

    const handleCapture = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Handle simulated capture when in previewMode without active media stream
        if (previewMode && !streamRef.current) {
            const sampleImg = new Image();
            sampleImg.crossOrigin = 'anonymous';
            sampleImg.onload = () => {
                const imgW = sampleImg.naturalWidth || 1600;
                const imgH = sampleImg.naturalHeight || 1200;
                const isLandImg = imgW >= imgH;

                let targetRatio = 1.0;
                if (photoRatio === '4:3') targetRatio = isLandImg ? 4 / 3 : 3 / 4;
                else if (photoRatio === '16:9') targetRatio = isLandImg ? 16 / 9 : 9 / 16;
                else targetRatio = 1.0;

                let cW = imgW, cH = imgH, cX = 0, cY = 0;
                if (imgW / imgH > targetRatio) {
                    cW = Math.round(imgH * targetRatio);
                    cX = Math.round((imgW - cW) / 2);
                } else {
                    cH = Math.round(imgW / targetRatio);
                    cY = Math.round((imgH - cH) / 2);
                }

                const maxC = Math.max(cW, cH);
                const sc = Math.max(1, 1280 / maxC);
                canvas.width = Math.round(cW * sc);
                canvas.height = Math.round(cH * sc);
                context.drawImage(sampleImg, cX, cY, cW, cH, 0, 0, canvas.width, canvas.height);

                if (side === 'ISSUE') {
                    drawEvidenceWatermark(canvas, {
                        ...metadata,
                        timestamp: liveTime
                    });
                }

                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const previewUrl = URL.createObjectURL(blob);
                    setCapturedPreviewUrl(previewUrl);
                    setCapturedBlob(blob);
                    setIsVerifying(false);
                    setIsAccepted(true);
                    setAnnouncement('Photo accepted. Review your photo or retake.');
                }, 'image/jpeg', 0.92);
            };
            sampleImg.src = previewSamplePhoto || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1600&auto=format&fit=crop&q=80";
            return;
        }

        if (!videoRef.current) return;
        const video = videoRef.current;

        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        const isLand = vw >= vh;

        let targetRatio = 1.0;
        if (photoRatio === '4:3') {
            targetRatio = isLand ? 4 / 3 : 3 / 4;
        } else if (photoRatio === '16:9') {
            targetRatio = isLand ? 16 / 9 : 9 / 16;
        } else {
            targetRatio = 1.0;
        }

        // Exact crop matching what is displayed in preview frame with object-cover
        let cropX = 0;
        let cropY = 0;
        let cropW = vw;
        let cropH = vh;

        const videoRatio = vw / vh;
        if (videoRatio > targetRatio) {
            cropW = Math.round(vh * targetRatio);
            cropH = vh;
            cropX = Math.round((vw - cropW) / 2);
            cropY = 0;
        } else {
            cropW = vw;
            cropH = Math.round(vw / targetRatio);
            cropX = 0;
            cropY = Math.round((vh - cropH) / 2);
        }

        // Ensure long side is at least 1280px after crop
        const maxCrop = Math.max(cropW, cropH);
        const scale = Math.max(1, 1280 / maxCrop);

        canvas.width = Math.round(cropW * scale);
        canvas.height = Math.round(cropH * scale);

        // Mirror compensation for user-facing camera
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        // Reset transform so watermark is never mirrored
        if (facingMode === 'user') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Burn evidence watermark using shared function
        if (side === 'ISSUE') {
            drawEvidenceWatermark(canvas, {
                ...metadata,
                timestamp: liveTime
            });
        }

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `captured_evidence_${photoRatio.replace(':', '_')}.jpg`, { type: 'image/jpeg' });

            // Attach text version of watermark in existing details data for screen readers
            const fullAddr = formatWatermarkAddress(metadata?.structuredAddress || metadata?.locationAddress || metadata?.address, metadata?.location || metadata?.coordinates);
            file.watermarkText = `PULSO · Caloocan City | ${fullAddr} | ${formatWatermarkTimestamp(liveTime)}`;

            // If not issue photo (e.g. ID card), proceed directly
            if (side !== 'ISSUE') {
                onCapture(file);
                onClose();
                return;
            }

            // For infrastructure issue evidence: Validate with AI
            const previewUrl = URL.createObjectURL(blob);
            setCapturedPreviewUrl(previewUrl);
            setCapturedBlob(blob);
            setIsVerifying(true);
            setValidationError(null);
            setIsAccepted(false);
            setAnnouncement('Checking your photo...');

            try {
                const formData = new FormData();
                formData.append('image', blob, 'captured_evidence.jpg');
                if (metadata?.category) {
                    formData.append('description', `Selected category: ${metadata.category}`);
                }

                const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
                    method: 'POST',
                    headers,
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.is_inappropriate || data.is_infrastructure === false) {
                        const reason = data.rejection_reason || "This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead.";
                        setValidationError(reason);
                        setIsVerifying(false);
                        setIsAccepted(false);
                        setAnnouncement(`Cannot proceed with this photo. ${reason}`);
                        return;
                    }

                    setIsVerifying(false);
                    setIsAccepted(true);
                    setCapturedAiData(data);
                    setAnnouncement('Photo accepted. Review your photo or retake.');
                } else {
                    setIsVerifying(false);
                    setIsAccepted(true);
                    setCapturedAiData(null);
                    setAnnouncement('Photo captured.');
                }
            } catch (err) {
                console.warn('AI infrastructure verification network error:', err);
                setIsVerifying(false);
                setIsAccepted(true);
                setCapturedAiData(null);
                setAnnouncement('Photo captured.');
            }
        }, 'image/jpeg', 0.95);
    };

    // User confirmed accepted photo in preview state
    const handleConfirmAcceptedPhoto = () => {
        if (!capturedBlob && !previewSamplePhoto) {
            onClose();
            return;
        }
        const file = capturedBlob
            ? new File([capturedBlob], `captured_evidence.jpg`, { type: 'image/jpeg' })
            : new File([], `preview_sample.jpg`, { type: 'image/jpeg' });
        onCapture(file, capturedAiData);
        onClose();
    };

    // Determine current active substate
    const isPermissionDenied = error === 'permission_denied' || (typeof error === 'string' && error.toLowerCase().includes('denied'));
    const isOtherCameraError = Boolean(error && !isPermissionDenied);
    const isInvalidState = Boolean(validationError);
    const isCheckingState = isVerifying;
    const isPreviewAcceptedState = isAccepted && capturedPreviewUrl && !validationError && !isVerifying;
    const isLiveState = !capturedPreviewUrl && !error && !isCheckingState;

    const displayTitle = isIssue ? 'Take a photo' : (title || 'Take a photo');
    const displaySubtitle = isIssue ? 'Photos are saved with your location and time.' : (subtitle || '');

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="camera-screen-title"
                    ref={modalRef}
                    className={`${standalone ? 'absolute inset-0 z-20 w-full h-full' : 'fixed inset-0 z-[200] w-full h-[100dvh]'} bg-[#070d1a] text-white flex flex-col justify-between overflow-hidden select-none`}
                    style={{
                        paddingTop: standalone ? '0px' : 'env(safe-area-inset-top, 0px)',
                        paddingBottom: standalone ? '0px' : 'env(safe-area-inset-bottom, 0px)'
                    }}
                >
                    {/* Live accessibility announcements */}
                    <div className="sr-only" role="status" aria-live="polite">
                        {announcement}
                    </div>

                    {/* ─────────────────────────────────────────────────────────── */}
                    {/* ZONE 1: TOP BAR                                            */}
                    {/* ─────────────────────────────────────────────────────────── */}
                    <CameraTopBar
                        title={displayTitle}
                        subtitle={displaySubtitle}
                        onClose={onClose}
                        titleId="camera-screen-title"
                    />

                    {/* ─────────────────────────────────────────────────────────── */}
                    {/* ZONE 2: CONTENT ZONE (fills remaining space)                */}
                    {/* ─────────────────────────────────────────────────────────── */}
                    <main className="flex-1 min-h-0 w-full flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-scrollbar relative">
                        {/* ── State A: Permission Denied ── */}
                        {isPermissionDenied && (
                            <CameraMessage
                                type="permission_denied"
                                onPrimaryAction={startStream}
                                primaryButtonText="Try again"
                                onSecondaryAction={onPickFromGallery}
                                secondaryButtonText={onPickFromGallery ? "Choose from gallery instead" : undefined}
                            />
                        )}

                        {/* ── State B: Camera Hardware / Startup Error ── */}
                        {isOtherCameraError && (
                            <CameraMessage
                                type="error"
                                reason={typeof error === 'string' && !error.startsWith('Camera error:') ? error : undefined}
                                onPrimaryAction={startStream}
                                primaryButtonText="Try again"
                            />
                        )}

                        {/* ── State C: Invalid Photo (Selfie / Non-Infrastructure) ── */}
                        {isInvalidState && (
                            <CameraMessage
                                type="invalid"
                                reason={validationError}
                                onPrimaryAction={handleRetake}
                                primaryButtonText="Retake photo"
                            />
                        )}

                        {/* ── State D: Checking State (Verifying with PULSO Pulse Line) ── */}
                        {isCheckingState && (
                            <div className={`relative w-full max-w-md ${getFrameRatioClass(photoRatio, isLandscape)} rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center shadow-lg transition-all duration-200 motion-reduce:transition-none`}>
                                {capturedPreviewUrl && (
                                    <img
                                        src={capturedPreviewUrl}
                                        alt=""
                                        className="w-full h-full object-cover opacity-35 filter brightness-75"
                                    />
                                )}
                                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[#ff6b00]/15 border border-[#ff6b00]/30 flex items-center justify-center text-[#ff6b00] shadow-inner">
                                        <Loader2 size={26} className="animate-spin text-[#ff6b00]" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-white">
                                            Checking your photo...
                                        </h3>
                                        <p className="text-xs text-slate-300 max-w-xs">
                                            PULSO Vision Eye is confirming infrastructure clarity
                                        </p>
                                    </div>
                                    <div className="w-48 pt-1">
                                        <PulsoPulseLine />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── State E: Accepted Preview State ── */}
                        {isPreviewAcceptedState && (
                            <div className="w-full max-w-md flex flex-col items-center space-y-4">
                                <div className={`relative w-full ${getFrameRatioClass(photoRatio, isLandscape)} rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md transition-all duration-200 motion-reduce:transition-none flex items-center justify-center`}>
                                    <img
                                        src={capturedPreviewUrl}
                                        alt="Captured problem photo"
                                        className="w-full h-full object-cover"
                                    />
                                    {/* For preview simulation, render WatermarkPainter overlay so reviewer sees the exact watermark on accepted preview */}
                                    {isIssue && previewMode === 'accepted' && (
                                        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end">
                                            <WatermarkPainter
                                                metadata={{
                                                    ...metadata,
                                                    timestamp: liveTime
                                                }}
                                            />
                                        </div>
                                    )}
                                    {/* Success check badge top-left */}
                                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold shadow-md z-30">
                                        <Check size={14} strokeWidth={3} />
                                        <span>Photo accepted ({photoRatio})</span>
                                    </div>
                                </div>

                                {/* Acceptance actions */}
                                <div className="w-full space-y-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleConfirmAcceptedPhoto}
                                        className="w-full h-[52px] min-h-[52px] rounded-xl bg-[#ff6b00] hover:bg-[#e05e00] text-[#070d1a] font-bold text-base flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white"
                                    >
                                        <Check size={18} strokeWidth={2.75} />
                                        <span>Use this photo</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleRetake}
                                        className="w-full h-[52px] min-h-[52px] rounded-xl border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-semibold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                                    >
                                        <RotateCcw size={16} strokeWidth={2.25} />
                                        <span>Retake</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── State F: Live Camera View ── */}
                        {isLiveState && (
                            <div className="w-full max-w-md flex flex-col items-center space-y-2.5">
                                {/* Reshaping Live Camera Frame with 200ms transition and corner marks */}
                                <div className={`relative w-full ${getFrameRatioClass(photoRatio, isLandscape)} rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center transition-all duration-200 motion-reduce:transition-none`}>
                                    {previewMode === 'live' && !streamRef.current ? (
                                        <img
                                            src={previewSamplePhoto || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1600&auto=format&fit=crop&q=80"}
                                            alt="Simulated camera live feed"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                        />
                                    )}

                                    {/* 4 Thin White Corner Marks (follow frame geometry) */}
                                    <div className="absolute inset-3 pointer-events-none z-10">
                                        {/* Top Left */}
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/90 rounded-tl-sm" />
                                        {/* Top Right */}
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/90 rounded-tr-sm" />
                                        {/* Bottom Left */}
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/90 rounded-bl-sm" />
                                        {/* Bottom Right */}
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/90 rounded-br-sm" />
                                    </div>

                                    {/* ID Card Silhouette (Only when capturing resident ID) */}
                                    {!isIssue && (
                                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                                            <div className="relative w-[86%] max-w-[340px] aspect-[85.6/54] rounded-2xl border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                                                {isBack ? <BackIdSilhouette /> : <FrontIdSilhouette />}
                                            </div>
                                            <div className="mt-3 z-10">
                                                <span className="text-white text-[11px] font-semibold tracking-wide drop-shadow-lg bg-black/65 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                                                    {guideText || (isBack ? `Back of your ${cleanIdTypeName}` : `Front of your ${cleanIdTypeName}`)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Live Evidence Watermark Overlay on Viewfinder (Drawn with shared drawEvidenceWatermark) */}
                                    {isIssue && (
                                        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end">
                                            <WatermarkPainter
                                                metadata={{
                                                    ...metadata,
                                                    timestamp: liveTime
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Loading spinner while stream initializes */}
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-[#070d1a] flex flex-col items-center justify-center space-y-3 z-30">
                                            <Loader2 size={32} className="animate-spin text-[#ff6b00]" />
                                            <p className="text-xs text-slate-400">Starting camera...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Frame Helper Text: 14px, soft gray-blue */}
                                <p className="text-sm text-slate-300 text-center font-medium">
                                    Show the problem clearly, in good light.
                                </p>

                                {/* Photo Size Choices (4:3, 16:9, 1:1) Segmented Control & Dynamic Note */}
                                {isIssue && (
                                    <RatioSelector
                                        value={photoRatio}
                                        onChange={(newRatio) => {
                                            setPhotoRatio(newRatio);
                                            onRatioChange?.(newRatio);
                                            const notes = {
                                                '4:3': 'Photo size 4:3. Most detail. Best for reports.',
                                                '16:9': 'Photo size 16:9. Wide view. Crops the top and bottom.',
                                                '1:1': 'Photo size 1:1. Square view. Crops the sides.'
                                            };
                                            setAnnouncement(notes[newRatio] || `Photo size ${newRatio}`);
                                        }}
                                        className="pt-1"
                                    />
                                )}
                            </div>
                        )}

                        <canvas ref={canvasRef} className="hidden" />
                    </main>

                    {/* ─────────────────────────────────────────────────────────── */}
                    {/* ZONE 3: BOTTOM BAR (slightly lighter navy panel)            */}
                    {/* ─────────────────────────────────────────────────────────── */}
                    <footer className="w-full bg-[#0c1427] border-t border-slate-800 px-[clamp(1rem,5vw,1.5rem)] py-4 sm:py-5 z-30 shrink-0">
                        <div className="max-w-md mx-auto grid grid-cols-3 items-center">
                            {/* Left: Camera Switcher (if multiple cameras exist) or Empty so shutter stays centered */}
                            <div className="flex items-center justify-start">
                                {hasMultipleCameras && isLiveState && (
                                    <button
                                        type="button"
                                        onClick={handleSwitchCamera}
                                        aria-label="Switch camera"
                                        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex flex-col items-center justify-center text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
                                    >
                                        <RotateCcw size={18} strokeWidth={2.25} />
                                    </button>
                                )}
                            </div>

                            {/* Center: 4.5rem (72px) Shutter Button */}
                            <div className="flex items-center justify-center">
                                <ShutterButton
                                    onClick={handleCapture}
                                    disabled={!isLiveState || isLoading}
                                    className={isInvalidState ? 'opacity-30 pointer-events-none' : ''}
                                    ariaLabel="Take photo"
                                />
                            </div>

                            {/* Right: Flash Toggle Button (48px tap area with label under it) */}
                            <div className="flex items-center justify-end">
                                {(isFlashSupported || previewMode) && (
                                    <button
                                        type="button"
                                        onClick={handleToggleFlash}
                                        aria-pressed={flashOn}
                                        aria-label={flashOn ? "Turn flash off" : "Turn flash on"}
                                        className="min-w-[48px] min-h-[48px] flex flex-col items-center justify-center text-center cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl px-2 py-1"
                                    >
                                        {flashOn ? (
                                            <Zap size={22} className="text-[#ff6b00]" strokeWidth={2.5} />
                                        ) : (
                                            <ZapOff size={22} className="text-slate-400 group-hover:text-slate-200" strokeWidth={2} />
                                        )}
                                        <span className={`text-[11px] font-bold mt-1 leading-none ${flashOn ? 'text-[#ff6b00]' : 'text-slate-400'}`}>
                                            {flashOn ? 'Flash on' : 'Flash off'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </footer>
                </div>
            )}
        </AnimatePresence>
    );
};

export default IDCameraModal;
