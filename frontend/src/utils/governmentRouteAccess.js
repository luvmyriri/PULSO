/** Section access comes from /api/gov/navigation, including direct bookmarks. */
export function governmentRouteModule(pathname, search = '') {
    if (pathname === '/field' || pathname === '/gov/field') return 'field';
    if (!pathname.startsWith('/gov/')) return null;
    const route = pathname.slice(5).split('/')[0];
    const query = new URLSearchParams(search);
    if (['dashboard', 'my-dashboard', 'my-work', 'today', 'account'].includes(route)) return null;
    if (route === 'overview') return 'overview';
    if (route === 'operations') {
        const view = query.get('view') || query.get('tab');
        return view === 'work-orders' ? 'work-orders' : view === 'updates' ? 'announcements' : 'reports';
    }
    if (['reports', 'citizen-reports', 'reports-archive', 'map', 'position-queue'].includes(route)) return 'reports';
    if (route === 'work-orders') return 'work-orders';
    if (route === 'assets') return 'assets';
    if (route === 'projects' || route === 'delivery') return 'projects';
    if (route === 'obo') return 'obo';
    if (route === 'financial-history' || route === 'procurement') return 'financial-history';
    if (['design-requests', 'analysis', 'surveys', 'boq', 'estimation'].includes(route)) return 'projects';
    if (route === 'predictive') return 'predictive';
    if (route === 'insights') return (query.get('view') || query.get('tab')) === 'predictive' ? 'predictive' : 'analytics';
    if (['analytics', 'bi'].includes(route)) return 'analytics';
    if (['announcements', 'notification-deliveries', 'advisories'].includes(route)) return 'announcements';
    if (['administration', 'users', 'residents', 'settings'].includes(route)) return 'settings';
    if (['records-workspace', 'records', 'timeline', 'audit-logs', 'document-registry'].includes(route)) return 'records';
    return null;
}
