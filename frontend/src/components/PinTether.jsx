import React, { useState, useEffect, useCallback } from 'react';

/**
 * PinTether Component
 * 
 * Draws a 3px round-dot line in the orange token (dots 3px, 6px apart)
 * from the bottom of the pin down to the top edge of the floating card.
 * Follows the pin when the map moves and is hidden if the pin is behind or below the card top.
 */
export default function PinTether({
    pinRef,
    cardRef,
    containerRef,
    isVisible = true,
    map = null
}) {
    const [coords, setCoords] = useState(null);

    const updateCoords = useCallback(() => {
        if (!isVisible || !pinRef?.current || !cardRef?.current || !containerRef?.current) {
            setCoords(null);
            return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const pinRect = pinRef.current.getBoundingClientRect();
        const cardRect = cardRef.current.getBoundingClientRect();

        const pinBottomX = pinRect.left + pinRect.width / 2 - containerRect.left;
        const pinBottomY = pinRect.bottom - containerRect.top;
        const cardTopY = cardRect.top - containerRect.top;

        // Hidden if the pin is behind or below the top edge of the card
        if (pinBottomY >= cardTopY) {
            setCoords(null);
            return;
        }

        const cardLeft = cardRect.left - containerRect.left;
        const cardRight = cardRect.right - containerRect.left;
        // Clamp card connection point horizontally within the card top width with generous inset
        const cardTargetX = Math.max(cardLeft + 28, Math.min(cardRight - 28, pinBottomX));

        setCoords({
            x1: pinBottomX,
            y1: pinBottomY,
            x2: cardTargetX,
            y2: cardTopY
        });
    }, [isVisible, pinRef, cardRef, containerRef]);

    // Track coordinates on animation frames during pan/zoom or pin/card changes
    useEffect(() => {
        if (!isVisible) {
            setCoords(null);
            return;
        }

        updateCoords();

        let animId = null;
        let isRunning = true;

        const loop = () => {
            if (!isRunning) return;
            updateCoords();
            animId = requestAnimationFrame(loop);
        };

        // Run continuous loop during active transitions, then throttle
        animId = requestAnimationFrame(loop);

        const stopLoopTimer = setTimeout(() => {
            if (animId) cancelAnimationFrame(animId);
            isRunning = false;
        }, 1200);

        // Google Maps movement listeners
        let listeners = [];
        if (map && window.google?.maps?.event) {
            const boundsL = map.addListener('bounds_changed', updateCoords);
            const centerL = map.addListener('center_changed', updateCoords);
            const zoomL = map.addListener('zoom_changed', updateCoords);
            const dragL = map.addListener('drag', updateCoords);
            listeners.push(boundsL, centerL, zoomL, dragL);
        }

        const handleResize = () => updateCoords();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            isRunning = false;
            if (animId) cancelAnimationFrame(animId);
            clearTimeout(stopLoopTimer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
            if (window.google?.maps?.event) {
                listeners.forEach(l => window.google.maps.event.removeListener(l));
            }
        };
    }, [isVisible, map, updateCoords]);

    if (!coords) return null;

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden"
            aria-hidden="true"
        >
            <line
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke="#ff6b00"
                strokeWidth="3"
                strokeDasharray="3 6"
                strokeLinecap="round"
            />
        </svg>
    );
}
