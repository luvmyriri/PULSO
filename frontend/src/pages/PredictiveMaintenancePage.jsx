/**
 * PredictiveMaintenancePage.jsx
 * Page wrapper for the Predictive Maintenance Engine dashboard.
 * Provides the full gov portal layout: sidebar + main content.
 */

import React, { useState } from 'react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import PredictiveMaintenance from '../components/PredictiveMaintenance';

export default function PredictiveMaintenancePage({ workspace }) {
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user') || 'null'); } catch { return null; }
    });

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            <GovSidebar currentUser={currentUser} />
            <div className="flex-1 flex min-w-0 flex-col overflow-hidden">
                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <PredictiveMaintenance />
                </div>
            </div>
        </div>
    );
}
