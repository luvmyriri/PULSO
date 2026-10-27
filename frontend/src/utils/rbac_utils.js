import { adminAllows } from './adminAccess';
/**
 * rbac_utils.js
 * ──────────────────────────────────────────────────────────────────────
 * Client-side utilities for checking permissions based on granular RBAC.
 * Supports: public_works, permits, records, reports, pii_access, jurisdiction_lock
 */

const MODULE_MAPPING = {
    'admin': ['admin', 'ops'],
    'analytics': ['analytics', 'reports', 'public_works'],
    'records': ['records'],
    'reports': ['reports'],
    'permits': ['permits', 'inspections'],
    'inspections': ['inspections', 'permits'],
    'public_works': ['public_works'],
    'infrastructure': ['public_works'],
    'ops': ['ops', 'reports', 'dispatch', 'public_works'],
    'dispatch': ['dispatch', 'ops', 'reports'],
    'design': ['public_works'],
    'survey': ['public_works'],
    'obo': ['permits', 'inspections'],
    'procurement': ['procurement', 'public_works'],
};

const ROLE_EXECUTIVE = ['city_engineer', 'asst_city_engineer'];
const ROLE_ADMIN = ['system_admin', 'admin_clerk', 'admin_officer', 'records_officer'];
const ROLE_SENIOR = ['division_chief', 'division_chief_arch', 'division_chief_structural', 'division_chief_electrical', 'project_engineer', 'design_engineer', 'manager'];
const ROLE_STAFF = ['cad_operator', 'estimator', 'construction_foreman', 'field_worker', 'building_inspector', 'electrical_inspector', 'mechanical_inspector'];
const ROLE_INSPECTOR = ['building_inspector', 'electrical_inspector', 'mechanical_inspector'];
const ROLE_DESIGN = ['design_engineer', 'cad_operator', 'division_chief', 'division_chief_arch'];
const ROLE_SURVEY = ['project_engineer', 'estimator', 'construction_foreman', 'division_chief_structural'];
const ROLE_PROCUREMENT = ['project_engineer', 'admin_officer', 'estimator'];

const hasRole = (userRole, allowedRoles) => {
    if (!userRole) return false;
    if (allowedRoles.includes(userRole)) return true;
    if (userRole === 'system_admin' || userRole === 'city_engineer') return true;
    return false;
};

export const checkPermission = (user, rawModule, action) => {
    if (!user) return false;
    if (rawModule === 'admin') return adminAllows(user, action);
    
    const userRole = user.role;
    const capabilities = user.capabilities || {};
    
    if (userRole === 'system_admin' || userRole === 'city_engineer' || userRole === 'asst_city_engineer' || userRole === 'manager') return true;
    if (userRole === 'dispatcher' && (rawModule === 'ops' || rawModule === 'reports' || rawModule === 'dispatch')) return true;
    if (userRole === 'resident') {
        const residentAllowed = { 'reports': ['create', 'view'], 'profile': ['view', 'edit'] };
        return (residentAllowed[rawModule] || []).includes(action);
    }
    
    const modules = MODULE_MAPPING[rawModule] || [rawModule];
    
    for (const mod of modules) {
        const modCaps = capabilities[mod];
        
        if (modCaps === true) return true;
        if (modCaps && Array.isArray(modCaps)) {
            if (modCaps.includes('*') || modCaps.includes('all') || modCaps.includes(action)) {
                return true;
            }
        }
    }
    
    return false;
};

export const hasAnyPermission = (user, module, actions) => {
    return actions.some(action => checkPermission(user, module, action));
};

export const hasAllPermissions = (user, module, actions) => {
    return actions.every(action => checkPermission(user, module, action));
};

export const canAccessModule = (user, moduleName) => {
    const moduleRoleMap = {
        'records': [...ROLE_ADMIN],
        'projects': ['design_engineer', 'cad_operator', 'project_engineer', 'division_chief', 'division_chief_arch', 'division_chief_structural', 'division_chief_electrical', 'city_engineer', 'asst_city_engineer', 'system_admin'],
        'design-requests': ROLE_DESIGN,
        'analysis': ROLE_DESIGN,
        'surveys': ROLE_SURVEY,
        'boq': ROLE_SURVEY,
        'estimation': ROLE_SURVEY,
        'obo': [...ROLE_INSPECTOR, ...ROLE_EXECUTIVE, 'system_admin'],
        'permits': [...ROLE_INSPECTOR, ...ROLE_EXECUTIVE, 'system_admin'],
        'procurement': ROLE_PROCUREMENT,
        'gov-users': ['system_admin', 'city_engineer', 'asst_city_engineer', 'admin_officer'],
        'residents': ['system_admin', 'city_engineer', 'asst_city_engineer'],
        'audit-logs': ['system_admin', 'admin_officer', 'records_officer', 'city_engineer', 'asst_city_engineer'],
    };
    
    const allowedRoles = moduleRoleMap[moduleName];
    if (!allowedRoles) return true;
    return hasRole(user?.role, allowedRoles);
};

export const hasPIIAccess = (user) => {
    const capabilities = user?.capabilities || {};
    return capabilities.all === true || capabilities.pii_access === true;
};
