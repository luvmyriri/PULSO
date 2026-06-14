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
import GovAnalyticsPage  from './pages/GovAnalyticsPage';
import PredictiveMaintenancePage from './pages/PredictiveMaintenancePage';
import PositionDashboard from './pages/PositionDashboard';
import DocumentRegistryPage from './pages/DocumentRegistryPage';
import GovernmentUserManagementPage from './pages/GovernmentUserManagementPage';
import ResidentAccountManagementPage from './pages/ResidentAccountManagementPage';
import ResetPassword     from './pages/ResetPassword';
import LanguageSwitcher  from './components/LanguageSwitcher';
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
import './index.css';

// Convenience wrappers so the JSX below stays readable
// Convenience wrappers so the JSX below stays readable
const AnyAuth    = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;
const GovOnly    = ({ children }) => <ProtectedRoute allowedRoles={GOV_ROLES}>{children}</ProtectedRoute>;
const ExecOnly   = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'admin', action: 'audit' }}>{children}</ProtectedRoute>;
const SeniorOnly = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'ops', action: 'manage' }}>{children}</ProtectedRoute>;
const InspOnly   = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'inspections', action: 'view' }}>{children}</ProtectedRoute>;
const FieldOnly  = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'reports', action: 'view' }}>{children}</ProtectedRoute>;
const ProcOnly   = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'procurement', action: 'view' }}>{children}</ProtectedRoute>;
const AdminOnly  = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'admin', action: 'manage' }}>{children}</ProtectedRoute>;
const DispatchOp = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'ops', action: 'manage' }}>{children}</ProtectedRoute>;
const OBOOnly    = ({ children }) => <ProtectedRoute requiredPermission={{ module: 'inspections', action: 'manage' }}>{children}</ProtectedRoute>;

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

                        {/* ── GOVERNMENT — UNIVERSAL LANDING ─────────────────── */}
                        {/*   Every gov role lands here on login                  */}
                        <Route path="/gov/my-dashboard" element={
                            <GovOnly><PositionDashboard /></GovOnly>
                        } />

                        {/* ── COMMAND CENTER (Dispatcher / Admin Clerk) ───────── */}
                        <Route path="/dispatcher" element={
                            <DispatchOp><DispatcherDashboard /></DispatchOp>
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
                            <GovOnly><GovDivisionPage /></GovOnly>
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

                        {/* Document Registry — all gov staff */}
                        <Route path="/gov/document-registry" element={
                            <GovOnly><DocumentRegistryPage /></GovOnly>
                        } />

                        {/* Incoming Citizen Reports - all gov staff can view triage */}
                        <Route path="/gov/reports" element={
                            <GovOnly><GovDivisionPage /></GovOnly>
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
                            <AdminOnly><GovernmentUserManagementPage /></AdminOnly>
                        } />

                        {/* Resident Account Management — admin + exec only */}
                        <Route path="/gov/residents" element={
                            <AdminOnly><ResidentAccountManagementPage /></AdminOnly>
                        } />

                        {/* System Settings — admin + exec only */}
                        <Route path="/gov/settings" element={
                            <AdminOnly><GovDivisionPage /></AdminOnly>
                        } />

                        {/* Analytics Intelligence Engine — admin + exec only */}
                        <Route path="/gov/analytics" element={
                            <AdminOnly><GovAnalyticsPage /></AdminOnly>
                        } />

                        {/* Predictive Maintenance Engine — all gov staff */}
                        <Route path="/gov/predictive" element={
                            <GovOnly>
                                <PredictiveMaintenancePage />
                            </GovOnly>
                        } />


                        {/* Agent App Download — all gov staff */}
                        <Route path="/gov/agent-app" element={
                            <GovOnly><GovDivisionPage /></GovOnly>
                        } />

                        {/* Tactical Advisories — all gov staff */}
                        <Route path="/gov/advisories" element={
                            <GovOnly><GovDivisionPage /></GovOnly>
                        } />

                        {/* ── 404 FALLBACK ────────────────────────────────────── */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ErrorBoundary>

                <LanguageSwitcher />
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
