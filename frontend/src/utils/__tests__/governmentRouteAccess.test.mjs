import test from 'node:test';
import assert from 'node:assert/strict';
import { governmentRouteModule } from '../governmentRouteAccess.js';

test('direct government bookmarks map to the same sections as navigation', () => {
    const paths = {
        '/gov/reports': 'reports', '/gov/reports/12': 'reports', '/gov/map': 'reports',
        '/gov/work-orders': 'work-orders', '/gov/assets/road-1': 'assets',
        '/gov/projects': 'projects', '/gov/overview': 'overview', '/gov/administration': 'settings',
        '/gov/announcements/new': 'announcements', '/gov/records-workspace': 'records', '/field': 'field',
        '/gov/obo': 'obo', '/gov/financial-history': 'financial-history', '/gov/design-requests': 'projects',
    };
    for (const [path, module] of Object.entries(paths)) assert.equal(governmentRouteModule(path), module, path);
    assert.equal(governmentRouteModule('/gov/insights', '?view=predictive'), 'predictive');
    assert.equal(governmentRouteModule('/gov/insights', '?view=analytics'), 'analytics');
    assert.equal(governmentRouteModule('/gov/operations', '?view=work-orders'), 'work-orders');
    for (const path of ['/gov/my-dashboard', '/gov/account', '/dashboard', '/resident-home']) assert.equal(governmentRouteModule(path), null);
});
