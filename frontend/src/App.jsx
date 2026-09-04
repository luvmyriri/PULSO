import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';

import Landing           from './pages/Landing';
import GovLanding       from './pages/GovLanding';
import Login             from './pages/Login';
import Register          from './pages/Register';
import ResidentDashboard from './pages/ResidentDashboard';
import DispatcherDashboard from './pages/DispatcherDashboard';
import ManagementDashboard from './pages/ManagementDashboard';
import GovDivisionPage   from './pages/GovDivisionPage';
import GovProjectsPage   from './pages/GovProjectsPage';
import GovAnalyticsPage  from './pages/GovAnalyticsPage';
import PositionDashboard from './pages/PositionDashboard';
import GovReportsDashboard from './pages/GovReportsDashboard';
import GovBiDashboard      from './pages/GovBiDashboard';
import ResetPassword     from './pages/ResetPassword';
import ScrollToTop       from './components/ScrollToTop';
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
import { initAuthSession } from './utils/authSession';
import './index.css';

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
const AdminOnly  = ({ children }) => <ProtectedRoute allowedRoles={[...ADMIN_ONLY, 'city_engineer', 'asst_city_engineer']}>{children}</ProtectedRoute>;
const DispatchOp  = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'dispatcher', ...SENIOR_ROLES]}>{children}</ProtectedRoute>;
const OBOOnly    = ({ children }) => <ProtectedRoute allowedRoles={['admin_clerk', 'records_officer', ...INSPECTOR_ROLES]}>{children}</ProtectedRoute>;

// Resident = non-gov account
const ResidentOnly = ({ children }) => (
    <ProtectedRoute allowedRoles={['resident']}>{children}</ProtectedRoute>
);

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <ErrorBoundary>
                    <Routes>
                        {/* ── PUBLIC ─────────────────────────────────────────── */}
                        <Route path="/"         element={<Landing />} />
                        <Route path="/gov"      element={<GovLanding />} />
                        <Route path="/login"    element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* ── RESIDENT PORTAL ────────────────────────────────── */}
                        {/* Residents ONLY portal access */}
                        <Route path="/dashboard" element={
                            <ResidentOnly><ResidentDashboard /></ResidentOnly>
                        } />

                        {/* ── GOVERNMENT — UNIVERSAL LANDING (First navbar menu) ── */}
                        <Route path="/gov/dashboard" element={
                            <GovOnly><GovBiDashboard /></GovOnly>
                        } />
                        <Route path="/gov/my-dashboard" element={
                            <GovOnly><GovBiDashboard /></GovOnly>
                        } />

                        {/* ── CITIZEN REPORTS (Second navbar menu) ────────────────── */}
                        <Route path="/gov/reports" element={
                            <GovOnly><GovReportsDashboard /></GovOnly>
                        } />
                        <Route path="/gov/citizen-reports" element={
                            <Navigate to="/gov/reports" replace />
                        } />

                        {/* ── COMMAND CENTER & GIS MAP ────────────────────────── */}
                        <Route path="/dispatcher" element={
                            <DispatchOp><DispatcherDashboard /></DispatchOp>
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
                            <SeniorOnly><ManagementDashboard /></SeniorOnly>
                        } />

                        {/* ── DIVISION SUB-PAGES ──────────────────────────────── */}

                        {/* Work Orders — all gov staff can view */}
                        <Route path="/gov/work-orders" element={
                            <GovOnly><GovDivisionPage /></GovOnly>
                        } />

                        {/* LGU Projects — all gov staff can view */}
                        <Route path="/gov/projects" element={
                            <GovOnly><GovProjectsPage /></GovOnly>
                        } />

                        {/* Process Timeline — all gov staff */}
                        <Route path="/gov/timeline" element={
                            <GovOnly><GovDivisionPage /></GovOnly>
                        } />

                        {/* Audit Logs — senior roles only */}
                        <Route path="/gov/audit-logs" element={
                            <SeniorOnly><GovDivisionPage /></SeniorOnly>
                        } />

                        {/* OBO Inspections — inspectors, clerks, records, exec */}
                        <Route path="/gov/obo" element={
                            <OBOOnly><GovDivisionPage /></OBOOnly>
                        } />

                        {/* Procurement — proj engineers, estimators, admin, exec */}
                        <Route path="/gov/procurement" element={
                            <ProcOnly><GovDivisionPage /></ProcOnly>
                        } />

                        {/* Records — administrative division + exec */}
                        <Route path="/gov/records" element={
                            <ProtectedRoute allowedRoles={['admin_officer', 'admin_clerk', 'records_officer', ...EXECUTIVE_ROLES]}>
                                <GovDivisionPage />
                            </ProtectedRoute>
                        } />

                        {/* Reports Archive — admin staff + exec */}
                        <Route path="/gov/reports-archive" element={
                            <SeniorOnly><GovDivisionPage /></SeniorOnly>
                        } />

                        {/* Design Requests — design division + exec */}
                        <Route path="/gov/design-requests" element={
                            <ProtectedRoute allowedRoles={['design_engineer', 'cad_operator', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <GovDivisionPage />
                            </ProtectedRoute>
                        } />

                        {/* Structural Analysis — design + exec */}
                        <Route path="/gov/analysis" element={
                            <ProtectedRoute allowedRoles={['design_engineer', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <GovDivisionPage />
                            </ProtectedRoute>
                        } />

                        {/* Field Surveys — survey/construction division + exec */}
                        <Route path="/gov/surveys" element={
                            <ProtectedRoute allowedRoles={['project_engineer', 'estimator', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <GovDivisionPage />
                            </ProtectedRoute>
                        } />

                        {/* Bill of Quantities — estimators, engineers, exec */}
                        <Route path="/gov/boq" element={
                            <ProcOnly><GovDivisionPage /></ProcOnly>
                        } />

                        {/* Cost Estimation — estimators, project engineers, exec */}
                        <Route path="/gov/estimation" element={
                            <ProtectedRoute allowedRoles={['estimator', 'project_engineer', 'division_chief', ...EXECUTIVE_ROLES]}>
                                <GovDivisionPage />
                            </ProtectedRoute>
                        } />

                        {/* User / Role Management — admin + exec only */}
                        <Route path="/gov/users" element={
                            <AdminOnly><GovDivisionPage /></AdminOnly>
                        } />

                        {/* System Settings — admin + exec only */}
                        <Route path="/gov/settings" element={
                            <AdminOnly><GovDivisionPage /></AdminOnly>
                        } />

                        {/* Analytics Intelligence BI Engine — government staff & dispatchers */}
                        <Route path="/gov/analytics" element={
                            <GovOnly><GovAnalyticsPage /></GovOnly>
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
