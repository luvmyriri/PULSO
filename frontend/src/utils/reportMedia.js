import { API_BASE_URL } from './apiBase';

export function resolveReportMediaUrl(value, apiBase = API_BASE_URL) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const path = value.trim();
    if (/^(https?:\/\/|data:image\/|blob:)/i.test(path)) return path;
    if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return null;
    return `${apiBase.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function getReportPhotoUrl(report, apiBase = API_BASE_URL) {
    if (!report) return null;
    let paths = report.image_paths;
    if (typeof paths === 'string') {
        try { paths = JSON.parse(paths); } catch { /* Legacy single upload path. */ }
    }
    const candidates = [report.image_url, report.photo_url, report.image, report.photo_thumbnail,
        report.media_url, ...(Array.isArray(report.media_urls) ? report.media_urls : []),
        ...(Array.isArray(report.photos) ? report.photos : []), ...(Array.isArray(paths) ? paths : [paths])];
    for (const value of candidates) {
        const url = resolveReportMediaUrl(value, apiBase);
        if (url) return url;
    }
    return null;
}

export function getReportThumbnailUrl(photoUrl, size = 80, apiBase = API_BASE_URL) {
    if (!photoUrl) return null;
    // Resize only this backend's already-published media; do not replace public
    // projections with originals or proxy arbitrary external image URLs.
    const origin = new URL(apiBase || '/', typeof location !== 'undefined' ? location.href : 'https://pulso.invalid').origin;
    const url = new URL(photoUrl, origin);
    if (url.origin !== origin) return photoUrl;
    if (url.pathname === '/api/thumbnails') {
        url.searchParams.set('size', String(size));
        return url.href;
    }
    if (/^\/(?:api\/)?uploads\/reports\//.test(url.pathname)) {
        return `${apiBase}/api/thumbnails?src=${encodeURIComponent(url.pathname)}&size=${size}`;
    }
    return photoUrl;
}

export const getReportPinPhotoUrl = (photoUrl, apiBase = API_BASE_URL) => getReportThumbnailUrl(photoUrl, 80, apiBase);
