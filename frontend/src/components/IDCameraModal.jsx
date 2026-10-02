import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, AlertCircle, CameraOff, Loader2, AlertTriangle } from 'lucide-react';
import { burnEvidenceWatermark, formatWatermarkTimestamp } from '../utils/watermark';
import { formatWatermarkAddress } from '../utils/philippineAddress';
import { API_BASE_URL } from '../utils/apiBase';

// ---------------------------------------------------------------------------
// Faint Guide Silhouettes for ID Viewfinder (Visual Echo of Document Layout)
// ---------------------------------------------------------------------------
function FrontIdSilhouette() {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 sm:w-48 h-auto opacity-35 select-none pointer-events-none">
            {/* Hologram / Emblem dot */}
            <circle cx="106" cy="14" r="4" className="stroke-white/40" strokeWidth="1" />
            
            {/* Smart Chip */}
            <rect x="10" y="10" width="14" height="11" rx="1.5" className="fill-white/20 stroke-white/40" strokeWidth="0.8" />

            {/* Photo Avatar Box */}
            <rect x="10" y="27" width="28" height="36" rx="3" className="fill-white/10 stroke-white/40" strokeWidth="1" />
            <circle cx="24" cy="38" r="5" className="fill-white/45" />
            <path d="M15 57 C15 50 18 48 24 48 C30 48 33 50 33 57" className="fill-white/45" />

            {/* Header lines */}
            <rect x="44" y="12" width="44" height="3" rx="1.5" className="fill-white/50" />
            <rect x="44" y="18" width="26" height="2" rx="1" className="fill-white/30" />

            {/* Information Rows (Name, Details) */}
            <rect x="44" y="28" width="60" height="2.5" rx="1.25" className="fill-white/30" />
            <rect x="44" y="35" width="50" height="2.5" rx="1.25" className="fill-white/30" />
            <rect x="44" y="42" width="40" height="2.5" rx="1.25" className="fill-white/30" />

            {/* ID Number Ribbon */}
            <rect x="44" y="52" width="60" height="6" rx="1.5" className="fill-orange-500/20 stroke-orange-400/40" strokeWidth="0.8" />
        </svg>
    );
}

