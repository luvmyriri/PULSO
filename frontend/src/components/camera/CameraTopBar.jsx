import React from 'react';
import { X } from 'lucide-react';

/**
 * CameraTopBar
 * ─────────────────────────────────────────────────────────────────────────────
 * Top bar zone:
 * - Left: Title "Take a photo" (18px bold, white) with one soft gray line under it:
 *   "Photos are saved with your location and time."
 * - Right: Round close (X) button (3rem / 48px) with existing card fill and border tokens.
 */
export default function CameraTopBar({
    title = 'Take a photo',
    subtitle = 'Photos are saved with your location and time.',
    onClose,
    titleId = 'camera-screen-title',
    className = '',
    isDark = true
}) {
    return (
        <header
            className={`w-full flex items-center justify-between gap-3 px-[clamp(1rem,5vw,1.5rem)] pt-[max(env(safe-area-inset-top,0px),1rem)] pb-3 z-30 shrink-0 ${
                isDark ? 'border-b border-white/5' : 'border-b border-slate-200/80 bg-white/50 backdrop-blur-xs'
            } ${className}`}
        >
            <div className="min-w-0 flex-1 text-left">
                <h1
                    id={titleId}
                    className={`font-heading font-bold text-lg leading-tight truncate tracking-tight ${
                        isDark ? 'text-white' : 'text-slate-900'
                    }`}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p className={`text-xs font-medium leading-snug mt-0.5 truncate ${
                        isDark ? 'text-slate-200' : 'text-slate-600'
                    } dark:text-slate-200`}>
                        {subtitle}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Close camera"
                className={`w-12 h-12 min-w-[3rem] min-h-[3rem] rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] border ${
                    isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-md'
                }`}
            >
                <X size={20} strokeWidth={2.25} />
            </button>
        </header>
    );
}
