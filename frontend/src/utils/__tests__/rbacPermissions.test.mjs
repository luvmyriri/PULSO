import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPermission } from '../rbac_utils.js';

test('explicit action restrictions override privileged role defaults and module aliases', () => {
    for (const role of ['system_admin', 'city_engineer', 'asst_city_engineer', 'manager', 'dispatcher']) {
        const user = { role, capabilities: { reports: ['view'], analytics: [], public_works: ['*'] } };
        assert.equal(checkPermission(user, 'reports', 'view'), true, role);
        assert.equal(checkPermission(user, 'reports', 'assign'), false, role);
        assert.equal(checkPermission(user, 'reports', 'reassign'), false, role);
        assert.equal(checkPermission(user, 'analytics', 'view'), false, role);
    }
    assert.equal(checkPermission({role:'admin_clerk', capabilities:{reports:['*']}}, 'reports', 'assign'), true);
    assert.equal(checkPermission({role:'city_engineer', capabilities:{reports:false}}, 'reports', 'view'), false);
});
