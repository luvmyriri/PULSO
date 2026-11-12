import { CapacitorHttp } from '@capacitor/core';
import { API_BASE_URL } from './apiBase';
import { isNativeAndroid } from './appContext';

const downloads = new Map();

export function usesNativeReportMedia(url) {
    if (!url || !isNativeAndroid() || !API_BASE_URL) return false;
    try {
        const resource = new URL(url);
        return resource.origin === new URL(API_BASE_URL).origin && !resource.username && !resource.password &&
            (/^\/(?:api\/)?uploads\/reports\//.test(resource.pathname) || resource.pathname === '/api/thumbnails');
    } catch { return false; }
}

export async function loadReportImageSource(url) {
    if (!usesNativeReportMedia(url)) return url;
    if (!downloads.has(url)) {
        const download = CapacitorHttp.get({ url, responseType: 'arraybuffer', connectTimeout: 10000,
            readTimeout: 15000, disableRedirects: true }).then(response => {
            const type = Object.entries(response.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1]?.split(';')[0];
            if (response.status < 200 || response.status >= 300 || !/^image\/(jpeg|png|webp|gif)$/i.test(type || '') ||
                typeof response.data !== 'string' || !response.data.length || response.data.length > 12 * 1024 * 1024) {
                throw new Error('Report image could not be downloaded.');
            }
            return `data:${type};base64,${response.data}`;
        }).catch(error => { downloads.delete(url); throw error; });
        downloads.set(url, download);
        // Keep a bounded in-memory cache; never persist resident photo bytes.
        if (downloads.size > 32) downloads.delete(downloads.keys().next().value);
    }
    return downloads.get(url);
}
