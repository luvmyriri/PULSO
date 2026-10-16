import React, { useRef } from 'react';

export const RATIO_OPTIONS = [
    {
        id: '4:3',
        label: '4:3',
        note: 'Most detail. Best for reports.',
        ariaNote: '4:3, most detail'
    },
    {
        id: '16:9',
        label: '16:9',
        note: 'Wide view. Crops the top and bottom.',
        ariaNote: '16:9, wide view, crops top and bottom'
    },
    {
        id: '1:1',
        label: '1:1',
        note: 'Square view. Crops the sides.',
        ariaNote: '1:1, square view, crops sides'
    }
];

/**
 * RatioSelector
 * ─────────────────────────────────────────────────────────────────────────────
 * Segmented control for choosing camera frame aspect ratios (4:3, 16:9, 1:1).
 * Strictly compliant with PULSO's dark color palette and WCAG accessibility:
 * - 48px tall tap targets (h-12).
 * - Selected: Solid orange (#ff6b00) with dark navy (#070d1a) text (4.5:1 contrast).
 * - Unselected: Card fill (#0c1427) with 1px border and white text.
 * - Arrow key navigation (role="radiogroup").
 * - Soft gray 12px dynamic note below control.
 */
export default function RatioSelector({
    value = '4:3',
    onChange,
    className = '',
    availableRatios = ['4:3', '16:9', '1:1']
}) {
    const groupRef = useRef(null);

    const filteredOptions = RATIO_OPTIONS.filter((opt) => availableRatios.includes(opt.id));
    const currentOption = filteredOptions.find((opt) => opt.id === value) || filteredOptions[0];

    const handleKeyDown = (e, currentIndex) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % filteredOptions.length;
            onChange?.(filteredOptions[nextIndex].id);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + filteredOptions.length) % filteredOptions.length;
            onChange?.(filteredOptions[prevIndex].id);
        }
    };

    return (
        <div className={`w-full max-w-xs mx-auto flex flex-col items-center space-y-1.5 select-none ${className}`}>
            {/* Live screen reader announcement */}
            <div className="sr-only" role="status" aria-live="polite">
                {`Photo size ${currentOption?.id}. ${currentOption?.note}`}
            </div>

            {/* Segmented Control Container (48px tall, 3 equal segments) */}
            <div
                ref={groupRef}
                role="radiogroup"
                aria-label="Photo size"
                className="w-full h-12 min-h-[48px] p-1 rounded-2xl bg-[#0c1427] border border-slate-800/90 flex items-center gap-1 shadow-inner"
            >
                {filteredOptions.map((opt, idx) => {
                    const isSelected = value === opt.id;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => onChange?.(opt.id)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            className={`flex-1 h-full min-h-[40px] rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98] ${
                                isSelected
                                    ? 'bg-[#ff6b00] text-[#070d1a] font-bold shadow-sm'
                                    : 'bg-transparent text-white hover:bg-white/5 hover:text-slate-200'
                            }`}
                        >
                            <span className="tabular-nums">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Dynamic 12px Soft Gray Note Under Control */}
            <p className="text-xs text-slate-400 text-center font-medium leading-tight px-1">
                {currentOption?.note}
            </p>
        </div>
    );
}
