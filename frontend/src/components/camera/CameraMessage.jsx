import React from 'react';
import { AlertTriangle, CameraOff, RefreshCw } from 'lucide-react';

/**
 * CameraMessage
 * ─────────────────────────────────────────────────────────────────────────────
 * Centered stack with 1.5rem (space-y-6) between items, top to bottom:
 * 1. Large round warning icon (5rem circle with soft red tint & 1px red border, 32px icon).
 *    (or camera-off for permission/error).
 * 2. Small pill label "NOT AN INFRASTRUCTURE PHOTO" (11-12px bold, red tint, red text & border, uppercase).
 * 3. Heading "Cannot proceed with this photo" (20-22px bold, white, centered, max-w-[270px]).
 * 4. Short explanation (16px, soft gray-blue text-slate-300, max 3 lines):
 *    "This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead."
 * 5. Full-width solid orange "Retake photo" / "Try again" button (52px tall, 16px semibold, dark navy text).
 * Optional gallery link under button if provided.
 */
export default function CameraMessage({
    type = 'invalid', // 'invalid' | 'permission_denied' | 'error'
    reason,
    onPrimaryAction,
    primaryButtonText = 'Retake photo',
    onSecondaryAction,
    secondaryButtonText,
    className = '',
    isDark = true
}) {
    const isPermission = type === 'permission_denied';
    const isError = type === 'error';

    // Content defaults
    let icon = <AlertTriangle size={32} className={isDark ? "text-rose-400 shrink-0" : "text-rose-600 shrink-0"} strokeWidth={2.25} />;
    let pillText = 'NOT AN INFRASTRUCTURE PHOTO';
    let headingText = 'Cannot proceed with this photo';
    let defaultExplanation = 'This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead.';
    let buttonLabel = primaryButtonText || 'Retake photo';

    if (isPermission) {
        icon = <CameraOff size={32} className={isDark ? "text-rose-400 shrink-0" : "text-rose-600 shrink-0"} strokeWidth={2.25} />;
        pillText = 'PERMISSION REQUIRED';
        headingText = 'Camera is turned off';
        defaultExplanation = 'Turn on the camera in your phone settings, then try again.';
        buttonLabel = primaryButtonText || 'Try again';
    } else if (isError) {
        icon = <CameraOff size={32} className={isDark ? "text-rose-400 shrink-0" : "text-rose-600 shrink-0"} strokeWidth={2.25} />;
        pillText = 'CAMERA UNAVAILABLE';
        headingText = "We can't open the camera right now.";
        defaultExplanation = 'Please ensure your camera is not in use by another app and try again.';
        buttonLabel = primaryButtonText || 'Try again';
    }

    // Normalize personal photo or selfie explanations to the exact required copy
    let explanationText = reason || defaultExplanation;
    if (explanationText.toLowerCase().includes('selfie') || explanationText.toLowerCase().includes('personal photo')) {
        explanationText = 'This looks like a personal photo or selfie. Please take a clear photo of the public infrastructure issue instead.';
    }

    return (
        <div
            className={`w-full max-w-md mx-auto my-auto flex flex-col items-center text-center px-[clamp(1rem,5vw,1.5rem)] py-6 space-y-6 select-none ${className}`}
        >
            {/* 1. Large 5rem (80px) round warning/camera icon with soft red tint & 1px border */}
            <div className={`w-20 h-20 min-w-[5rem] min-h-[5rem] rounded-full flex items-center justify-center shrink-0 border ${
                isDark
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-lg'
                    : 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
            }`}>
                {icon}
            </div>

            {/* 2. Pill label in all capital letters (11-12px bold, uppercase tracking-wider, red tint & border) */}
            <div className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border ${
                isDark
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
                <span>{pillText}</span>
            </div>

            {/* 3. Heading (increased font size 24px–28px bold, centered) */}
            {headingText === 'Cannot proceed with this photo' ? (
                <h2 className={`text-2xl sm:text-[28px] font-bold leading-tight tracking-tight max-w-[340px] mx-auto ${
                    isDark ? 'text-white' : 'text-slate-900'
                }`}>
                    Cannot proceed with this<br />photo
                </h2>
            ) : (
                <h2 className={`text-2xl sm:text-[28px] font-bold leading-tight tracking-tight max-w-sm mx-auto [text-wrap:balance] ${
                    isDark ? 'text-white' : 'text-slate-900'
                }`}>
                    {headingText}
                </h2>
            )}

            {/* 4. Short explanation (16px, high contrast and fully readable in both dark and light modes) */}
            <p className={`text-base max-w-sm leading-relaxed font-medium ${
                isDark ? 'text-slate-200' : 'text-slate-700'
            }`}>
                {explanationText}
            </p>

            {/* 5. Full-width solid orange action button (52px tall, 16px semibold) */}
            <div className="w-full pt-1 space-y-3">
                <button
                    type="button"
                    onClick={onPrimaryAction}
                    className="w-full h-[52px] min-h-[52px] rounded-xl bg-[#ff6b00] hover:bg-[#e05e00] text-white font-semibold text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                >
                    <RefreshCw size={18} strokeWidth={2.25} className="shrink-0 text-white" />
                    <span>{buttonLabel}</span>
                </button>

                {/* Secondary action link (e.g. choose photo from gallery) */}
                {onSecondaryAction && secondaryButtonText && (
                    <button
                        type="button"
                        onClick={onSecondaryAction}
                        className={`text-sm font-medium underline cursor-pointer py-1 ${
                            isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {secondaryButtonText}
                    </button>
                )}
            </div>
        </div>
    );
}