function BackIdSilhouette() {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 sm:w-48 h-auto opacity-35 select-none pointer-events-none">
            {/* Magnetic Stripe */}
            <rect x="4" y="10" width="112" height="13" rx="1" className="fill-white/25" />

            {/* Signature Panel */}
            <rect x="10" y="30" width="62" height="12" rx="1.5" className="fill-white/15 stroke-white/30" strokeWidth="0.8" />
            <path d="M14 38 Q 24 33 34 39 T 52 36 T 66 38" className="stroke-white/40" strokeWidth="1.2" fill="none" strokeLinecap="round" />

            {/* Auth code box */}
            <rect x="78" y="32" width="30" height="8" rx="1.2" className="fill-white/15" />

            {/* Barcode Stripes */}
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

const IDCameraModal = ({ 
    isOpen, 
    onClose, 
    onCapture, 
    side = 'front', 
    title, 
    subtitle, 
    metadata, 
    guideText,
    idTypeName = 'ID'
}) => {
    const isIssue = side === 'ISSUE';
    const isBack = typeof side === 'string' && (side.toLowerCase().includes('back') || side.toLowerCase() === 'secondback');
    const sideWord = isBack ? 'BACK' : 'FRONT';
    const cleanIdTypeName = idTypeName || 'ID';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [isLoading, setIsLoading] = useState(true);
    const [liveTime, setLiveTime] = useState(() => new Date());
    const [isVerifying, setIsVerifying] = useState(false);
    const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);
    const [validationError, setValidationError] = useState(null);

    // Reset captured preview when modal opens or closes
    useEffect(() => {
        if (!isOpen) {
            if (capturedPreviewUrl) {
                URL.revokeObjectURL(capturedPreviewUrl);
            }
            setCapturedPreviewUrl(null);
            setValidationError(null);
            setIsVerifying(false);
        }
    }, [isOpen]);

    const handleRetake = () => {
        if (capturedPreviewUrl) {
            URL.revokeObjectURL(capturedPreviewUrl);
        }
        setCapturedPreviewUrl(null);
        setValidationError(null);
        setIsVerifying(false);
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
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startStream = useCallback(async () => {
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

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
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
                setError('Camera access denied. Please enable camera permissions in your browser settings.');
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
    }, [facingMode, stopStream]);

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

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Final Mirror compensation for captured image
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset transform so watermark text is never mirrored
        if (facingMode === 'user') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Burn evidence watermark for issue reports
        if (side === 'ISSUE') {
            burnEvidenceWatermark(canvas, {
                ...metadata,
                timestamp: liveTime
            });
        }

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `captured_evidence.jpg`, { type: 'image/jpeg' });

            // If not issue photo (e.g. ID card), proceed directly
            if (side !== 'ISSUE') {
                onCapture(file);
                onClose();
                return;
            }

            // For infrastructure issue evidence: Validate with AI before proceeding
            const previewUrl = URL.createObjectURL(blob);
            setCapturedPreviewUrl(previewUrl);
            setIsVerifying(true);
            setValidationError(null);

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
                        // REJECT! Block proceeding
                        const reason = data.rejection_reason || "We couldn't clearly see a city infrastructure issue in this photo. Please point your camera at the actual road damage, broken streetlight, or drainage hazard.";
                        setValidationError(reason);
                        setIsVerifying(false);
                        return;
                    }

                    // Valid infrastructure photo: proceed
                    setIsVerifying(false);
                    onCapture(file, data);
                    onClose();
                } else {
                    // Fallback on server response error
                    setIsVerifying(false);
                    onCapture(file);
                    onClose();
                }
            } catch (err) {
                console.warn('AI infrastructure verification network error:', err);
                setIsVerifying(false);
                onCapture(file);
                onClose();
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 sm:p-6"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl 
                            bg-white dark:bg-slate-900 
                            border border-gray-200 dark:border-slate-800 
                            rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full 
                            max-h-[95vh] sm:max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-5 
                            border-b border-gray-200 dark:border-slate-800
                            bg-white dark:bg-slate-900">
                            <div>
                                {title ? (
                                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white uppercase truncate max-w-[200px] sm:max-w-none">
                                        {title}
                                    </h3>
                                ) : (
                                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                                        ID Camera Capture
                                    </h3>
                                )}
                                {subtitle ? (
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                                        {subtitle}
                                    </p>
                                ) : (
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                                        {isIssue ? (
                                            "Capture a clear photo of the infrastructure issue for AI verification"
                                        ) : (
                                            <>
                                                Capture the{' '}
                                                <span className="text-orange-500 font-bold uppercase">{sideWord}</span>
                                                {' '}of your {cleanIdTypeName}
                                            </>
                                        )}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 sm:p-2.5 rounded-full 
                                    bg-gray-100 dark:bg-slate-800 
                                    text-gray-500 dark:text-slate-400 
                                    hover:bg-gray-200 dark:hover:bg-slate-700 
                                    hover:text-gray-900 dark:hover:text-white 
                                    transition-all"
                            >
                                <X size={18} className="sm:hidden" />
                                <X size={20} className="hidden sm:block" />
                            </button>
                        </div>

                        {/* Camera Preview */}
                        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                            {error ? (
                                <div className="text-center p-8 
                                    bg-white dark:bg-slate-900 
                                    w-full h-full flex flex-col items-center justify-center">
                                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                                    <p className="font-medium mb-4
                                        text-gray-800 dark:text-white">
                                        {error}
                                    </p>
                                    <button
                                        onClick={startStream}
                                        className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all"
                                    >
                                        Retry Camera Access
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {capturedPreviewUrl ? (
                                        <img
                                            src={capturedPreviewUrl}
                                            alt="Captured Evidence Preview"
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

                                    {/* Camera UI Overlays */}
                                    {!capturedPreviewUrl && (
                                        isIssue ? (
                                            /* Issue / Hazard Camera UI Overlay */
                                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                                                <div />
                                                <div className="mb-28 sm:mb-32">
                                                    <span className="text-white text-[11px] sm:text-xs font-bold tracking-wide drop-shadow-lg bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                                        {guideText || "Center the issue in your view"}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ID Card Alignment Guide Overlay */
                                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                                                {/* Card-Shaped Alignment Frame (ISO/IEC 7810 ID-1 aspect ratio: 85.6 / 54) */}
                                                <div className="relative w-[86%] max-w-[380px] sm:max-w-[420px] aspect-[85.6/54] rounded-2xl border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                                                    {/* 4 Corner Orange Brackets */}
                                                    <div className="absolute -top-[3px] -left-[3px] w-6 h-6 border-t-[3px] border-l-[3px] border-orange-500 rounded-tl-xl" />
                                                    <div className="absolute -top-[3px] -right-[3px] w-6 h-6 border-t-[3px] border-r-[3px] border-orange-500 rounded-tr-xl" />
                                                    <div className="absolute -bottom-[3px] -left-[3px] w-6 h-6 border-b-[3px] border-l-[3px] border-orange-500 rounded-bl-xl" />
                                                    <div className="absolute -bottom-[3px] -right-[3px] w-6 h-6 border-b-[3px] border-r-[3px] border-orange-500 rounded-br-xl" />

                                                    {/* Visual Echo Silhouette */}
                                                    {isBack ? <BackIdSilhouette /> : <FrontIdSilhouette />}
                                                </div>

                                                {/* Floating Pill with ID-Specific Guidance */}
                                                <div className="mt-4 sm:mt-5 z-10">
                                                    <span className="text-white text-[11px] sm:text-xs font-semibold tracking-wide drop-shadow-lg bg-black/65 px-4 py-1.5 sm:py-2 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-1.5 text-center shadow-lg">
                                                        {guideText || (isBack 
                                                            ? `Position the back of your ${cleanIdTypeName} within the frame`
                                                            : `Position the front of your ${cleanIdTypeName} within the frame`)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* Live Evidence Watermark Overlay on Viewfinder */}
                                    {isIssue && !capturedPreviewUrl && (
                                        <div className="absolute inset-x-0 bottom-0 pointer-events-none z-20">
                                            {/* Protective Scrim Gradient */}
                                            <div className="bg-gradient-to-t from-[#05080f]/95 via-[#060a12]/85 to-transparent pt-8 pb-3 px-3 sm:px-5">
                                                {/* Civic Signal Cut: Orange beacon bar */}
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="w-12 sm:w-16 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_#ff6b00]" />
                                                    <div className="flex-1 h-px bg-white/20" />
                                                </div>

                                                {/* Line 1: PULSO · Caloocan City   Timestamp */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs sm:text-sm font-bold tracking-tight">
                                                        <span className="text-[#ff7a1a]">PULSO</span>
                                                        <span className="text-white"> · Caloocan City</span>
                                                    </span>
                                                    <span 
                                                        style={{ color: '#ffffff' }}
                                                        className="text-[10px] sm:text-xs font-semibold text-white font-mono tracking-tight drop-shadow-md"
                                                    >
                                                        {formatWatermarkTimestamp(liveTime)}
                                                    </span>
                                                </div>

                                                {/* Line 2: Full Address with Plus Code */}
                                                <div 
                                                    style={{ color: '#ffffff' }}
                                                    className="text-[11px] sm:text-xs text-white font-medium leading-snug mt-0.5 line-clamp-2 drop-shadow-md"
                                                >
                                                    {watermarkAddress}
                                                </div>

                                                {/* Line 3: Coordinates */}
                                                {coordsText && (
                                                    <div 
                                                        style={{ color: 'rgba(255, 255, 255, 0.85)' }}
                                                        className="text-[9px] sm:text-[10px] font-mono text-white/85 mt-0.5 drop-shadow-md"
                                                    >
                                                        {coordsText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Verifying Overlay */}
                                    {isVerifying && (
                                        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-30">
                                            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 mb-3 animate-pulse shadow-lg">
                                                <Loader2 size={30} className="animate-spin text-orange-500" />
                                            </div>
                                            <h4 className="text-base sm:text-lg font-bold text-white mb-1.5">
                                                Verifying Infrastructure Photo...
                                            </h4>
                                            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                                                PULSO AI is confirming that this photo shows an actual city hazard (road, lighting, drainage, or public safety issue).
                                            </p>
                                        </div>
                                    )}

                                    {/* Invalid Photo: Non-Infrastructure Warning Modal Overlay */}
                                    {validationError && (
                                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-white/20 via-rose-500/20 to-white/5 backdrop-blur-xl border border-white/30 border-t-white/60 flex items-center justify-center text-rose-300 mb-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_12px_28px_rgba(244,63,94,0.3)] animate-bounce">
                                                <AlertTriangle size={30} className="drop-shadow-[0_2px_8px_rgba(244,63,94,0.5)]" />
                                            </div>
                                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-b from-white/25 via-rose-500/20 to-white/5 backdrop-blur-xl border border-white/35 border-t-white/70 border-b-white/15 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider mb-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_24px_rgba(244,63,94,0.35)] drop-shadow-sm select-none">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e] animate-pulse shrink-0" />
                                                <span>Invalid Photo • Not Infrastructure</span>
                                            </span>
                                            <h4 className="text-base sm:text-lg font-bold text-white mb-2 max-w-sm drop-shadow-sm">
                                                Cannot Proceed With This Photo
                                            </h4>
                                            <p className="text-xs sm:text-[13px] text-rose-100/95 leading-relaxed max-w-sm mb-5 p-4 rounded-2xl bg-gradient-to-b from-white/10 via-rose-950/20 to-white/[0.03] backdrop-blur-xl border border-white/20 border-t-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_12px_40px_rgba(0,0,0,0.5)]">
                                                {validationError}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleRetake}
                                                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                                            >
                                                <RefreshCw size={16} />
                                                <span>Retake Photo</span>
                                            </button>
                                        </div>
                                    )}

                                    {isLoading && (
                                        <div className="absolute inset-0 
                                            bg-white dark:bg-slate-900 
                                            flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 
                                                border-gray-200 dark:border-slate-700 
                                                border-t-orange-500 rounded-full animate-spin mb-4" />
                                            <p className="text-sm font-medium
                                                text-gray-500 dark:text-slate-400">
                                                Initializing camera...
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {/* Controls */}
                        <div className="p-4 sm:p-6 
                            bg-white dark:bg-slate-900 
                            border-t border-gray-200 dark:border-slate-800 
                            flex items-center justify-between gap-4 sm:gap-6">

                            {/* Switch Camera */}
                            <div className="w-10 sm:w-12">
                                {hasMultipleCameras && !error && !capturedPreviewUrl && (
                                    <button
                                        onClick={handleSwitchCamera}
                                        className="p-2 sm:p-3.5 rounded-full 
                                            bg-gray-100 dark:bg-slate-800 
                                            text-gray-700 dark:text-white 
                                            hover:bg-gray-200 dark:hover:bg-slate-700 
                                            transition-all group"
                                        title="Switch Camera"
                                    >
                                        <RefreshCw size={18} className="sm:hidden group-active:rotate-180 transition-transform duration-500" />
                                        <RefreshCw size={22} className="hidden sm:block group-active:rotate-180 transition-transform duration-500" />
                                    </button>
                                )}
                            </div>

                            {/* Center Action: Shutter Capture Button */}
                            <button
                                onClick={handleCapture}
                                disabled={!streamRef.current || isLoading || !!error || isVerifying || !!capturedPreviewUrl}
                                className="w-14 h-14 sm:w-18 sm:h-18 rounded-full 
                                    bg-white dark:bg-slate-700
                                    flex items-center justify-center 
                                    border-[4px] sm:border-[6px] border-gray-300 dark:border-slate-600
                                    hover:scale-105 active:scale-95 transition-all shadow-2xl 
                                    disabled:opacity-40 disabled:cursor-not-allowed group"
                                title={capturedPreviewUrl ? 'Retake photo above to continue' : 'Capture photo'}
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500 group-hover:bg-orange-600 transition-colors" />
                            </button>

                            {/* Live Indicator */}
                            <div className="w-10 sm:w-12 flex flex-col items-center 
                                text-gray-400 dark:text-slate-500">
                                <div className="relative">
                                    <CameraOff size={18} className="sm:hidden mb-0.5" />
                                    <CameraOff size={20} className="hidden sm:block mb-0.5" />
                                    {/* Live dot */}
                                    {streamRef.current && !isLoading && !capturedPreviewUrl && (
                                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter">
                                    {streamRef.current && !isLoading && !capturedPreviewUrl ? 'Live' : 'Off'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IDCameraModal;
