import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, AlertCircle, CameraOff, MapPin } from 'lucide-react';

const IDCameraModal = ({ isOpen, onClose, onCapture, side = 'front', title, subtitle, metadata, guideText }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState(null);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [isLoading, setIsLoading] = useState(true);

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
        
        // Reset transform to draw watermark correctly
        if (facingMode === 'user') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Draw Professional GPS Watermark/Stamp
        if (metadata) {
            const padding = canvas.width * 0.02;
            const logoSize = canvas.width * 0.04;
            const fontSizeMain = Math.max(14, canvas.width * 0.018);
            const fontSizeSmall = Math.max(10, canvas.width * 0.012);
            const timestamp = new Date().toLocaleString();

            // 1. Semi-transparent backdrop for the entire watermark zone
            const boxWidth = canvas.width * 0.45;
            const boxHeight = canvas.height * 0.18;
            // 1. No card backdrop - drawing directly on canvas
            // We still use boxX, boxY for layout alignment
            const boxX = padding;
            const boxY = canvas.height - boxHeight - padding;

            // Added a slight shadow to the text for legibility without a box
            context.shadowColor = 'rgba(0, 0, 0, 0.8)';
            context.shadowBlur = 4;
            context.shadowOffsetX = 2;
            context.shadowOffsetY = 2;

            // 2. Draw "PULSO GPS VERIFIED" header with green dot
            context.fillStyle = '#22c55e'; // Green
            context.beginPath();
            context.arc(boxX + 20, boxY + 25, 4, 0, Math.PI * 2);
            context.fill();

            context.font = `black ${fontSizeSmall}px system-ui, -apple-system, sans-serif`;
            context.fillStyle = 'white';
            context.fillText(`PULSO GPS VERIFIED • ${timestamp}`, boxX + 35, boxY + 28);

            // 3. Draw Coordinates
            context.font = `bold ${fontSizeMain}px monospace`;
            context.fillStyle = '#f97316'; // Orange
            context.fillText('LAT', boxX + 20, boxY + 60);
            context.fillStyle = 'white';
            context.fillText(metadata.lat?.toFixed(6) || '0.000000', boxX + 80, boxY + 60);

            context.fillStyle = '#f97316';
            context.fillText('LNG', boxX + 20, boxY + 90);
            context.fillStyle = 'white';
            context.fillText(metadata.lng?.toFixed(6) || '0.000000', boxX + 80, boxY + 90);

            // 4. Draw Address (Truncated for clean look)
            if (metadata.address) {
                context.font = `bold ${fontSizeSmall}px system-ui, -apple-system, sans-serif`;
                context.fillStyle = 'rgba(255, 255, 255, 0.8)';
                const addressLines = [
                    metadata.address.slice(0, 45),
                    metadata.address.length > 45 ? metadata.address.slice(45, 90) : ''
                ];
                addressLines.forEach((line, i) => {
                    context.fillText(line, boxX + 20, boxY + 120 + (i * 18));
                });
            }
            
            // Reset shadows for any potential subsequent drawing
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
        }

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `captured_report_metadata.jpg`, { type: 'image/jpeg' });
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
                                        {side === 'ISSUE' ? (
                                            "Capture a clear photo of the infrastructure issue for AI verification"
                                        ) : (
                                            <>
                                                Capture the{' '}
                                                <span className="text-orange-500 font-bold uppercase">{side}</span>
                                                {' '}of your ID
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
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                                    />

                                    {/* Camera UI Overlays */}
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                                        {/* Top spacer or potential top-aligned UI */}
                                        <div />

                                        {/* Middle-Bottom Guide text (Floating Pill) */}
                                        <div className="mb-32">
                                            <span className="text-white text-[11px] sm:text-xs font-bold tracking-wide drop-shadow-lg bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                                {guideText || "Center the issue in your view"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Geospatial Metadata Overlay */}
                                    {metadata && (
                                        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-col items-start gap-1">
                                            <div className="flex flex-col gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border border-white/20 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.25em]">PULSO GPS LENS</span>
                                                </div>
                                                <div className="flex flex-col gap-1 pl-4.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-orange-500 w-8 uppercase">LAT</span>
                                                        <span className="text-[13px] font-mono font-bold text-white tracking-tight">{metadata.lat?.toFixed(6)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-orange-500 w-8 uppercase">LNG</span>
                                                        <span className="text-[13px] font-mono font-bold text-white tracking-tight">{metadata.lng?.toFixed(6)}</span>
                                                    </div>
                                                    {metadata.address && (
                                                        <div className="flex items-start gap-2 mt-2 border-t border-white/20 pt-2 max-w-[280px] sm:max-w-[350px]">
                                                            <MapPin size={11} className="text-orange-500 mt-0.5 shrink-0" />
                                                            <span className="text-[11px] font-bold text-white/90 leading-tight tracking-wide">{metadata.address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
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
                                {hasMultipleCameras && !error && (
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

                            {/* Capture Button */}
                            <button
                                onClick={handleCapture}
                                disabled={!streamRef.current || isLoading || !!error}
                                className="w-14 h-14 sm:w-18 sm:h-18 rounded-full 
                                    bg-white dark:bg-slate-700
                                    flex items-center justify-center 
                                    border-[4px] sm:border-[6px] border-gray-300 dark:border-slate-600
                                    hover:scale-105 active:scale-95 transition-all shadow-2xl 
                                    disabled:opacity-50 disabled:cursor-not-allowed group"
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
                                    {streamRef.current && !isLoading && (
                                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                                    )}
                                </div>
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter">
                                    {streamRef.current && !isLoading ? 'Live' : 'Off'}
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
