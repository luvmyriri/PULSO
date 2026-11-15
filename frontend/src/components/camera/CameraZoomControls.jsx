import React from 'react';

/**
 * CameraZoomControls
 * ─────────────────────────────────────────────────────────────────────────────
 * Smartphone-style zoom controls:
 * - 1x, 2x, 3x quick presets (matching iOS / Samsung One UI camera behavior)
 * - Dynamic continuous readout when pinching (e.g. 1.7x)
 */
export default function CameraZoomControls({
    zoom = 1,
    onZoomChange,
    className = ''
}) {
    // Determine active slot and label for presets (1x, 2x, 3x)
    const presets = [
        { id: '1x', target: 1, label: zoom < 1.5 && Math.abs(zoom - 1) > 0.05 ? `${zoom.toFixed(1)}x` : '1x', active: zoom < 1.5 },
        { id: '2x', target: 2, label: zoom >= 1.5 && zoom < 2.5 && Math.abs(zoom - 2) > 0.05 ? `${zoom.toFixed(1)}x` : '2x', active: zoom >= 1.5 && zoom < 2.5 },
        { id: '3x', target: 3, label: zoom >= 2.5 && Math.abs(zoom - 3) > 0.05 ? `${zoom.toFixed(1)}x` : '3x', active: zoom >= 2.5 }
    ];

    return (
        <div className={`flex items-center justify-center select-none z-30 ${className}`}>
            {/* Dark glass capsule holding zoom presets */}
            <div className="inline-flex items-center p-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-md">
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onZoomChange(preset.target)}
                        aria-label={`Zoom ${preset.label}`}
                        className={`min-w-[44px] min-h-[44px] px-2.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white ${
                            preset.active
                                ? 'bg-white text-black shadow-xs'
                                : 'text-white/80 hover:text-white hover:bg-white/15'
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
