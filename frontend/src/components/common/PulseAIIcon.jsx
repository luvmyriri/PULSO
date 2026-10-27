import React from 'react';

export default function PulseAIIcon({ size = 24, className = '', alt = 'PULSEAI' }) {
    return (
        <img
            src="/pulseai-icon.png"
            alt={alt}
            width={size}
            height={size}
            className={`rounded-full object-contain shrink-0 select-none ${className}`}
            style={{ width: size, height: size }}
            loading="eager"
            decoding="async"
        />
    );
}
