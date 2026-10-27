import { Navigate } from 'react-router-dom';
import { useGovernmentData } from '../../utils/governmentApi';
import { GovWorkspace, GovState } from './GovWorkspace';

export default function GovModuleGate({ module, children }) {
    const access = useGovernmentData('/api/gov/navigation');
    if (access.loading || access.error) return <GovWorkspace title="Workspace"><GovState loading={access.loading} error={access.error} onRetry={access.reload}/></GovWorkspace>;
    if (!access.data?.modules?.includes(module)) return <Navigate to="/gov/dashboard" replace/>;
    return children;
}
