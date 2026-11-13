import { adminAllows, ADMIN_VIEWS } from '../utils/adminAccess';
import {
    BarChart3,
    ClipboardCheck,
    FileArchive,
    FileClock,
    FileText,
    Gauge,
    History,
    Inbox,
    Map,
    Megaphone,
    Settings,
    ShieldCheck,
    Truck,
    UserCog,
    Users,
    Wrench,
    Bot,
} from 'lucide-react';
import { GOV_ROLES, EXECUTIVE_ROLES, SENIOR_ROLES, ADMIN_ONLY } from './ProtectedRoute';
import { checkPermission } from '../utils/rbac_utils';
import { governmentRouteModule } from '../utils/governmentRouteAccess';

const RECORD_ROLES = ['admin_officer', 'admin_clerk', 'records_officer', ...EXECUTIVE_ROLES];

export const GOVERNMENT_WORKSPACES = {
    operations: {
        label: 'Service operations',
        path: '/gov/operations',
        views: [
            { key: 'dispatch', label: 'Reports map', icon: Map, roles: GOV_ROLES },
            { key: 'reports', label: 'Reports Queue', icon: Inbox, roles: GOV_ROLES },
            { key: 'work-orders', label: 'Work Orders', icon: Wrench, roles: GOV_ROLES },
            { key: 'closed', label: 'Closed Reports', icon: ClipboardCheck, roles: GOV_ROLES },
            { key: 'updates', label: 'Public Updates', icon: Megaphone, roles: GOV_ROLES },
        ],
    },
    records: {
        label: 'Records and audit',
        path: '/gov/records-workspace',
        views: [
            { key: 'registry', label: 'Records Registry', icon: FileArchive, roles: GOV_ROLES },
            { key: 'documents', label: 'Documents', icon: FileText, roles: GOV_ROLES },
            { key: 'timeline', label: 'Timeline', icon: FileClock, roles: GOV_ROLES },
            { key: 'audit', label: 'Audit Trail', icon: History, roles: [...RECORD_ROLES, 'system_admin', 'city_engineer', 'asst_city_engineer'] },
        ],
    },
    insights: {
        label: 'Report analysis and maintenance',
        path: '/gov/insights',
        views: [
            { key: 'analytics', label: 'Report analysis', icon: BarChart3, roles: GOV_ROLES },
            { key: 'predictive', label: 'Predictive maintenance', icon: ShieldCheck, roles: GOV_ROLES },
        ],
    },
    administration: {
        label: 'Administration',
        path: '/gov/administration',
        views: [
            { key: 'staff', label: 'Staff', icon: UserCog, roles: [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer'] },
            { key: 'roles', label: 'Roles and permissions', icon: ShieldCheck, roles: [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer'] },
            { key: 'residents', label: 'Resident Accounts', icon: Users, roles: [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer'] },
            { key: 'settings', label: 'System Settings', icon: Settings, roles: [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer'] },
            { key: 'automated-ai', label: 'Automated & AI Tools', icon: Bot, roles: [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer'] },
            { key: 'audit', label: 'Activity log', icon: History },
        ],
    },
};

export function readGovernmentUser() {
    try {
        return JSON.parse(localStorage.getItem('pulso_user') || 'null');
    } catch {
        return null;
    }
}

export function getAvailableWorkspaceViews(workspace, currentUser, permittedModules = null) {
    const definition = GOVERNMENT_WORKSPACES[workspace];
    if (!definition) return [];

    const user = currentUser || readGovernmentUser();
    const role = user?.role;
    const isMasterAdmin = role === 'system_admin' || role === 'city_engineer' || role === 'asst_city_engineer';

    return definition.views.filter((view) => {
        if (permittedModules) {
            const module = governmentRouteModule(definition.path, `?view=${view.key}`);
            if (module && !permittedModules.includes(module)) return false;
        }
        if (workspace === 'administration') return adminAllows(user,ADMIN_VIEWS.find(item=>item.value===view.key)?.action||'unsupported');
        if (isMasterAdmin) return true;
        if (!permittedModules && view.roles && !view.roles.includes(role)) return false;
        if (view.permission && !checkPermission(user, view.permission[0], view.permission[1])) return false;
        return true;
    });
}
