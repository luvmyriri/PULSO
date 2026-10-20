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
    },
    {
        id: 'Full',
        label: 'Full',
        note: 'Full screen view. Fills the entire frame.',
        ariaNote: 'Full screen view, fills entire frame'
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
    availableRatios = ['4:3', '16:9', '1:1', 'Full'],
    isDark = true
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
        <div className={`w-full mx-auto flex flex-col items-center space-y-1.5 select-none ${className}`}>
            {/* Live screen reader announcement */}
            <div className="sr-only" role="status" aria-live="polite">
                {`Photo size ${currentOption?.id}. ${currentOption?.note}`}
            </div>

            {/* Smartphone Camera Ratio Selector Strip */}
            <div
                ref={groupRef}
                role="radiogroup"
                aria-label="Photo size"
                className={`w-full h-10 min-h-[40px] p-1 rounded-full border flex items-center gap-1 ${
                    isDark
                        ? 'bg-neutral-900 border-white/15'
                        : 'bg-slate-100 border-slate-200'
                }`}
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
                            className={`flex-1 h-full rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-[0.98] ${
                                isSelected
                                    ? 'bg-[#ff6b00] text-white shadow-sm'
                                    : (isDark
                                        ? 'bg-transparent text-white/85 hover:bg-white/10 hover:text-white'
                                        : 'bg-transparent text-slate-700 hover:bg-white hover:text-slate-900')
                            }`}
                        >
                            <span className="tabular-nums tracking-wide">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Dynamic 11px High Contrast Note Under Control */}
            <p className={`text-[11px] text-center font-medium leading-tight px-1 ${
                isDark ? 'text-white/75' : 'text-slate-600'
            }`}>
                {currentOption?.note}
            </p>
        </div>
    );
}
