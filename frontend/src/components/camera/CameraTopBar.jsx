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
    className = ''
}) {
    return (
        <header
            className={`w-full flex items-center justify-between gap-3 px-[clamp(1rem,5vw,1.5rem)] pt-[max(env(safe-area-inset-top,0px),1rem)] pb-3 z-30 shrink-0 ${className}`}
        >
            <div className="min-w-0 flex-1 text-left">
                <h1
                    id={titleId}
                    className="font-heading font-bold text-lg text-white leading-tight truncate tracking-tight"
                >
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs text-slate-400 font-normal leading-snug mt-0.5 truncate">
                        {subtitle}
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Close camera"
                className="w-12 h-12 min-w-[3rem] min-h-[3rem] rounded-full flex items-center justify-center bg-white/10 hover:bg-white/15 dark:bg-[#0c1427]/80 dark:hover:bg-[#0c1427] border border-white/15 dark:border-slate-800 text-white transition-colors cursor-pointer shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
            >
                <X size={20} strokeWidth={2.25} />
            </button>
        </header>
    );
}
