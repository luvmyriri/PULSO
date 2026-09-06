/**
 * ProtectedRoute.jsx
 * ──────────────────────────────────────────────────────────────────────
 * Gate component for role-based access control on all frontend routes.
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['city_engineer', 'asst_city_engineer']}>
 *     <SomeAdminPage />
 *   </ProtectedRoute>
 *
 * Behavior:
 *   - Not logged in         → redirect to /login
 *   - Logged in, wrong role → show UnauthorizedPage
 *   - Logged in, right role → render children
 *
 * Pass allowedRoles={null} or omit it to allow ANY authenticated user.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldX, LogOut, ChevronLeft } from 'lucide-react';
import { checkPermission } from '../utils/rbac_utils';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/authSession';

// ─────────────────────────────────────────────────────────────────────────────
// Role groups (mirroring backend)
// ─────────────────────────────────────────────────────────────────────────────
export const GOV_ROLES = [
    'city_engineer', 'asst_city_engineer', 'admin_officer', 'admin_clerk',
    'records_officer', 'division_chief', 'design_engineer', 'estimator',
    'cad_operator', 'project_engineer', 'construction_foreman', 'field_worker',
    'building_inspector', 'electrical_inspector', 'mechanical_inspector',
    'dispatcher', 'manager', 'system_admin',
];

export const EXECUTIVE_ROLES = ['city_engineer', 'asst_city_engineer', 'manager', 'system_admin'];
export const SENIOR_ROLES    = ['city_engineer', 'asst_city_engineer', 'admin_officer', 'division_chief', 'manager', 'system_admin'];
export const INSPECTOR_ROLES = ['building_inspector', 'electrical_inspector', 'mechanical_inspector', ...EXECUTIVE_ROLES];
export const FIELD_ROLES     = ['project_engineer', 'construction_foreman', 'field_worker', 'dispatcher', ...SENIOR_ROLES];
export const PROCUREMENT_ROLES = ['project_engineer', 'admin_officer', 'estimator', ...EXECUTIVE_ROLES];
export const ADMIN_ONLY      = ['system_admin', 'manager'];

// ─────────────────────────────────────────────────────────────────────────────
// Unauthorized page
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
    city_engineer: 'City Engineer',
    asst_city_engineer: 'Assistant City Engineer',
    admin_officer: 'Administrative Officer V',
    admin_clerk: 'Administrative Clerk',
    records_officer: 'Records Officer',
    division_chief: 'Division Chief',
    design_engineer: 'Design Engineer',
    estimator: 'Estimator / QS',
    cad_operator: 'CAD Operator',
    project_engineer: 'Project Engineer',
    construction_foreman: 'Construction Foreman',
    field_worker: 'Field Worker',
    building_inspector: 'Building Inspector',
    electrical_inspector: 'Electrical Inspector',
    mechanical_inspector: 'Mechanical Inspector',
    dispatcher: 'Dispatcher',
    manager: 'Manager',
    system_admin: 'System Administrator',
    resident: 'Resident',
};

const UnauthorizedPage = ({ userRole, allowedRoles }) => {
    const handleSignOut = () => {
        const user = getAuthUser();
        const wasGov = user?.role && user.role !== 'resident';
        clearAuthSession();
        window.location.href = wasGov ? '/gov' : '/login';
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldX size={40} className="text-red-500" />
                </div>

                {/* Heading */}
                <div>
                    <h1 className="text-2xl font-black text-white mb-2">Access Restricted</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Your current role{' '}
                        <span className="inline-block px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs mx-1">
                            {ROLE_LABELS[userRole] || userRole}
                        </span>{' '}
                        does not have permission to view this page.
                    </p>
                </div>

                {/* Allowed roles hint */}
                {allowedRoles && allowedRoles.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Required Position</p>
                        <div className="flex flex-wrap gap-1.5">
                            {allowedRoles.map(r => (
                                <span
                                    key={r}
                                    className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold"
                                >
                                    {ROLE_LABELS[r] || r}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        <ChevronLeft size={16} /> Go Back
                    </button>
                    <a
                        href="/gov/my-dashboard"
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
                    >
                        My Dashboard
                    </a>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 rounded-xl font-bold text-sm transition-colors"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute gate
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles = null, requiredPermission = null }) => {
    const location = useLocation();

    // Read auth state
    const token = getAuthToken();
    const user = getAuthUser();

    // Not authenticated → to login or gov portal depending on allowedRoles
    if (!token || !user) {
        const isGovRoute = allowedRoles !== null && !allowedRoles.includes('resident');
        const redirectPath = isGovRoute ? '/gov' : '/login';
        return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    // Role check — if allowedRoles is null, any authenticated user is OK
    if (allowedRoles !== null && !allowedRoles.includes(user.role)) {
        return <UnauthorizedPage userRole={user.role} allowedRoles={allowedRoles} />;
    }

    // Dynamic Permission check
    if (requiredPermission && !checkPermission(user, requiredPermission.module, requiredPermission.action)) {
        return <UnauthorizedPage userRole={user.role} allowedRoles={null} />; // Or a specialized "No Capability" page
    }

    return children;
};

export default ProtectedRoute;
