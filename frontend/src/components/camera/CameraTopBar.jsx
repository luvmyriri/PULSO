import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import RatioSelector from './RatioSelector';

/**
 * CameraTopBar
 * ─────────────────────────────────────────────────────────────────────────────
 * Smartphone camera top bar:
 * - Top Left: Back (<) icon button to close the camera.
 * - Top Right: 3-bar menu icon (changes to X icon when active) that toggles a full-width top dropdown for camera sizing.
 */
export default function CameraTopBar({
    title = 'Take a photo',
    onClose,
    titleId = 'camera-screen-title',
    className = '',
    isDark = true,
    translucent = false,
    showRatioControl = false,
    photoRatio = '4:3',
    onRatioChange
}) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const popupWrapperRef = useRef(null);

    // Close pop-up if ratio control is hidden (e.g. when leaving live state)
    useEffect(() => {
        if (!showRatioControl) {
            setIsPopupOpen(false);
        }
    }, [showRatioControl]);

    // Close pop-up when clicking outside
    useEffect(() => {
        if (!isPopupOpen) return;
        const handlePointerDown = (e) => {
            if (popupWrapperRef.current && !popupWrapperRef.current.contains(e.target)) {
                setIsPopupOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isPopupOpen]);

    return (
        <header
            ref={popupWrapperRef}
            className={`relative w-full flex flex-col z-30 shrink-0 bg-transparent ${className}`}
        >
            {/* Screen-reader title */}
            <h1 id={titleId} className="sr-only">
                {title}
            </h1>

            {/* Top Icons Row */}
            <div className="w-full flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-2.5">
                {/* Top Left: Back (<) Button */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close camera"
                    className={`w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center transition-all cursor-pointer shrink-0 bg-transparent border-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg ${
                        isDark || translucent
                            ? 'text-white hover:text-white/80'
                            : 'text-[#ff6b00] hover:text-[#e05e00]'
                    }`}
                >
                    <ChevronLeft size={26} strokeWidth={2.75} className="drop-shadow-sm" />
                </button>

                {/* Top Right: 3-Line Menu Icon */}
                <div className="flex items-center justify-end">
                    {showRatioControl ? (
                        <button
                            type="button"
                            onClick={() => setIsPopupOpen((prev) => !prev)}
                            aria-expanded={isPopupOpen}
                            aria-label={isPopupOpen ? 'Close camera sizing' : `Camera size (${photoRatio}). Tap to open camera sizing`}
                            className={`w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center transition-all cursor-pointer bg-transparent border-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg ${
                                isDark || translucent
                                    ? 'text-white hover:text-white/80'
                                    : 'text-[#ff6b00] hover:text-[#e05e00]'
                            }`}
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="drop-shadow-sm"
                                aria-hidden="true"
                            >
                                <line x1="4" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-10 h-10 shrink-0" aria-hidden="true" />
                    )}
                </div>
            </div>

            {/* Single Unbroken Full-Width Top Dropdown Panel (starts at top-0 with no seam or border line) */}
            <AnimatePresence>
                {showRatioControl && isPopupOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute inset-x-0 top-0 w-full px-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-4 z-50 space-y-2 ${
                            isDark
                                ? 'bg-black text-white'
                                : 'bg-white text-slate-900'
                        }`}
                    >
                        {/* Top Row inside active dropdown: Back (<) on left, Close (X) on right */}
                        <div className="w-full flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close camera"
                                className={`w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center transition-all cursor-pointer shrink-0 bg-transparent border-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg ${
                                    isDark
                                        ? 'text-white hover:text-white/80'
                                        : 'text-[#ff6b00] hover:text-[#e05e00]'
                                }`}
                            >
                                <ChevronLeft size={26} strokeWidth={2.75} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsPopupOpen(false)}
                                aria-label="Close camera sizing"
                                className={`w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center transition-all cursor-pointer shrink-0 bg-transparent border-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg ${
                                    isDark
                                        ? 'text-white hover:text-white/80'
                                        : 'text-[#ff6b00] hover:text-[#e05e00]'
                                }`}
                            >
                                <X size={24} strokeWidth={2.75} />
                            </button>
                        </div>

                        <p className={`text-xs text-center font-medium ${
                            isDark ? 'text-white' : 'text-slate-800'
                        }`}>
                            Show the problem clearly, in good light.
                        </p>

                        <RatioSelector
                            value={photoRatio}
                            onChange={(newRatio) => {
                                onRatioChange?.(newRatio);
                            }}
                            isDark={isDark}
                            className="max-w-full"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
