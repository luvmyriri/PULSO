import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import assert from 'node:assert/strict';

const storage = () => ({ getItem: () => null, setItem() {}, removeItem() {} });
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    getSelection: () => ({ toString: () => '' }),
    innerWidth: 1440,
    location: { port: '', hostname: 'test.invalid', host: 'test.invalid', origin: 'https://test.invalid', pathname: '/gov/reports', search: '' }
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { default: GovSidebar } = await server.ssrLoadModule('/src/components/GovSidebar.jsx');
    const wrap = (element, entry = '/gov/reports') =>
        React.createElement(MemoryRouter, { initialEntries: [entry] }, element);

    // 1. Render GovSidebar and check the 4 groups and their labels
    const html = renderToStaticMarkup(wrap(React.createElement(GovSidebar, { responsive: false })));

    // Verify groups in order
    const groupWorkspaceIdx = html.indexOf('Workspace');
    const groupOperationsIdx = html.indexOf('Operations');
    const groupInsightIdx = html.indexOf('Insight');
    const groupPublicCommIdx = html.indexOf('Public Communication');

    assert.ok(groupWorkspaceIdx !== -1, 'Workspace group must exist');
    assert.ok(groupOperationsIdx !== -1, 'Operations group must exist');
    assert.ok(groupInsightIdx !== -1, 'Insight group must exist');
    assert.ok(groupPublicCommIdx !== -1, 'Public Communication group must exist');

    assert.ok(groupWorkspaceIdx < groupOperationsIdx, 'Workspace must precede Operations');
    assert.ok(groupOperationsIdx < groupInsightIdx, 'Operations must precede Insight');
    assert.ok(groupInsightIdx < groupPublicCommIdx, 'Insight must precede Public Communication');

    // Verify exact labels and capitalization
    assert.match(html, />Dashboard<\/span>/, 'Dashboard label must exist with exact casing');
    assert.match(html, />My Work<\/span>/, 'My Work label must exist with exact casing');
    assert.match(html, />Reports<\/span>/, 'Reports label must exist with exact casing');
    assert.match(html, />Work Orders<\/span>/, 'Work Orders label must exist with exact casing');
    assert.match(html, />Infrastructure<\/span>/, 'Infrastructure label must exist with exact casing');
    assert.match(html, />Records<\/span>/, 'Records label must exist with exact casing');
    assert.match(html, />Report Analysis<\/span>/, 'Report Analysis label must exist with exact casing');
    assert.match(html, />Predictive Maintenance<\/span>/, 'Predictive Maintenance label must exist with exact casing');
    assert.match(html, />Updates<\/span>/, 'Updates label must exist with exact casing');

    // Verify routes
    assert.match(html, /href="\/gov\/overview"/, 'Dashboard route must be /gov/overview');
    assert.match(html, /href="\/gov\/dashboard"/, 'My Work route must be /gov/dashboard');
    assert.match(html, /href="\/gov\/reports"/, 'Reports route must be /gov/reports');
    assert.match(html, /href="\/gov\/work-orders"/, 'Work Orders route must be /gov/work-orders');
    assert.match(html, /href="\/gov\/assets"/, 'Infrastructure route must be /gov/assets');
    assert.match(html, /href="\/gov\/records-workspace\?view=registry&amp;tab=registry"/, 'Records route must be /gov/records-workspace?view=registry&tab=registry');
    assert.match(html, /href="\/gov\/insights\?view=analytics&amp;tab=analytics"/, 'Report Analysis route must be /gov/insights?view=analytics&tab=analytics');
    assert.match(html, /href="\/gov\/insights\?view=predictive"/, 'Predictive Maintenance route must be /gov/insights?view=predictive');
    assert.match(html, /href="\/gov\/announcements"/, 'Updates route must be /gov/announcements');

    // Verify active link selection when on /gov/reports
    assert.match(html, /class="[^"]*gov-sidebar-selected[^"]*"[^>]*href="\/gov\/reports"/, 'Active link must have gov-sidebar-selected class');

    // Verify active link selection when on /gov/dashboard
    const htmlDash = renderToStaticMarkup(wrap(React.createElement(GovSidebar, { responsive: false }), '/gov/dashboard'));
    assert.match(htmlDash, /class="[^"]*gov-sidebar-selected[^"]*"[^>]*href="\/gov\/dashboard"/, 'My Work must be active on /gov/dashboard');

    // Verify active link selection when on /gov/overview
    const htmlOverview = renderToStaticMarkup(wrap(React.createElement(GovSidebar, { responsive: false }), '/gov/overview'));
    assert.match(htmlOverview, /class="[^"]*gov-sidebar-selected[^"]*"[^>]*href="\/gov\/overview"/, 'Dashboard must be active on /gov/overview');

    // Verify active link selection when on /gov/insights?view=predictive
    const htmlPred = renderToStaticMarkup(wrap(React.createElement(GovSidebar, { responsive: false }), '/gov/insights?view=predictive'));
    assert.match(htmlPred, /class="[^"]*gov-sidebar-selected[^"]*"[^>]*href="\/gov\/insights\?view=predictive"/, 'Predictive Maintenance must be active on /gov/insights?view=predictive');

    console.log('✅ All GovSidebar group, route, label, order, and active state assertions passed!');
} finally {
    await server.close();
}
