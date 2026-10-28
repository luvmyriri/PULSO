import GovNotificationDeliveryPage from './pages/GovNotificationDeliveryPage';
import GovFinancialHistoryPage from './pages/GovFinancialHistoryPage';
import GovAccountPage from './pages/GovAccountPage';
import GovAssistant from './components/government/GovAssistant';
import { GovAssistantProvider } from './components/government/GovAssistantHost';
import StaffPasswordPage from './pages/StaffPasswordPage';
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';

import GovLanding       from './pages/GovLanding';
import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import ResetPassword    from './pages/ResetPassword';
import ReportWizardPage from './pages/ReportWizardPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import PublicTrackPage  from './pages/PublicTrackPage';
import ResidentDashboard from './pages/ResidentDashboard';
import MobileAppTutorial from './components/mobile/MobileAppTutorial';
import DevAppPreviewPage from './pages/DevAppPreviewPage';
import GovDivisionPage   from './pages/GovDivisionPage';
import PositionDashboard from './pages/PositionDashboard';
import OboInspectionsPage from './pages/OboInspectionsPage';
import GovReportsMapPage from './pages/GovReportsMapPage';
import GovProjectsPage   from './pages/GovProjectsPage';
import GovAnalyticsPage  from './pages/GovAnalyticsPage';
import GovReportsDashboard from './pages/GovReportsDashboard';
import GovBiDashboard      from './pages/GovBiDashboard';
import GovTodayPage        from './pages/GovTodayPage';
import GovOverviewPage     from './pages/GovOverviewPage';
import GovModuleGate       from './components/government/GovModuleGate';
import CitizenReportsPage  from './pages/CitizenReportsPage';
import GovReportDetailPage from './pages/GovReportDetailPage';
import WorkOrdersPage      from './pages/WorkOrdersPage';
import GovAssetsPage       from './pages/GovAssetsPage';
import GovAssetDetailPage  from './pages/GovAssetDetailPage';
import GovAnnouncementsPage from './pages/GovAnnouncementsPage';
import GovAnnouncementEditor from './pages/GovAnnouncementEditor';
import PublicUpdatesPage from './pages/PublicUpdatesPage';
import GovernmentWorkspaceRoute from './pages/GovernmentWorkspaceRoute';
import ProtectedRoute, {
    GOV_ROLES,
    EXECUTIVE_ROLES,
    SENIOR_ROLES,
    INSPECTOR_ROLES,
    FIELD_ROLES,
    PROCUREMENT_ROLES,
    ADMIN_ONLY,
} from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { initAuthSession, getAuthToken, getAuthUser } from './utils/authSession';
import { isInstalledApp } from './utils/appContext';
import './index.css';
import './resident/evangelista.css';

// Purge any stale persistent credentials from localStorage
initAuthSession();

// Convenience wrappers so the JSX below stays readable
const AnyAuth    = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;
const GovOnly    = ({ children }) => <ProtectedRoute allowedRoles={GOV_ROLES}>{children}</ProtectedRoute>;
const ExecOnly   = ({ children }) => <ProtectedRoute allowedRoles={EXECUTIVE_ROLES}>{children}</ProtectedRoute>;
const SeniorOnly = ({ children }) => <ProtectedRoute allowedRoles={SENIOR_ROLES}>{children}</ProtectedRoute>;
const InspOnly   = ({ children }) => <ProtectedRoute allowedRoles={INSPECTOR_ROLES}>{children}</ProtectedRoute>;
const FieldOnly  = ({ children }) => <ProtectedRoute allowedRoles={FIELD_ROLES}>{children}</ProtectedRoute>;
const ProcOnly   = ({ children }) => <ProtectedRoute allowedRoles={PROCUREMENT_ROLES}>{children}</ProtectedRoute>;
const AdminOnly  = ({ children }) => <ProtectedRoute allowedRoles={null} requiredPermission={{module:'admin',action:'view'}}>{children}</ProtectedRoute>;
const DispatchOp = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'dispatcher', ...SENIOR_ROLES, ...FIELD_ROLES]}>{children}</ProtectedRoute>;
const OBOOnly    = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'records_officer', ...INSPECTOR_ROLES]}>{children}</ProtectedRoute>;

