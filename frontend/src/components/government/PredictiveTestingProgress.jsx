import { useState } from 'react';
import { useGovernmentData } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import { GovButton, GovState, formatDate } from './GovWorkspace';

export default function PredictiveTestingProgress() {
    const progress = useGovernmentData('/api/gov/predictive/testing/progress');
    const [exportError, setExportError] = useState('');
    async function exportCsv() {
        setExportError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/predictive/testing/progress?export=true`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
            if (!response.ok) throw new Error('Progress could not be exported. Refresh and try again.');
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = 'PULSO_Testing_Data_Progress.csv';
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (cause) { setExportError(cause.message); }
    }
    return <section aria-label="Maintenance data progress">
        <h2>Maintenance data progress</h2>
        <p className="gov-note">Recorded assets, including unverified entries, are available for inspection planning below. Condition rankings use recorded condition and history; failure likelihoods require a validated model.</p>
        <GovState loading={progress.loading && !progress.data} error={progress.error} onRetry={progress.reload} />
        {progress.data && <details>
            <summary>{progress.data.metrics['Recorded assets']} recorded assets · {progress.data.metrics['Verified registry assets']} verified · {progress.data.weather_enabled ? 'Evaluation weather enabled' : 'Evaluation weather disabled'}</summary>
            <dl className="gov-facts">{Object.entries(progress.data.metrics).map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count}</dd></div>)}</dl>
            <p className="gov-note">Checked {formatDate(progress.data.checked_at)}. Record an inspection in Infrastructure, then request an independent review to build the outcome history used for model validation.</p>
            <GovButton onClick={exportCsv}>Export progress CSV</GovButton> <GovButton onClick={progress.reload} disabled={progress.loading}>Refresh progress</GovButton>
        </details>}
        {exportError && <p role="alert" className="gov-error">{exportError}</p>}
    </section>;
}
