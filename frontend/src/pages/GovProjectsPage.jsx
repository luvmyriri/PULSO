import React from 'react';
import { useNavigate } from 'react-router-dom';
import LguProjectsView from '../components/gov/LguProjectsView';
import { getAuthToken, getAuthUser } from '../utils/authSession';

export default function GovProjectsPage() {
    const navigate = useNavigate();
    const token = getAuthToken();
    const currentUser = getAuthUser();

    return (
        <LguProjectsView
            currentUser={currentUser}
            token={token}
            onNavigate={(path) => navigate(path)}
        />
    );
}
