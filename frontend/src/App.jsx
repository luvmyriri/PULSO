import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

import GovLanding       from './pages/GovLanding';
import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import ResetPassword    from './pages/ResetPassword';
import ReportWizardPage from './pages/ReportWizardPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import PublicTrackPage  from './pages/PublicTrackPage';
import ResidentDashboard from './pages/ResidentDashboard';
import GovDivisionPage   from './pages/GovDivisionPage';
import PositionDashboard from './pages/PositionDashboard';
import ProjectsWorkspacePage from './pages/ProjectsWorkspacePage';
import OboInspectionsPage from './pages/OboInspectionsPage';
import DispatcherDashboard from './pages/DispatcherDashboard';
import GovProjectsPage   from './pages/GovProjectsPage';
import GovAnalyticsPage  from './pages/GovAnalyticsPage';
import GovReportsDashboard from './pages/GovReportsDashboard';
import GovBiDashboard      from './pages/GovBiDashboard';
import GovTodayPage        from './pages/GovTodayPage';
import CitizenReportsPage  from './pages/CitizenReportsPage';
import GovReportDetailPage from './pages/GovReportDetailPage';
import WorkOrdersPage      from './pages/WorkOrdersPage';
import GovAssetsPage       from './pages/GovAssetsPage';
import GovAssetDetailPage  from './pages/GovAssetDetailPage';
import GovAnnouncementsPage from './pages/GovAnnouncementsPage';
import GovAnnouncementEditor from './pages/GovAnnouncementEditor';
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
import { initAuthSession } from './utils/authSession';
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
const AdminOnly  = ({ children }) => <ProtectedRoute allowedRoles={[...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer', 'admin_officer']}>{children}</ProtectedRoute>;
const DispatchOp = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'dispatcher', ...SENIOR_ROLES, ...FIELD_ROLES]}>{children}</ProtectedRoute>;
const OBOOnly    = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'records_officer', ...INSPECTOR_ROLES]}>{children}</ProtectedRoute>;

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

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <ErrorBoundary>
                    <Routes>
                        {/* ── PUBLIC RESIDENT ROUTES ─────────────────────────── */}
                        <Route path="/"               element={<ResidentSurface><Landing /></ResidentSurface>} />
                        <Route path="/resident-home"  element={<ResidentSurface><Landing /></ResidentSurface>} />
                        <Route path="/report"         element={<ResidentSurface><ReportWizardPage /></ResidentSurface>} />
                        <Route path="/report/success" element={<ResidentSurface><ReportSuccessPage /></ResidentSurface>} />
                        <Route path="/track"          element={<ResidentSurface><PublicTrackPage /></ResidentSurface>} />
                        <Route path="/login"          element={<ResidentSurface><Login /></ResidentSurface>} />
                        <Route path="/register"       element={<ResidentSurface><Register /></ResidentSurface>} />
                        <Route path="/reset-password" element={<ResidentSurface><ResetPassword /></ResidentSurface>} />
                        <Route path="/gov"            element={<GovLanding />} />

                        {/* ── RESIDENT PORTAL ────────────────────────────────── */}
                        {/* Residents ONLY portal access */}
                        <Route path="/dashboard/*" element={
                            <ResidentOnly><ResidentSurface><ResidentDashboard /></ResidentSurface></ResidentOnly>
                        } />

                        {/* ── GOVERNMENT — UNIVERSAL LANDING (First navbar menu) ── */}
                        <Route path="/gov/dashboard" element={
                            <GovOnly><GovBiDashboard /></GovOnly>
                        } />
                        <Route path="/gov/my-dashboard" element={
                            <GovOnly><GovBiDashboard /></GovOnly>
                        } />
                        <Route path="/gov/today" element={
                            <GovOnly><GovTodayPage /></GovOnly>
                        } />

                        {/* Consolidated government workspaces */}
                        <Route path="/gov/operations" element={
                            <GovOnly><GovernmentWorkspaceRoute workspace="operations" /></GovOnly>
                        } />
                        <Route path="/gov/records-workspace" element={
                            <GovOnly><GovernmentWorkspaceRoute workspace="records" /></GovOnly>
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
                            <DispatchOp><DispatcherDashboard /></DispatchOp>
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

                        {/* Combined planning and delivery workspace */}
                        <Route path="/gov/delivery" element={
                            <GovOnly><ProjectsWorkspacePage /></GovOnly>
                        } />

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
                            <AdminOnly><Navigate to="/gov/administration?view=staff" replace /></AdminOnly>
                        } />

                        {/* Analytics Intelligence BI Engine — government staff & dispatchers */}
                        <Route path="/gov/analytics" element={
                            <GovOnly><GovAnalyticsPage /></GovOnly>
                        } />
                        <Route path="/gov/bi" element={
                            <GovOnly><GovBiDashboard /></GovOnly>
                        } />

                        {/* Predictive Maintenance Engine — all gov staff */}
                        <Route path="/gov/predictive" element={
                            <GovOnly><Navigate to="/gov/insights?view=predictive" replace /></GovOnly>
                        } />

                        {/* Tactical Advisories — all gov staff */}
                        <Route path="/gov/advisories" element={
                            <GovOnly><Navigate to="/gov/operations?view=updates" replace /></GovOnly>
                        } />

                        {/* ── 404 FALLBACK ────────────────────────────────────── */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ErrorBoundary>

                <ScrollToTop />
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
