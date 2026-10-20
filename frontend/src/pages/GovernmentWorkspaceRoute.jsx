import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import GovReportsDashboard from './GovReportsDashboard';
import DispatcherDashboard from './DispatcherDashboard';
import GovAnalyticsPage from './GovAnalyticsPage';
import AdministrationWorkspacePage from './AdministrationWorkspacePage';
import PredictiveMaintenancePage from './PredictiveMaintenancePage';
import RecordsWorkspacePage from './RecordsWorkspacePage';
import WorkOrdersPage from './WorkOrdersPage';
import GovDivisionPage from './GovDivisionPage';
import GovSystemBanner from '../components/GovSystemBanner';
import {
    GOVERNMENT_WORKSPACES,
    getAvailableWorkspaceViews,
    readGovernmentUser,
} from '../components/governmentWorkspaceConfig';

const VIEW_COMPONENTS = {
    operations: {
        dispatch: DispatcherDashboard,
        reports: GovReportsDashboard,
        'work-orders': WorkOrdersPage,
        closed: () => <GovDivisionPage workspace="operations" activePathOverride="/gov/reports-archive" />,
        updates: () => <GovDivisionPage workspace="operations" activePathOverride="/gov/advisories" />,
    },
    records: {
        registry: RecordsWorkspacePage,
        documents: RecordsWorkspacePage,
        timeline: RecordsWorkspacePage,
        audit: RecordsWorkspacePage,
    },
    insights: {
        overview: GovAnalyticsPage,
        analytics: GovAnalyticsPage,
        predictive: PredictiveMaintenancePage,
    },
    administration: {
        staff: AdministrationWorkspacePage,
        residents: AdministrationWorkspacePage,
        settings: AdministrationWorkspacePage,
        'automated-ai': AdministrationWorkspacePage,
        agents: AdministrationWorkspacePage,
        'ai-tools': AdministrationWorkspacePage,
    },
};

export default function GovernmentWorkspaceRoute({ workspace }) {
    const location = useLocation();
    const currentUser = readGovernmentUser();
    const definition = GOVERNMENT_WORKSPACES[workspace];
    const availableViews = getAvailableWorkspaceViews(workspace, currentUser);
    const searchParams = new URLSearchParams(location.search);
    const rawRequested = searchParams.get('view') || searchParams.get('tab');
    const requestedView = (rawRequested === 'agents' || rawRequested === 'ai-tools') ? 'automated-ai' : rawRequested;
    const activeView = availableViews.find((view) => view.key === requestedView) || availableViews[0];

    if (!definition || !activeView) return <Navigate to="/gov/my-dashboard" replace />;
    if (requestedView !== activeView.key) {
        const nextParams = new URLSearchParams(location.search);
        nextParams.set('view', activeView.key);
        nextParams.set('tab', activeView.key);
        return <Navigate to={`${definition.path}?${nextParams.toString()}`} replace />;
    }

    const ActiveComponent = VIEW_COMPONENTS[workspace]?.[activeView.key];
    if (!ActiveComponent) return <Navigate to="/gov/my-dashboard" replace />;

    const isEmergency = Boolean(currentUser?.emergency_access_active);

    return (
        <div className="gov-workspace-route-container">
            {isEmergency && (
                <GovSystemBanner
                    type="emergency_access"
                />
            )}
            <GovSystemBanner autoOffline={true} />
            <ActiveComponent workspace={workspace} />
        </div>
    );
}
