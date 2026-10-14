import React from 'react';
import { getPulsoIcon } from '../../utils/iconMap';

/**
 * PulsoIcon
 * ─────────────────────────────────────────────────────────────────────────────
 * Purposeful, accessible Lucide icon renderer adhering to PULSO standards:
 * - Strict sizes: 20px (inline text), 24px (list/card), 32px (hero)
 * - 2px stroke width, round caps & joins
 * - Zero glow, zero tinted background tiles, zero gradients
 * - Semantic aria-hidden / aria-label support
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function PulsoIcon({
  name,
  size = 24,
  color,
  className = '',
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
  ...props
}) {
  const IconComponent = getPulsoIcon(name);

  // Standard size fallback if invalid
  const iconSize = typeof size === 'number' && size > 0 ? size : 24;

  return (
    <IconComponent
      size={iconSize}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...(color ? { color } : {})}
      aria-hidden={ariaLabel ? undefined : ariaHidden}
      aria-label={ariaLabel}
      {...props}
    />
  );
}
