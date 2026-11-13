import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserMenu, { formatRoleLabel } from './UserMenu';
import { getAuthUser, clearAuthSession } from '../utils/authSession';
import { governmentRequest } from '../utils/governmentApi';
import ReviewerAvailability from './government/ReviewerAvailability';

/**
 * GovUserDropdown:
 * Government header user dropdown powered by the shared UserMenu component.
 * Mirrors the resident dropdown design: profile card at top, My Account, divider, and red Sign Out.
 * All redundant links (Today's Operations, Citizen Reports, Settings) are removed from the dropdown
 * and preserved in the primary left sidebar.
 */
export default function GovUserDropdown({ currentUser }) {
    const navigate = useNavigate();
    const user = currentUser || getAuthUser() || {};

    const userName = user.full_name || user.name || 'PULSO Staff';
    const rawRole = user.roleLabel || user.role_label || user.role || 'Staff Member';
    const friendlyRole = formatRoleLabel(rawRole);
    const avatarUrl = user.avatar_url || user.avatarUrl || user.avatarPhoto || null;
    const updatedAt = user.updated_at || user.updatedAt || null;

    const handleSignOut = async () => {
        try { await governmentRequest('/api/gov/report-review/availability/me/offline', { method: 'POST', signal: AbortSignal.timeout(2000) }); }
        catch { /* A failed sign-out notice cannot keep the presence lease fresh. */ }
        clearAuthSession();
        window.location.href = '/gov';
    };

    const handleAccountClick = () => {
        navigate('/gov/account');
    };

    const items = [
        {
            id: 'account',
            label: 'My Account',
            onClick: handleAccountClick,
        },
        {
            id: 'divider-signout',
            divider: true,
        },
        {
            id: 'signout',
            label: 'Sign Out',
            danger: true,
            isSignOut: true,
            onClick: handleSignOut,
        },
    ];

    return (<>
        <ReviewerAvailability userId={user.id} />
        <UserMenu
            name={userName}
            avatarUrl={avatarUrl}
            avatarUpdatedAt={updatedAt}
            subtitle={friendlyRole}
            items={items}
            showTriggerName={true}
            showConfirmation={true}
            align="right"
        />
    </>);
}
