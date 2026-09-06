/**
 * Government navigation shared by every staff workspace.
 *
 * The sidebar mirrors the route guards in App.jsx for discoverability only.
 * Backend authorization remains the source of truth for every route and action.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Activity,
    BarChart3,
    Bell,
    ChevronDown,
    ClipboardCheck,
    FileArchive,
    FileClock,
    FileText,
    FolderKanban,
    History,
    Home,
    Inbox,
    LogOut,
    Map,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    ShieldCheck,
    Smartphone,
    UserCog,
    Users,
    Wrench,
    X,
} from 'lucide-react';
import { GOV_ROLES, SENIOR_ROLES, ADMIN_ONLY } from './ProtectedRoute';
import { checkPermission } from '../utils/rbac_utils';
import NotificationCenter from './NotificationCenter';
import './gov-sidebar.css';

const ROLE_LABELS = {
    city_engineer: 'City Engineer',
    asst_city_engineer: 'Assistant City Engineer',
    admin_officer: 'Administrative Officer V',
    admin_clerk: 'Administrative Clerk',
    records_officer: 'Records Officer',
    division_chief: 'Division Chief',
    division_chief_arch: 'Architectural Division Chief',
    division_chief_structural: 'Structural Division Chief',
    division_chief_electrical: 'Electrical Division Chief',
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
};

const hasRole = (user, roles) => Boolean(user?.role && roles.includes(user.role));
const hasPermission = (user, module, action) => checkPermission(user, module, action);

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('pulso_user') || 'null');
    } catch {
        return null;
    }
}

function buildNavigation(user) {
    const isGovernmentUser = hasRole(user, GOV_ROLES);
    const canManageAdmin = hasRole(user, [...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer']) || hasPermission(user, 'admin', 'manage');
    const isSenior = hasRole(user, [...SENIOR_ROLES, 'city_engineer', 'asst_city_engineer']);

    return [
        {
            label: 'My work',
            items: [
                { key: 'my-work', label: 'My work', to: '/gov/my-dashboard', icon: Home, show: isGovernmentUser },
            ],
        },
        {
            label: 'Operations & Map',
            items: [
                {
                    key: 'dispatch-map',
                    label: 'Command Center (Map)',
                    to: '/gov/operations?view=dispatch',
                    icon: Map,
                    show: isGovernmentUser,
                },
                {
                    key: 'reports-queue',
                    label: 'Reports Queue',
                    to: '/gov/operations?view=reports',
                    icon: Inbox,
                    show: isGovernmentUser,
                },
                {
                    key: 'work-orders',
                    label: 'Work Orders',
                    to: '/gov/operations?view=work-orders',
                    icon: Wrench,
                    show: isGovernmentUser,
                },
                {
                    key: 'closed-reports',
                    label: 'Closed Reports',
                    to: '/gov/operations?view=closed',
                    icon: ClipboardCheck,
                    show: isGovernmentUser,
                },
            ],
        },
        {
            label: 'Planning and delivery',
            items: [
                {
                    key: 'projects-delivery',
                    label: 'Projects and delivery',
                    to: '/gov/delivery',
                    icon: FolderKanban,
                    show: isGovernmentUser,
                },
                {
                    key: 'inspections-permits',
                    label: 'Inspections and permits',
                    to: '/gov/obo',
                    icon: ShieldCheck,
                    show: isGovernmentUser,
                },
            ],
        },
        {
            label: 'Records & Registry',
            items: [
                {
                    key: 'records-registry',
                    label: 'Records Registry',
                    to: '/gov/records-workspace?view=registry',
                    icon: FileArchive,
                    show: isGovernmentUser,
                },
                {
                    key: 'records-documents',
                    label: 'Document Vault',
                    to: '/gov/records-workspace?view=documents',
                    icon: FileText,
                    show: isGovernmentUser,
                },
                {
                    key: 'records-timeline',
                    label: 'Process Timeline',
                    to: '/gov/records-workspace?view=timeline',
                    icon: FileClock,
                    show: isGovernmentUser,
                },
                {
                    key: 'records-audit',
                    label: 'Audit Trail',
                    to: '/gov/records-workspace?view=audit',
                    icon: History,
                    show: isSenior || canManageAdmin,
                },
            ],
        },
        {
            label: 'Insights & GIS',
            items: [
                {
                    key: 'insights-heatmap',
                    label: 'Analytics & GIS Heatmap',
                    to: '/gov/insights?view=analytics',
                    icon: Activity,
                    show: isGovernmentUser,
                },
                {
                    key: 'insights-predictive',
                    label: 'Predictive Maintenance',
                    to: '/gov/insights?view=predictive',
                    icon: ShieldCheck,
                    show: isGovernmentUser,
                },
            ],
        },
        {
            label: 'Administration',
            items: [
                {
                    key: 'admin-staff',
                    label: 'Staff & Roles',
                    to: '/gov/administration?view=staff',
                    icon: UserCog,
                    show: canManageAdmin,
                },
                {
                    key: 'admin-residents',
                    label: 'Resident Accounts',
                    to: '/gov/administration?view=residents',
                    icon: Users,
                    show: canManageAdmin,
                },
                {
                    key: 'admin-settings',
                    label: 'System Settings',
                    to: '/gov/administration?view=settings',
                    icon: Settings,
                    show: canManageAdmin,
                },
            ],
        },
    ]
        .map((section) => ({
            ...section,
            items: section.items
                .filter((item) => item.show)
                .map((item) => ({
                    ...item,
                    children: item.children?.filter((child) => child.show) || [],
                })),
        }))
        .filter((section) => section.items.length > 0);
}

function initialsFor(user) {
    const value = user?.full_name || 'LGU Staff';
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

const routeMatches = (location, target) => {
    if (!target) return false;
    const currentFull = `${location.pathname}${location.search}`;
    if (target.includes('?')) {
        return currentFull === target || currentFull.startsWith(`${target}&`);
    }
    if (location.pathname === target) {
        return !location.search || location.pathname.startsWith(`${target}/`);
    }
    return location.pathname.startsWith(`${target}/`);
};

const GovNavItem = ({ item, expanded, onNavigate, onToggle }) => {
    const location = useLocation();
    const Icon = item.icon;
    const isActive = routeMatches(location, item.to);
    const activeChild = item.children?.some((child) => routeMatches(location.pathname, child.to));
    const hasChildren = item.children?.length > 0;
    const childRegionId = `gov-nav-children-${item.key}`;

    return (
        <div className={`gov-nav-workspace${activeChild ? ' has-active-child' : ''}`}>
            <div className="gov-nav-item-row">
                <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={`gov-nav-item${isActive ? ' is-active' : ''}${activeChild ? ' is-current-group' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.label}
                >
                    <span className="gov-nav-item__marker" aria-hidden="true" />
                    <Icon className="gov-nav-item__icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                    <span className="gov-nav-item__label">{item.label}</span>
                    <span className="gov-nav-item__tooltip" role="tooltip">{item.label}</span>
                </Link>
                {hasChildren && (
                    <button
                        type="button"
                        className="gov-nav-item__toggle"
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${item.label} sections`}
                        aria-expanded={expanded}
                        aria-controls={childRegionId}
                        onClick={onToggle}
                    >
                        <ChevronDown size={15} aria-hidden="true" />
                    </button>
                )}
            </div>
            {hasChildren && (
                <div id={childRegionId} className={`gov-nav-children${expanded ? ' is-open' : ''}`} hidden={!expanded}>
                    {item.children.map((child) => {
                        const childActive = routeMatches(location.pathname, child.to);
                        return (
                            <Link
                                key={child.to}
                                to={child.to}
                                onClick={onNavigate}
                                className={`gov-nav-child${childActive ? ' is-active' : ''}`}
                                aria-current={childActive ? 'page' : undefined}
                            >
                                <span className="gov-nav-child__notch" aria-hidden="true" />
                                <span>{child.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const GovSidebar = ({ currentUser }) => {
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const sidebarRef = useRef(null);
    const triggerRef = useRef(null);
    const closeRef = useRef(null);
    const storedUser = useMemo(() => getStoredUser(), []);
    const user = currentUser || storedUser;
    const navigation = useMemo(() => buildNavigation(user), [user]);
    const location = useLocation();
    const [compactNavigation, setCompactNavigation] = useState(() => {
        try {
            return localStorage.getItem('pulso_gov_navigation_compact') === 'true';
        } catch {
            return false;
        }
    });
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const toggleCompactNavigation = () => {
        setCompactNavigation((current) => {
            const next = !current;
            try {
                localStorage.setItem('pulso_gov_navigation_compact', String(next));
            } catch {
                // The navigation still works when preference storage is unavailable.
            }
            return next;
        });
    };

    useEffect(() => {
        const closeOnHistoryNavigation = () => setDrawerOpen(false);
        window.addEventListener('popstate', closeOnHistoryNavigation);
        return () => window.removeEventListener('popstate', closeOnHistoryNavigation);
    }, []);

    useEffect(() => {
        const node = sidebarRef.current;
        const storedPosition = sessionStorage.getItem('pulso_gov_navigation_scroll');
        if (node && storedPosition) node.scrollTop = Number(storedPosition);

        const retainScroll = () => {
            if (node) sessionStorage.setItem('pulso_gov_navigation_scroll', String(node.scrollTop));
        };

        node?.addEventListener('scroll', retainScroll, { passive: true });
        return () => node?.removeEventListener('scroll', retainScroll);
    }, []);

    useEffect(() => {
        if (!drawerOpen) return undefined;

        const priorOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDrawerOpen(false);
                triggerRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = priorOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [drawerOpen]);

    const closeDrawer = () => setDrawerOpen(false);

    const handleSignOut = () => {
        localStorage.removeItem('pulso_token');
        localStorage.removeItem('pulso_user');
        navigate('/gov');
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="gov-mobile-nav-trigger"
                aria-label="Open government navigation"
                aria-expanded={drawerOpen}
                aria-controls="government-navigation"
                onClick={() => setDrawerOpen(true)}
            >
                <Menu size={20} aria-hidden="true" />
            </button>

            <button
                type="button"
                className={`gov-sidebar-backdrop${drawerOpen ? ' is-open' : ''}`}
                onClick={closeDrawer}
                aria-label="Close government navigation"
                tabIndex={drawerOpen ? 0 : -1}
            />

            <aside
                id="government-navigation"
                className={`gov-sidebar${drawerOpen ? ' is-open' : ''}${compactNavigation ? ' is-collapsed' : ''}`}
                aria-label="Government workspace navigation"
            >
                <div className="gov-sidebar__brand-row">
                    <Link to="/gov/my-dashboard" className="gov-sidebar__brand" onClick={closeDrawer} aria-label="PULSO government home">
                        <span className="gov-sidebar__brand-word">PULSO</span>
                        <span className="gov-sidebar__brand-context">Government</span>
                    </Link>
                    <button
                        type="button"
                        className="gov-sidebar__collapse"
                        onClick={toggleCompactNavigation}
                        aria-label={compactNavigation ? 'Expand government navigation' : 'Collapse government navigation'}
                        aria-pressed={compactNavigation}
                        title={compactNavigation ? 'Expand navigation' : 'Collapse navigation'}
                    >
                        {compactNavigation
                            ? <PanelLeftOpen size={17} aria-hidden="true" />
                            : <PanelLeftClose size={17} aria-hidden="true" />}
                    </button>
                    <button
                        ref={closeRef}
                        type="button"
                        className="gov-sidebar__close"
                        onClick={() => {
                            closeDrawer();
                            triggerRef.current?.focus();
                        }}
                        aria-label="Close government navigation"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <nav ref={sidebarRef} className="gov-sidebar__scroll" aria-label="Government modules">
                    {navigation.map((section) => (
                        <section className="gov-nav-section" key={section.label} aria-labelledby={`gov-nav-${section.label.replace(/\s+/g, '-').toLowerCase()}`}>
                            <h2 id={`gov-nav-${section.label.replace(/\s+/g, '-').toLowerCase()}`} className="gov-nav-section__label">
                                {section.label}
                            </h2>
                            <div className="gov-nav-section__items">
                                {section.items.map((item) => {
                                    const containsActiveRoute = item.children?.some((child) => routeMatches(location.pathname, child.to));
                                    const itemExpanded = expandedGroup === item.key || (expandedGroup === null && containsActiveRoute);

                                    return (
                                        <GovNavItem
                                            key={item.key}
                                            item={item}
                                            expanded={itemExpanded}
                                            onToggle={() => setExpandedGroup(itemExpanded ? false : item.key)}
                                            onNavigate={closeDrawer}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </nav>

                <div className="gov-sidebar__footer">
                    <button
                        type="button"
                        className="gov-nav-item gov-nav-item--utility"
                        onClick={() => setNotificationsOpen(true)}
                        title="Notifications"
                    >
                        <Bell className="gov-nav-item__icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                        <span className="gov-nav-item__label">Notifications</span>
                        <span className="gov-nav-item__tooltip" role="tooltip">Notifications</span>
                    </button>
                    <Link to="/gov/agent-app" className="gov-nav-item gov-nav-item--utility" onClick={closeDrawer} title="Field app and downloads">
                        <Smartphone className="gov-nav-item__icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                        <span className="gov-nav-item__label">Field app and downloads</span>
                        <span className="gov-nav-item__tooltip" role="tooltip">Field app and downloads</span>
                    </Link>
                    <button type="button" className="gov-nav-item gov-nav-item--utility" onClick={handleSignOut} title="Log out">
                        <LogOut className="gov-nav-item__icon" size={17} strokeWidth={1.8} aria-hidden="true" />
                        <span className="gov-nav-item__label">Log out</span>
                        <span className="gov-nav-item__tooltip" role="tooltip">Log out</span>
                    </button>

                    <div className="gov-sidebar__identity" title={`${user?.full_name || 'LGU Staff'} — ${ROLE_LABELS[user?.role] || user?.role || 'Government staff'}`}>
                        <span className="gov-sidebar__avatar" aria-hidden="true">{initialsFor(user)}</span>
                        <span className="gov-sidebar__identity-copy">
                            <strong>{user?.full_name || 'LGU Staff'}</strong>
                            <span>{ROLE_LABELS[user?.role] || user?.role || 'Government staff'}</span>
                        </span>
                    </div>
                </div>
            </aside>

            <NotificationCenter
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
            />
        </>
    );
};

export default GovSidebar;
