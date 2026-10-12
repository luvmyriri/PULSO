import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserMenu, { formatRoleLabel } from './UserMenu';
import { getAuthUser, clearAuthSession } from '../utils/authSession';

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

    const handleSignOut = () => {
        clearAuthSession();
        window.location.href = '/gov';
    };

    const handleAccountClick = () => {
        navigate('/gov/administration?view=staff');
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

    return (
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
    );
}