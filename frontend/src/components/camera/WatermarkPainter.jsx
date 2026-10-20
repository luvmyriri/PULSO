import React, { useRef, useEffect } from 'react';
import { drawEvidenceWatermark } from '../../utils/watermark';

/**
 * WatermarkPainter
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared React component for painting the live PULSO Evidence Watermark onto an
 * overlay canvas with pixel-for-pixel fidelity matching the saved photo output.
 * 
 * - Uses the EXACT same drawEvidenceWatermark function from watermark.js.
 * - Anchors to the bottom of the camera viewfinder frame or photo preview.
 * - Handles high-DPI scaling (window.devicePixelRatio) so text remains ultra-sharp.
 */
export default function WatermarkPainter({
    metadata = {},
    className = '',
    style = {}
}) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Container dimensions
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.round(rect.width);
        const displayHeight = Math.round(rect.height);

        if (displayWidth <= 0 || displayHeight <= 0) return;

        // High-DPI support (e.g. retina screens, 2x or 3x)
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const internalWidth = Math.round(displayWidth * dpr);
        const internalHeight = Math.round(displayHeight * dpr);

        if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
            canvas.width = internalWidth;
            canvas.height = internalHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, internalWidth, internalHeight);
            // Draw watermark directly onto the canvas using shared algorithm
            drawEvidenceWatermark(canvas, metadata);
        }
    }, [
        metadata?.structuredAddress,
        metadata?.locationAddress,
        metadata?.address,
        metadata?.timestamp,
        metadata?.capturedAt,
        metadata?.location?.lat,
        metadata?.location?.lng,
        metadata?.coordinates?.lat,
        metadata?.coordinates?.lng,
        metadata?.lat,
        metadata?.lng
    ]);

    // Resize observer to re-draw when viewfinder frame reshapes (e.g. 4:3 -> 16:9 -> 1:1)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const dpr = window.devicePixelRatio || 1;
                canvas.width = Math.round(rect.width * dpr);
                canvas.height = Math.round(rect.height * dpr);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                drawEvidenceWatermark(canvas, metadata);
            }
        });

        observer.observe(canvas);
        return () => observer.disconnect();
    }, [metadata]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full pointer-events-none select-none ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
}
