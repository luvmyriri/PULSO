import { Link } from 'react-router-dom';
import { useGovernmentData } from '../../utils/governmentApi';

export default function GovModuleGate({ module, children }) {
    const access = useGovernmentData('/api/gov/navigation');
    if (access.loading || access.error) return <main className="gov-state" aria-busy={access.loading} role={access.error ? 'alert' : 'status'}><h1>{access.loading ? 'Checking access…' : 'Access could not be checked'}</h1>{access.error && <><p>{access.error}</p><button type="button" className="gov-button" onClick={access.reload}>Retry access check</button></>}</main>;
    if (!access.data?.modules?.includes(module)) return <main className="gov-state" role="alert"><h1>This section is unavailable for your account</h1><p>Your current permissions do not include this workspace.</p><Link className="gov-record-link" to="/gov/my-dashboard">Return to My Work</Link></main>;
    return children;
}
