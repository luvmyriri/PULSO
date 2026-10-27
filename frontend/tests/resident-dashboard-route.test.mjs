import assert from 'node:assert/strict';
import test from 'node:test';
import { residentDashboardRoute, residentDashboardUrl, residentNotificationTarget } from '../src/utils/residentDashboardRoute.js';

test('a report notification overrides the previously open Updates tab', () => {
    const target = residentNotificationTarget('/dashboard?tab=reports&reportId=340');
    assert.equal(residentDashboardRoute('?tab=updates').tab, 'updates');
    assert.deepEqual(residentDashboardRoute(target.split('?')[1]), { tab: 'reports', reportId: '340' });
    // Recover URLs previously overwritten by the old tab synchronization effect.
    assert.deepEqual(residentDashboardRoute('?tab=updates&reportId=340'), { tab: 'reports', reportId: '340' });
});

test('same-page notifications select different reports and tolerate query order', () => {
    assert.equal(residentNotificationTarget('/dashboard?reportId=341&tab=reports'), '/dashboard?tab=reports&reportId=341');
    assert.equal(residentDashboardRoute('?tab=reports&reportId=340').reportId, '340');
    assert.equal(residentDashboardRoute('?tab=reports&reportId=341').reportId, '341');
});

test('back to reports, another tab and Home remove the selected report', () => {
    const search = '?tab=reports&reportId=340';
    assert.equal(residentDashboardUrl('reports', search), '/dashboard?tab=reports');
    assert.equal(residentDashboardUrl('updates', search), '/dashboard?tab=updates');
    assert.equal(residentDashboardUrl('overview', search), '/dashboard');
});

test('opening a report preserves unrelated dashboard context', () => {
    assert.equal(residentDashboardUrl('reports', '?lang=tl&tab=updates', 340), '/dashboard?lang=tl&tab=reports&reportId=340');
});

test('untrusted notification destinations and invalid IDs cannot be followed', () => {
    for (const target of [null, '', 'https://example.invalid/dashboard?reportId=340', '//example.invalid', 'javascript:alert(1)', '/gov/reports', '/dashboard?reportId=-1', '/dashboard?reportId=0', '/dashboard?reportId=NaN', '/dashboard?reportId=9007199254740992']) {
        assert.equal(residentNotificationTarget(target), null, String(target));
    }
});

test('published city update notifications retain their own destination', () => {
    assert.equal(residentNotificationTarget('/updates/12'), '/updates/12');
});