function DeliveryBookmark() {
    const [params]=useSearchParams();
    const next=new URLSearchParams(params);
    const view=next.get('view');
    if(['design','analysis'].includes(view)) next.set('view','planning');
    else if(view==='surveys') next.set('view','assessment');
    else if(['procurement','quantities','estimation'].includes(view)) return <Navigate to={`/gov/financial-history?${next}`} replace/>;
    else if(!['all','open','assessment','planning','waiting','for_review','completed','historical'].includes(view)) next.delete('view');
    next.delete('tab');
    return <Navigate to={`/gov/projects?${next}`} replace/>;
}

// Resident = non-gov account
const ResidentOnly = ({ children }) => (
    <ProtectedRoute allowedRoles={['resident']}>{children}</ProtectedRoute>
);
const ResidentSurface = ({ children }) => (
    <div className="evangelista-resident">
        {children}
        <ScrollToTop />
    </div>
);

function authenticatedDestination() {
    const token = getAuthToken();
    const user = getAuthUser();
    if (!token || !user) return null;
    try {
        const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
        if (!encoded) return null;
        const claims = JSON.parse(window.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
        if (!Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) return null;
    } catch {
        return null;
    }
    if (user.role === 'resident') return '/dashboard';
    return GOV_ROLES.includes(user.role) ? '/gov/my-dashboard' : '/gov/account';
}

function ResidentEntry() {
    const destination = authenticatedDestination();
    if (isInstalledApp() && destination) return <Navigate to={destination} replace />;
    return <Landing />;
}

function AuthEntry({ children }) {
    const destination = authenticatedDestination();
    if (destination) return <Navigate to={destination} replace />;
    return children;
}

function App() {
    useEffect(() => {
        // The first-HTML splash must leave even when an authenticated entry
        // redirects before Landing mounts.
        document.getElementById('pulso-initial-splash')?.remove();
    }, []);

    return (
        <ThemeProvider>
            <GoogleMapsProvider>
                <BrowserRouter>
                <ErrorBoundary>
                    <GovAssistantProvider>
                    <Routes>
                        {/* ── PUBLIC RESIDENT ROUTES ─────────────────────────── */}
                        <Route path="/"               element={<ResidentSurface><ResidentEntry /></ResidentSurface>} />
                        <Route path="/resident-home"  element={<ResidentSurface><Landing /></ResidentSurface>} />
                        <Route path="/tutorial"       element={<ResidentSurface><MobileAppTutorial replayMode={true} /></ResidentSurface>} />
                        <Route path="/report"         element={<ResidentSurface><ReportWizardPage /></ResidentSurface>} />
                        <Route path="/report/success" element={<ResidentSurface><ReportSuccessPage /></ResidentSurface>} />
                        <Route path="/track"          element={<ResidentSurface><PublicTrackPage /></ResidentSurface>} />
                        <Route path="/updates" element={<PublicUpdatesPage />} />
                        <Route path="/updates/:updateId" element={<PublicUpdatesPage />} />
                        <Route path="/login"          element={<AuthEntry><ResidentSurface><Login /></ResidentSurface></AuthEntry>} />
                        <Route path="/register"       element={<ResidentSurface><Register /></ResidentSurface>} />
                        <Route path="/reset-password" element={<ResidentSurface><ResetPassword /></ResidentSurface>} />
                        <Route path="/gov"            element={<AuthEntry><GovLanding /></AuthEntry>} />
                        <Route path="/gov/activate" element={<StaffPasswordPage />} />
                        <Route path="/gov/account" element={<ProtectedRoute governmentOnly><GovAccountPage /></ProtectedRoute>} />

                        {/* ── TEST-ONLY APP PREVIEW ─────────────────────────── */}
                        <Route path="/dev/app-preview" element={<DevAppPreviewPage />} />

                        {/* ── RESIDENT PORTAL ────────────────────────────────── */}
                        {/* Residents ONLY portal access */}
                        <Route path="/dashboard/*" element={
                            <ResidentOnly><ResidentSurface><ResidentDashboard /></ResidentSurface></ResidentOnly>
                        } />

                        {/* ── GOVERNMENT — UNIFIED MY WORK LANDING ── */}
                        <Route path="/gov/dashboard" element={
                            <GovOnly><GovTodayPage /></GovOnly>
                        } />
                        <Route path="/gov/my-dashboard" element={
                            <GovOnly><GovTodayPage /></GovOnly>
                        } />
                        <Route path="/gov/my-work" element={
                            <GovOnly><GovTodayPage /></GovOnly>
                        } />
                        <Route path="/gov/today" element={
                            <GovOnly><GovTodayPage /></GovOnly>
                        } />
                        <Route path="/gov/overview" element={
                            <GovOnly><GovOverviewPage /></GovOnly>
                        } />

                        {/* Consolidated government workspaces */}
                        <Route path="/gov/operations" element={
                            <GovOnly><GovernmentWorkspaceRoute workspace="operations" /></GovOnly>
                        } />
                        <Route path="/gov/records-workspace" element={
                            <GovOnly><GovModuleGate module="records"><GovernmentWorkspaceRoute workspace="records" /></GovModuleGate></GovOnly>
                        } />
                        <Route path="/gov/insights" element={
                            <GovOnly><GovernmentWorkspaceRoute workspace="insights" /></GovOnly>
                        } />
                        <Route path="/gov/administration" element={
                            <AdminOnly><GovernmentWorkspaceRoute workspace="administration" /></AdminOnly>
                        } />

                        {/* ── CITIZEN REPORTS & FULL DOCKET ────────────────────────── */}
                        <Route path="/gov/reports" element={
                            <GovOnly><GovReportsDashboard /></GovOnly>
                        } />
                        <Route path="/gov/reports/:reportId" element={
                            <GovOnly><GovReportDetailPage /></GovOnly>
                        } />
                        <Route path="/gov/citizen-reports" element={
                            <Navigate to="/gov/reports" replace />
                        } />

                        {/* ── COMMAND CENTER & GIS MAP ────────────────────────── */}
                        <Route path="/dispatcher" element={
                            <DispatchOp><Navigate to="/gov/operations?view=dispatch" replace /></DispatchOp>
                        } />
                        <Route path="/gov/map" element={
                            <GovOnly><GovReportsMapPage /></GovOnly>
                        } />
                        <Route path="/gov/position-queue" element={
                            <GovOnly><PositionDashboard /></GovOnly>
                        } />

                        {/* ── EXEC MANAGEMENT DASHBOARD ──────────────────────── */}
                        {/*   Senior roles + executive                            */}
                        <Route path="/management" element={
                            <SeniorOnly><Navigate to="/gov/insights?view=overview" replace /></SeniorOnly>
                        } />

                        {/* ── DIVISION SUB-PAGES ──────────────────────────────── */}

                        {/* Work Orders — all gov staff can view */}
                        <Route path="/gov/work-orders" element={
                            <GovOnly><WorkOrdersPage /></GovOnly>
                        } />

                        {/* Physical Infrastructure Assets Register */}
                        <Route path="/gov/assets" element={
                            <GovOnly><GovAssetsPage /></GovOnly>
                        } />
                        <Route path="/gov/assets/:assetId" element={
                            <GovOnly><GovAssetDetailPage /></GovOnly>
                        } />

                        <Route path="/gov/notification-deliveries" element={<GovOnly><GovNotificationDeliveryPage/></GovOnly>}/>
                        {/* Governed Updates & Announcements */}
                        <Route path="/gov/announcements" element={
                            <GovOnly><GovAnnouncementsPage /></GovOnly>
                        } />
                        <Route path="/gov/announcements/new" element={
                            <GovOnly><GovAnnouncementEditor /></GovOnly>
                        } />
                        <Route path="/gov/announcements/:announcementId/edit" element={
                            <GovOnly><GovAnnouncementEditor /></GovOnly>
                        } />

                        {/* Keep delivery bookmarks on the server-backed project registry. */}
                        <Route path="/gov/delivery" element={
                            <GovOnly><DeliveryBookmark /></GovOnly>
                        } />
                        <Route path="/gov/financial-history" element={<GovOnly><GovFinancialHistoryPage/></GovOnly>}/>

                        {/* Legacy planning links preserve bookmarks and open the matching workspace view */}
                        <Route path="/gov/projects" element={
                            <GovOnly><GovProjectsPage /></GovOnly>
                        } />

                        {/* Process Timeline — all gov staff */}
                        <Route path="/gov/timeline" element={
                            <GovOnly><Navigate to="/gov/records-workspace?view=timeline" replace /></GovOnly>
                        } />

                        {/* Audit Logs — senior roles only */}
                        <Route path="/gov/audit-logs" element={
                            <SeniorOnly><Navigate to="/gov/records-workspace?view=audit" replace /></SeniorOnly>
                        } />

                        {/* OBO Inspections — inspectors, clerks, records, exec */}
                        <Route path="/gov/obo" element={
                            <OBOOnly><OboInspectionsPage /></OBOOnly>
                        } />

                        {/* Procurement — proj engineers, estimators, admin, exec */}
                        <Route path="/gov/procurement" element={
                            <ProcOnly><Navigate to="/gov/delivery?view=procurement" replace /></ProcOnly>
                        } />

                        {/* Records — administrative division + exec */}
                        <Route path="/gov/records" element={
                            <ProtectedRoute allowedRoles={['admin_officer', 'admin_clerk', 'records_officer', ...EXECUTIVE_ROLES]}>
                                <Navigate to="/gov/records-workspace?view=registry" replace />
                            </ProtectedRoute>
                        } />

                        {/* Document Registry — all gov staff */}
                        <Route path="/gov/document-registry" element={
                            <GovOnly><Navigate to="/gov/records-workspace?view=documents" replace /></GovOnly>
                        } />


                        {/* Reports Archive — admin staff + exec */}
                        <Route path="/gov/reports-archive" element={
                            <SeniorOnly><Navigate to="/gov/operations?view=closed" replace /></SeniorOnly>
                        } />

                        {/* Design Requests — design division + exec */}
                        <Route path="/gov/design-requests" element={
                            <ProtectedRoute allowedRoles={['design_engineer', 'cad_operator', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <Navigate to="/gov/delivery?view=design" replace />
                            </ProtectedRoute>
                        } />

                        {/* Structural Analysis — design + exec */}
                        <Route path="/gov/analysis" element={
                            <ProtectedRoute allowedRoles={['design_engineer', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <Navigate to="/gov/delivery?view=analysis" replace />
                            </ProtectedRoute>
                        } />

                        {/* Field Surveys — survey/construction division + exec */}
                        <Route path="/gov/surveys" element={
                            <ProtectedRoute allowedRoles={['project_engineer', 'estimator', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <Navigate to="/gov/delivery?view=surveys" replace />
                            </ProtectedRoute>
                        } />

                        {/* Bill of Quantities — estimators, engineers, exec */}
                        <Route path="/gov/boq" element={
                            <ProcOnly><Navigate to="/gov/delivery?view=quantities" replace /></ProcOnly>
                        } />

                        {/* Cost Estimation — estimators, project engineers, exec */}
                        <Route path="/gov/estimation" element={
                            <ProtectedRoute allowedRoles={['estimator', 'project_engineer', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <Navigate to="/gov/delivery?view=estimation" replace />
                            </ProtectedRoute>
                        } />

                        {/* User / Role Management — admin + exec only */}
                        <Route path="/gov/users" element={
                            <AdminOnly><Navigate to="/gov/administration?view=staff" replace /></AdminOnly>
                        } />

                        {/* Resident Account Management — admin + exec only */}
                        <Route path="/gov/residents" element={
                            <AdminOnly><Navigate to="/gov/administration?view=residents" replace /></AdminOnly>
                        } />

                        {/* System Settings — admin + exec only */}
                        <Route path="/gov/settings" element={
                            <AdminOnly><Navigate to="/gov/administration?view=settings&tab=settings" replace /></AdminOnly>
                        } />

                        {/* Service Insights & Maintenance Review — all gov staff */}
                        <Route path="/gov/analytics" element={
                            <GovOnly><GovernmentWorkspaceRoute workspace="insights" /></GovOnly>
                        } />
                        <Route path="/gov/bi" element={
                            <GovOnly><Navigate to="/gov/insights?view=analytics&tab=analytics" replace /></GovOnly>
                        } />

                        {/* Predictive Maintenance Engine — all gov staff */}
                        <Route path="/gov/predictive" element={
                            <GovOnly><Navigate to="/gov/insights?view=predictive&tab=predictive" replace /></GovOnly>
                        } />

                        {/* Tactical Advisories — all gov staff */}
                        <Route path="/gov/advisories" element={
                            <GovOnly><Navigate to="/gov/announcements" replace /></GovOnly>
                        } />

                        {/* ── 404 FALLBACK ────────────────────────────────────── */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <GovAssistant />
                    </GovAssistantProvider>
                </ErrorBoundary>

                <ScrollToTop />
            </BrowserRouter>
        </GoogleMapsProvider>
    </ThemeProvider>
    );
}

export default App;
