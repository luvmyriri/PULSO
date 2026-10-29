import { useEffect, useState } from 'react';
import { API_BASE_URL } from './apiBase';
import { getAuthToken } from './authSession';
import { fetchReportMapPages } from './reportPages';

async function requestPage(path, { method = 'GET', body, signal, headers = {} } = {}) {
    const token = getAuthToken();
    const multipart = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method, signal, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}), ...headers },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const detail = data?.detail;
        const error = new Error(response.status === 401 ? 'Your session has expired. Sign in again to continue.' : response.status === 403 ? 'Your account does not have access to this action.' : typeof detail === 'string' ? detail : detail?.next_action || (Array.isArray(detail) ? detail.map(e => `${e.loc?.slice(1).join('.') || 'Field'}: ${e.msg}`).join('; ') : `The request could not be completed (HTTP ${response.status}). Try again.`));
        error.status = response.status;
        throw error;
    }
    return data;
}

export async function governmentRequest(path, options = {}) {
    const data = await requestPage(path, options);
    if ((options.method || 'GET') === 'GET' && path.split('?')[0] === '/api/gov/report-map' && data && Object.hasOwn(data, 'next_skip')) {
        return fetchReportMapPages({ path, first: data, request: nextPath => requestPage(nextPath, options) });
    }
    return data;
}

export function useGovernmentData(path) {
    const [state, setState] = useState({ path: null, data: null, loading: true, error: '', fetchedAt: null });
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        if (!path) return;
        const controller = new AbortController();
        setState(s => ({ ...s, path, data: s.path === path ? s.data : null, loading: true, error: '' }));
        governmentRequest(path, { signal: controller.signal }).then(data => {
            if (!controller.signal.aborted) setState({ path, data, loading: false, error: '', fetchedAt: new Date() });
        }).catch(error => {
            if (error.name !== 'AbortError') setState(s => ({ ...s, path, loading: false, error: error.message }));
        });
        return () => controller.abort();
    }, [path, revision]);
    return { ...state, data: state.path === path ? state.data : null, error: state.path === path ? state.error : '', loading: Boolean(path) && (state.path !== path || state.loading), reload: () => setRevision(r => r + 1) };
}
