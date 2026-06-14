/**
 * apiFetch.js
 * Wrapper around fetch that properly handles errors and returns backend error messages.
 */
import { API_BASE_URL } from './apiBase';

export const handleApiError = async (response) => {
    if (response.ok) {
        return { ok: true, data: await response.json() };
    }
    
    let errorData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
    } else {
        errorData = { detail: response.statusText };
    }
    
    const msg = typeof errorData.detail === 'object' 
        ? (Array.isArray(errorData.detail) ? errorData.detail[0].msg : JSON.stringify(errorData.detail))
        : errorData.detail;
    
    return { 
        ok: false, 
        status: response.status, 
        message: msg || `HTTP ${response.status}` 
    };
};

export const apiFetch = async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    
    return handleApiError(response);
};