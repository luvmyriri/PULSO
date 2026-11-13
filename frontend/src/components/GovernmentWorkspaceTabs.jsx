import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    GOVERNMENT_WORKSPACES,
    getAvailableWorkspaceViews,
    readGovernmentUser,
} from './governmentWorkspaceConfig';
import './government-workspace-tabs.css';
import { useGovernmentData } from '../utils/governmentApi';

export default function GovernmentWorkspaceTabs({ workspace, currentUser, onViewChange }) {
    const location = useLocation();
    const access = useGovernmentData('/api/gov/navigation');
    const definition = GOVERNMENT_WORKSPACES[workspace];
    const availableViews = getAvailableWorkspaceViews(workspace, currentUser || readGovernmentUser(), access.data?.modules || []);
    const requestedView = new URLSearchParams(location.search).get('view');
    const activeView = availableViews.find((view) => view.key === requestedView) || availableViews[0];

    if (!definition || !activeView) return null;

    return (
        <nav className="government-workspace-tabs" aria-label={`${definition.label} functions`}>
            <div className="government-workspace-tabs__rail">
                {availableViews.map((view) => {
                    const Icon = view.icon;
                    const isActive = view.key === activeView.key;
                    return (
                        <Link
                            key={view.key}
                            to={`${definition.path}?view=${view.key}`}
                            className={`government-workspace-tab${isActive ? ' is-active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => onViewChange?.(view.key)}
                        >
                            <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                            <span>{view.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
