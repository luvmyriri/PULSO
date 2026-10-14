/**
 * apiFetch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified, resilient API client for PULSO.
 *
 * Implements:
 *   - Base URL awareness (API_BASE_URL)
 *   - Automatic Authorization Bearer token attachment from authSession
 *   - 10-second default timeout via AbortController
 *   - Distinction between:
 *       • NETWORK_ERROR (server unreachable / ERR_CONNECTION_REFUSED)
 *       • TIMEOUT (aborted due to deadline)
 *       • AUTH_ERROR (401/403)
 *       • CLIENT_ERROR (4xx)
 *       • SERVER_ERROR (5xx)
 *   - Zero uncaught promise rejections on connection loss
 *   - In-flight request deduplication (`dedupeFetch`)
 *   - Backend health check helper (`checkServerHealth`)
 *   - Concise one-line logging (`logApiFailure`)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { API_BASE_URL } from './apiBase';
import { getAuthToken } from './authSession';

export class ApiError extends Error {
    constructor(message, { type = 'UNKNOWN', status = 0, endpoint = '', data = null, originalError = null } = {}) {
        super(message);
        this.name = 'ApiError';
        this.type = type;
        this.status = status;
        this.endpoint = endpoint;
        this.data = data;
        this.originalError = originalError;
        this.isNetworkError = type === 'NETWORK_ERROR' || type === 'TIMEOUT';
        this.isServerUnreachable = type === 'NETWORK_ERROR' || status === 0 || status === 502 || status === 503 || status === 504;
        this.isTimeout = type === 'TIMEOUT';
        this.isAuthError = type === 'AUTH_ERROR' || status === 401 || status === 403;
    }
}

/**
 * Maps HTTP status code to error category string.
 */
export const classifyHttpStatus = (status) => {
    if (status === 0) return 'NETWORK_ERROR';
    if (status === 408 || status === 504) return 'TIMEOUT';
    if (status === 401 || status === 403) return 'AUTH_ERROR';
    if (status >= 400 && status < 500) return 'CLIENT_ERROR';
    if (status >= 500) return 'SERVER_ERROR';
    return 'UNKNOWN';
};

/**
 * Formats a clean, readable one-line log for failed network operations.
 */
export const logApiFailure = (endpoint, resultOrError, attempt = 1, maxAttempts = 3) => {
    const type = resultOrError?.type || 'NETWORK_ERROR';
    const status = resultOrError?.status || 0;
    const msg = resultOrError?.message || 'Request failed';
    const attemptStr = maxAttempts ? ` - attempt ${attempt}/${maxAttempts}` : '';
    console.warn(`[PULSO API] ${endpoint} failed (${type}${status ? ` ${status}` : ''})${attemptStr}: ${msg}`);
};

/**
 * Single Unified API Client
 *
 * @param {string} endpoint - Relative path (e.g. '/api/reports') or absolute URL
 * @param {object} options - Fetch options + timeout, skipAuth, throwOnError
 * @returns {Promise<{ ok: boolean, data?: any, error?: ApiError, status: number, message?: string, type?: string, isNetworkError?: boolean, isServerUnreachable?: boolean, isAuthError?: boolean, isTimeout?: boolean }>}
 */
export const apiFetch = async (endpoint, options = {}) => {
    const {
        timeout = 10000,
        skipAuth = false,
        throwOnError = false,
        headers: customHeaders = {},
        signal: customSignal,
        ...restOptions
    } = options;

    const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Prepare headers
    const headers = new Headers();
    const token = !skipAuth ? getAuthToken() : null;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const isFormData = restOptions.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (customHeaders) {
        if (customHeaders instanceof Headers) {
            customHeaders.forEach((val, key) => headers.set(key, val));
        } else {
            Object.entries(customHeaders).forEach(([key, val]) => {
                if (val !== undefined && val !== null) headers.set(key, val);
            });
        }
    }

    // Set up timeout with AbortController
    const controller = new AbortController();
    let isTimeoutTriggered = false;
    const timeoutId = setTimeout(() => {
        isTimeoutTriggered = true;
        controller.abort();
    }, timeout);

    // Merge external signal if passed
    if (customSignal) {
        if (customSignal.aborted) {
            clearTimeout(timeoutId);
            controller.abort();
        } else {
            customSignal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                controller.abort();
            }, { once: true });
        }
    }

    try {
        const response = await fetch(url, {
            ...restOptions,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Success response
        if (response.ok) {
            let data = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json().catch(() => null);
            } else if (response.status !== 204) {
                data = await response.text().catch(() => null);
            }
            return {
                ok: true,
                data,
                status: response.status,
                headers: response.headers,
            };
        }

        // Server responded with non-2xx status
        let errorData = null;
        let errorMessage = response.statusText;
        const contentType = response.headers.get('content-type') || '';
        try {
            if (contentType.includes('application/json')) {
                errorData = await response.json();
                if (errorData) {
                    if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail[0]?.msg || JSON.stringify(errorData.detail);
                    } else if (typeof errorData.message === 'string') {
                        errorMessage = errorData.message;
                    }
                }
            } else {
                const text = await response.text();
                if (text && text.length < 200) errorMessage = text;
            }
        } catch (_) {
            // non-fatal response parsing
        }

        const type = classifyHttpStatus(response.status);
        const apiError = new ApiError(errorMessage || `Request failed with HTTP ${response.status}`, {
            type,
            status: response.status,
            endpoint,
            data: errorData,
        });

        if (throwOnError) throw apiError;

        return {
            ok: false,
            status: response.status,
            message: apiError.message,
            error: apiError,
            type,
            isNetworkError: apiError.isNetworkError,
            isServerUnreachable: apiError.isServerUnreachable,
            isAuthError: apiError.isAuthError,
            isTimeout: false,
        };
    } catch (err) {
        clearTimeout(timeoutId);

        let type = 'UNKNOWN';
        let message = err.message || 'Request failed';
        let status = 0;

        if (isTimeoutTriggered || err.name === 'AbortError') {
            type = 'TIMEOUT';
            message = `Connection timed out after ${Math.round(timeout / 1000)}s`;
            status = 408;
        } else if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
            type = 'NETWORK_ERROR';
            message = 'PULSO server is currently unreachable';
            status = 0;
        }

        const apiError = new ApiError(message, {
            type,
            status,
            endpoint,
            originalError: err,
        });

        if (throwOnError) throw apiError;

        return {
            ok: false,
            status,
            message: apiError.message,
            error: apiError,
            type,
            isNetworkError: true,
            isServerUnreachable: true,
            isAuthError: false,
            isTimeout: type === 'TIMEOUT',
        };
    }
};

/**
 * Quick ping to backend health check endpoint (/api/health).
 * Returns true if server is responsive, false otherwise.
 */
export const checkServerHealth = async (timeoutMs = 4000) => {
    try {
        const res = await apiFetch('/api/health', {
            timeout: timeoutMs,
            skipAuth: true,
        });
        return res.ok === true;
    } catch {
        return false;
    }
};

/**
 * Deduplicated in-flight request manager.
 * Prevents identical simultaneous network calls for the same resource.
 */
const inFlightRequests = new Map();

export const dedupeFetch = (key, fetcher) => {
    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }
    const promise = (async () => {
        try {
            return await fetcher();
        } finally {
            inFlightRequests.delete(key);
        }
    })();
    inFlightRequests.set(key, promise);
    return promise;
};