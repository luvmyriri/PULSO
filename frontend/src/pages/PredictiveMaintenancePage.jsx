/**
 * PredictiveMaintenancePage.jsx
 * Page wrapper for the Predictive Maintenance Engine dashboard.
 * Provides the full gov portal layout: sidebar + main content.
 */

import React, { useState, useEffect } from 'react';
import GovSidebar from '../components/GovSidebar';
import PredictiveMaintenance from '../components/PredictiveMaintenance';

export default function PredictiveMaintenancePage() {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('pulso_user');
        if (stored) {
            try { setCurrentUser(JSON.parse(stored)); } catch {}
        }
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            <GovSidebar currentUser={currentUser} />
            <PredictiveMaintenance />
        </div>
    );
}
