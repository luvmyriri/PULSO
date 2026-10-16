import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RotateCw,
    RotateCcw,
    ZoomIn,
    ZoomOut,
    Check,
    X,
    RefreshCw,
    Camera,
    Move
} from '../icons';

const VIEWPORT_SIZE = 320; // 320x320 px box
const CROP_RADIUS = 110;   // 220px diameter circular aperture
const CROP_SIDE = CROP_RADIUS * 2; // 220px
const OUTPUT_SIZE = 480;   // 480x480 high-res output canvas

/**
 * Validate an avatar image file before accepting it for editing.
 * Checks MIME type, file size, decode integrity, and minimum/maximum dimensions.
 */
export const validateAvatarFile = (file) => {
    return new Promise((resolve) => {
        if (!file) {
            resolve({ valid: false, error: 'No file selected.' });
            return;
        }

        // 1. MIME Type Validation
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const validExtensions = /\.(jpe?g|png|webp)$/i;

        const mimeValid = validMimeTypes.includes(file.type?.toLowerCase());
        const extValid = validExtensions.test(file.name || '');

        if (!mimeValid && !extValid) {
            resolve({
                valid: false,
                error: 'Invalid image format. Please upload a JPEG, PNG, or WebP photo.'
            });
            return;
        }

        // 2. File Size Validation (Max 5MB)
        const MAX_BYTES = 5 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            resolve({
                valid: false,
                error: `File is too large (${sizeMb}MB). Maximum allowed size is 5MB.`
            });
            return;
        }

        // 3. Decode & Dimension Validation via Image()
        let objectUrl = null;
        try {
            objectUrl = URL.createObjectURL(file);
        } catch {
            resolve({
                valid: false,
                error: 'Unable to read the selected file. Please try another image.'
            });
            return;
        }

        const img = new Image();
        img.onload = () => {
            const { naturalWidth, naturalHeight } = img;

            // Minimum resolution requirement
            if (naturalWidth < 100 || naturalHeight < 100) {
                URL.revokeObjectURL(objectUrl);
                resolve({
                    valid: false,
                    error: `Resolution too low (${naturalWidth}x${naturalHeight}px). Please select a photo at least 100x100 pixels.`
                });
                return;
            }

            // Extreme resolution safeguard
            if (naturalWidth > 8192 || naturalHeight > 8192) {
                URL.revokeObjectURL(objectUrl);
                resolve({
                    valid: false,
                    error: `Image resolution is too high (${naturalWidth}x${naturalHeight}px). Maximum supported is 8000x8000 pixels.`
                });
                return;
            }

            resolve({
                valid: true,
                imageSrc: objectUrl,
                naturalWidth,
                naturalHeight,
                revokeUrl: () => URL.revokeObjectURL(objectUrl)
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({
                valid: false,
                error: 'The image file could not be decoded or is corrupted.'
            });
        };

        img.src = objectUrl;
    });
};

/**
 * AvatarCropModal
 * Interactive Rotate, Scale, Pan, and Circular Crop Modal adhering to Civic Aperture principles.
 */
export default function AvatarCropModal({
    isOpen,
    imageSrc,
    naturalWidth = 800,
    naturalHeight = 800,
    onClose,
    onSave,
    t = (k, o) => o?.defaultValue || k
}) {
    // Spatial & adjustment states
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const dragStartRef = useRef({ x: 0, y: 0 });
    const currentOffsetRef = useRef({ x: 0, y: 0 });
    const viewportRef = useRef(null);
    const imageRef = useRef(null);

    // Initial base fit scale to ensure image covers the crop circle
    const initialFitScale = React.useMemo(() => {
        if (!naturalWidth || !naturalHeight) return 1.0;
        return Math.max(CROP_SIDE / naturalWidth, CROP_SIDE / naturalHeight);
    }, [naturalWidth, naturalHeight]);

    // Keep ref in sync for event handlers
    useEffect(() => {
        currentOffsetRef.current = offset;
    }, [offset]);

    // Reset adjustments when a new image is loaded
    useEffect(() => {
        if (isOpen) {
            setScale(1.0);
            setRotation(0);
            setOffset({ x: 0, y: 0 });
            setIsDragging(false);
            setIsSaving(false);
        }
    }, [isOpen, imageSrc]);

    // Keyboard support: ESC to cancel
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !isSaving) {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSaving, onClose]);

    // ── Drag & Pan Handlers (Pointer Events) ──────────────────────────────────
    const handlePointerDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            startX: currentOffsetRef.current.x,
            startY: currentOffsetRef.current.y
        };
        if (viewportRef.current) {
            viewportRef.current.setPointerCapture?.(e.pointerId);
        }
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.clientX;
        const dy = e.clientY - dragStartRef.current.clientY;
        setOffset({
            x: dragStartRef.current.startX + dx,
            y: dragStartRef.current.startY + dy
        });
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            setIsDragging(false);
            if (viewportRef.current && viewportRef.current.hasPointerCapture?.(e.pointerId)) {
                viewportRef.current.releasePointerCapture?.(e.pointerId);
            }
        }
    };

    // Wheel zoom inside viewport
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        setScale((prev) => Math.min(3.0, Math.max(0.6, Number((prev + delta).toFixed(3)))));
    };

    // ── Rotation Helpers ──────────────────────────────────────────────────────
    const handleRotateCw = () => {
        setRotation((r) => (r + 90) % 360);
    };

    const handleRotateCcw = () => {
        setRotation((r) => (r - 90 + 360) % 360);
    };

    const handleReset = () => {
        setScale(1.0);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
    };

    // ── Canvas Crop & Output Generation ──────────────────────────────────────
    const handleApplyCrop = async () => {
        if (!imageSrc || isSaving) return;
        setIsSaving(true);

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = imageSrc;

            await new Promise((res, rej) => {
                if (img.complete) {
                    res();
                } else {
                    img.onload = () => res();
                    img.onerror = rej;
                }
            });

            const canvas = document.createElement('canvas');
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Canvas 2D context unavailable');
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Clean background fill (white for crisp display across all card styles)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

            // Ratio of output canvas to onscreen crop box
            const ratio = OUTPUT_SIZE / CROP_SIDE;

            ctx.save();

            // 1. Translate to canvas center + scaled user drag offset
            ctx.translate(
                OUTPUT_SIZE / 2 + offset.x * ratio,
                OUTPUT_SIZE / 2 + offset.y * ratio
            );

            // 2. Rotate around the image center
            ctx.rotate((rotation * Math.PI) / 180);

            // 3. Scale by total scale factor
            const totalScale = scale * initialFitScale * ratio;
            ctx.scale(totalScale, totalScale);

            // 4. Draw image centered
            ctx.drawImage(
                img,
                -img.naturalWidth / 2,
                -img.naturalHeight / 2,
                img.naturalWidth,
                img.naturalHeight
            );

            ctx.restore();

            // Export as high quality JPEG data URL
            const resultDataUrl = canvas.toDataURL('image/jpeg', 0.92);

            if (onSave) {
                await onSave(resultDataUrl);
            }
            onClose?.();
        } catch (err) {
            console.error('Error cropping avatar image:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="avatar-crop-title"
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 12 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                    className="w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
                >
                    {/* ── Modal Header ────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                <Camera size={17} />
                            </div>
                            <div>
                                <h3 id="avatar-crop-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                    {t('dashboard.profile.cropTitle', { defaultValue: 'Adjust Profile Photo' })}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    {t('dashboard.profile.cropSubtitle', { defaultValue: 'Drag to center, scale, or rotate within the aperture.' })}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                            aria-label="Close adjust modal"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Interactive Crop Viewport ────────────────────────────── */}
                    <div className="p-4 sm:p-6 flex flex-col items-center bg-slate-50/50 dark:bg-slate-950/40">
                        <div
                            ref={viewportRef}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onWheel={handleWheel}
                            className={`w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-2xl relative overflow-hidden select-none touch-none bg-slate-950 border border-slate-800/80 shadow-inner ${
                                isDragging ? 'cursor-grabbing' : 'cursor-grab'
                            }`}
                            title="Drag to reposition photo; scroll to zoom"
                        >
                            {/* Transformed Image Layer */}
                            {imageSrc && (
                                <img
                                    ref={imageRef}
                                    src={imageSrc}
                                    alt="Profile preview"
                                    draggable={false}
                                    style={{
                                        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale * initialFitScale})`,
                                        transformOrigin: 'center center',
                                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                    }}
                                    className="pointer-events-none select-none max-w-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
                                />
                            )}

                            {/* Civic Aperture Circular Overlay Mask */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
                            >
                                <defs>
                                    <mask id="pulso-avatar-mask">
                                        <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                                        <circle cx={VIEWPORT_SIZE / 2} cy={VIEWPORT_SIZE / 2} r={CROP_RADIUS} fill="black" />
                                    </mask>
                                </defs>

                                {/* Darkened region outside circular crop */}
                                <rect
                                    width={VIEWPORT_SIZE}
                                    height={VIEWPORT_SIZE}
                                    fill="rgba(15, 23, 42, 0.72)"
                                    mask="url(#pulso-avatar-mask)"
                                />

                                {/* Aperture Frame Ring */}
                                <circle
                                    cx={VIEWPORT_SIZE / 2}
                                    cy={VIEWPORT_SIZE / 2}
                                    r={CROP_RADIUS}
                                    fill="none"
                                    stroke="#ff6b00"
                                    strokeWidth="2.5"
                                />

                                {/* Aperture Crosshair Alignment Ticks (N, S, W, E) */}
                                <line
                                    x1={VIEWPORT_SIZE / 2}
                                    y1={VIEWPORT_SIZE / 2 - CROP_RADIUS - 8}
                                    x2={VIEWPORT_SIZE / 2}
                                    y2={VIEWPORT_SIZE / 2 - CROP_RADIUS + 4}
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1={VIEWPORT_SIZE / 2}
                                    y1={VIEWPORT_SIZE / 2 + CROP_RADIUS - 4}
                                    x2={VIEWPORT_SIZE / 2}
                                    y2={VIEWPORT_SIZE / 2 + CROP_RADIUS + 8}
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1={VIEWPORT_SIZE / 2 - CROP_RADIUS - 8}
                                    y1={VIEWPORT_SIZE / 2}
                                    x2={VIEWPORT_SIZE / 2 - CROP_RADIUS + 4}
                                    y2={VIEWPORT_SIZE / 2}
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <line
                                    x1={VIEWPORT_SIZE / 2 + CROP_RADIUS - 4}
                                    y1={VIEWPORT_SIZE / 2}
                                    x2={VIEWPORT_SIZE / 2 + CROP_RADIUS + 8}
                                    y2={VIEWPORT_SIZE / 2}
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>

                            {/* Reposition Hint Badge */}
                            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[10px] font-semibold text-slate-300 flex items-center gap-1.5 pointer-events-none border border-white/10 shadow-sm">
                                <Move size={11} className="text-orange-400" />
                                <span>Drag to reposition</span>
                            </div>
                        </div>

                        {/* ── Adjustment Controls ─────────────────────────────── */}
                        <div className="w-full mt-5 space-y-4 max-w-[340px]">
                            {/* Zoom Slider & Steppers */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
                                    <span className="flex items-center gap-1.5">
                                        <ZoomIn size={13} className="text-orange-500" />
                                        <span>Zoom & Scale</span>
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        {Math.round(scale * 100)}%
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))}
                                        className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                        title="Zoom out"
                                        aria-label="Zoom out"
                                    >
                                        <ZoomOut size={14} />
                                    </button>

                                    <input
                                        type="range"
                                        min="0.6"
                                        max="3.0"
                                        step="0.05"
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        className="w-full accent-orange-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                                        aria-label="Zoom scale slider"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))))}
                                        className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                        title="Zoom in"
                                        aria-label="Zoom in"
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Rotation Buttons & Reset */}
                            <div className="flex items-center justify-between pt-1 gap-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleRotateCcw}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                        title="Rotate 90 degrees counter-clockwise"
                                    >
                                        <RotateCcw size={13} />
                                        <span>-90°</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleRotateCw}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                        title="Rotate 90 degrees clockwise"
                                    >
                                        <RotateCw size={13} />
                                        <span>+90°</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-xs font-semibold transition-colors cursor-pointer"
                                    title="Reset zoom, rotation, and position"
                                >
                                    <RefreshCw size={12} />
                                    <span>Reset</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Modal Footer ────────────────────────────────────────── */}
                    <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {t('dashboard.common.cancel', { defaultValue: 'Cancel' })}
                        </button>

                        <button
                            type="button"
                            onClick={handleApplyCrop}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white text-xs font-extrabold shadow-md hover:shadow-orange-500/25 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={15} strokeWidth={2.5} />
                                    <span>{t('dashboard.profile.savePhoto', { defaultValue: 'Apply & Save' })}</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
