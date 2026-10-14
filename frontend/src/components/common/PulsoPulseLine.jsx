import React from 'react';

/**
 * PulsoPulseLine
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable traveling pulse line (ECG / heartbeat) for in-app loading states.
 * Replaces generic spinners with PULSO's signature Civic Aperture pulse line.
 *
 * Props:
 * - width: width string or number (default '100%', max-width controlled by parent)
 * - height: height string or number (default 20)
 * - isDark: boolean (theme mode; defaults to detecting .dark class or theme)
 * - color: stroke color (defaults to PULSO orange #ff6b00)
 * - trackColor: background line track color (optional faint track)
 * - reducedMotion: boolean (disables pulse movement, shows static flat line)
 * - className: additional CSS classes
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function PulsoPulseLine({
  width = '100%',
  height = 20,
  isDark = null,
  color = '#ff6b00',
  trackColor = null,
  reducedMotion = false,
  className = ''
}) {
  // If isDark is not passed, detect from documentElement
  const effectiveIsDark =
    isDark !== null
      ? isDark
      : typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const bgColor = effectiveIsDark ? '#070a12' : '#f8f7f5';
  const baselineColor = trackColor || color;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{ width, height: `${height}px` }}
    >
      <svg
        viewBox="0 0 200 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Flat baseline */}
        <line
          x1="0"
          y1="10"
          x2="200"
          y2="10"
          stroke={baselineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Traveling Heartbeat Pulse (Hidden if reduced motion) */}
        {!reducedMotion && (
          <g className="pulso-pulse-line-traveler">
            {/* Background mask rect that conceals the flat line directly under the blip */}
            <rect
              x="-15"
              y="0"
              width="30"
              height="20"
              fill={bgColor}
            />
            {/* Heartbeat pulse path (Peak up, dip down, return) */}
            <path
              d="M -15,10 L -6,10 L -2,2 L 3,18 L 7,10 L 15,10"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}
      </svg>

      <style>{`
        @keyframes pulsoPulseLineLoop {
          0% {
            transform: translateX(-25px);
          }
          65% {
            transform: translateX(225px);
          }
          100% {
            transform: translateX(225px);
          }
        }
        .pulso-pulse-line-traveler {
          animation: pulsoPulseLineLoop 1.35s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .pulso-pulse-line-traveler {
            animation: none !important;
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
