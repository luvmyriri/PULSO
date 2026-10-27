// Keep resident navigation in React Router, including same-page notification links.
export function residentDashboardRoute(search) {
    const params = new URLSearchParams(search);
    const id = params.get('reportId');
    const reportId = /^[1-9]\d*$/.test(id || '') && Number.isSafeInteger(Number(id)) ? id : null;
    return { tab: reportId ? 'reports' : (params.get('tab') || 'overview'), reportId };
}

export function residentDashboardUrl(tab, search = '', reportId = null) {
    const params = new URLSearchParams(search);
    params.delete('reportId');
    if (tab === 'overview' || tab === 'home') params.delete('tab');
    else params.set('tab', tab);
    if (tab === 'reports' && reportId != null) params.set('reportId', String(reportId));
    const query = params.toString();
    return `/dashboard${query ? `?${query}` : ''}`;
}

export function residentNotificationTarget(target) {
    if (typeof target !== 'string') return null;
    if (/^\/updates\/[1-9]\d*$/.test(target)) return target;
    if (!target.startsWith('/dashboard?')) return null;
    const route = residentDashboardRoute(target.slice(target.indexOf('?')));
    return route.reportId ? residentDashboardUrl('reports', '', route.reportId) : null;
}
