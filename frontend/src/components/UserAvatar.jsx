import React, { useState, useMemo } from 'react';
import { API_BASE_URL } from '../utils/apiBase';

/**
 * Builds an absolute URL for user avatars that works across different browsers,
 * localhost, LAN hostnames, and devices, adding a cache-busting timestamp version.
 */
export const buildFullAvatarUrl = (avatarUrl, updatedAt) => {
    if (!avatarUrl || typeof avatarUrl !== 'string') return null;
    let url = avatarUrl.trim();
    if (!url) return null;

    if (url.startsWith('/')) {
        url = `${API_BASE_URL}${url}`;
    }

    if (updatedAt) {
        const v = typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt;
        const separator = url.includes('?') ? '&' : '?';
        if (!url.includes('v=')) {
            url = `${url}${separator}v=${v}`;
        }
    }
    return url;
};

/**
 * Reusable UserAvatar component that adheres to PULSO Civic Aperture principles:
 * - Renders high-fidelity server-persisted photo with cross-browser absolute URL
 * - Automatic safe fallback to user's initial on empty URL or image load error (onError)
 * - Cache-busting support
 */
export const UserAvatar = ({
    avatarUrl,
    updatedAt,
    fallbackInitial = 'U',
    alt = 'User Avatar',
    className = 'w-full h-full object-cover',
    initialClassName = '',
}) => {
    const [hasError, setHasError] = useState(false);
    const resolvedUrl = useMemo(() => {
        setHasError(false);
        return buildFullAvatarUrl(avatarUrl, updatedAt);
    }, [avatarUrl, updatedAt]);

    if (!resolvedUrl || hasError) {
        return (
            <span className={initialClassName || 'select-none font-bold'}>
                {fallbackInitial}
            </span>
        );
    }

    return (
        <img
            src={resolvedUrl}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
            crossOrigin="anonymous"
            loading="lazy"
        />
    );
};

export default UserAvatar;
