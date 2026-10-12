import React from 'react';

/**
 * PulsoBottomScrim
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardized soft-blur bottom fade scrim for PULSO mobile views:
 * - Loading Screen (Splash)
 * - 5 Tutorial Screens
 * - Installed App Sign-In
 *
 * Design Specification:
 * - 11rem height (covers Next button, Sign in line, safe area + 3rem headroom).
 * - Vertical gradient from fully clear (0%) at top to the active mode's base
 *   color at ~92% opacity at the bottom.
 * - Light base: #F5F9FF (rgb 245, 249, 255)
 * - Dark base:  #0B1120 (rgb 11, 17, 32)
 * - Read from token `--bg-scrim-rgb`, with isDark prop fallback.
 * - Backdrop blur(6px) masked with a vertical linear gradient so the blur
 *   fades in smoothly with zero hard edges.
 * - Progressive enhancement: gracefully falls back to the smooth gradient
 *   alone on environments without backdrop-filter support.
 * - Zero hard borders, zero rectangular outlines, zero card shadows.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function PulsoBottomScrim({ isDark = false, className = '' }) {
  const rgbValues = isDark ? '11, 17, 32' : '245, 249, 255';

  return (
    <div
      className={`absolute bottom-0 inset-x-0 pointer-events-none select-none z-0 overflow-hidden ${className}`}
      style={{
        height: '11rem',
        // Provide local fallback token if not inherited from parent
        '--bg-scrim-rgb': `var(--bg-scrim-rgb, ${rgbValues})`
      }}
      aria-hidden="true"
    >
      {/* 1. Soft progressive backdrop blur with feathered top edge */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%)'
        }}
      />

      {/* 2. Delicate translucent vertical gradient fade that keeps background art softly visible */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{
          background: `linear-gradient(to top, rgba(var(--bg-scrim-rgb, ${rgbValues}), 0.82) 0%, rgba(var(--bg-scrim-rgb, ${rgbValues}), 0.45) 45%, rgba(var(--bg-scrim-rgb, ${rgbValues}), 0.15) 75%, rgba(var(--bg-scrim-rgb, ${rgbValues}), 0) 100%)`
        }}
      />
    </div>
  );
}
