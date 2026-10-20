import React from 'react';

/**
 * ShutterButton
 * ─────────────────────────────────────────────────────────────────────────────
 * Shutter: a 4.5rem (72px) round button with a white ring (4px) and a solid inner
 * circle in the existing orange token (#ff6b00).
 * Pressed state: the inner circle shrinks to 90% (with reduced motion: no shrink).
 */
export default function ShutterButton({
    onClick,
    disabled = false,
    ariaLabel = 'Take photo',
    className = '',
    isDark = true
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`w-[4.25rem] h-[4.25rem] min-w-[4.25rem] min-h-[4.25rem] rounded-full border-[3.5px] flex items-center justify-center transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] disabled:opacity-40 disabled:cursor-not-allowed select-none ${
                isDark
                    ? 'border-white bg-white/10 backdrop-blur-xs shadow-lg'
                    : 'border-slate-300 bg-white shadow-md'
            } ${className}`}
        >
            <div
                className={`w-[3.25rem] h-[3.25rem] rounded-full transition-transform duration-100 ease-out group-active:scale-90 motion-reduce:group-active:scale-100 ${
                    isDark
                        ? 'bg-white group-hover:bg-white/90'
                        : 'bg-white border border-slate-200 shadow-xs group-hover:bg-slate-50'
                }`}
            />
        </button>
    );
}
