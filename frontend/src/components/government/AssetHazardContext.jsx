import { useState } from 'react';
import { useGovernmentData } from '../../utils/governmentApi';
import { API_BASE_URL } from '../../utils/apiBase';
import { getAuthToken } from '../../utils/authSession';
import { GovButton, GovState, formatDate } from './GovWorkspace';

const LABELS = {
    rain_forecast_72h_mm: 'Forecast rainfall over 72 hours',
    regional_river_discharge_7d_peak_m3s: 'Regional river discharge peak over 7 days',
};

export default function AssetHazardContext({ assetId }) {
    const context = useGovernmentData(`/api/gov/predictive/production/assets/${encodeURIComponent(assetId)}/hazards`);
    const exposure = useGovernmentData(`/api/gov/predictive/production/assets/${encodeURIComponent(assetId)}/flood-exposure`);
    const testing = useGovernmentData(`/api/gov/predictive/testing/assets/${encodeURIComponent(assetId)}/weather`);
    const [exportError, setExportError] = useState('');
    async function exportCsv(suffix, filename, testingExport = false) {
        setExportError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/gov/predictive/${testingExport ? 'testing' : 'production'}/assets/${encodeURIComponent(assetId)}/${suffix}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (!response.ok) throw new Error('The source export is unavailable. Refresh the asset and try again.');
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = `PULSO_${assetId}_${filename}.csv`;
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (cause) { setExportError(cause.message); }
    }
    return <section aria-label="Weather and flood source context">
        <h3>Weather and flood context</h3>
        <p className="gov-note">Source forecasts support inspection planning. They do not confirm flooding at this asset or authorize a work order.</p>
        <GovState loading={testing.loading && !testing.data} error={testing.error} onRetry={testing.reload} />
        {testing.data?.mode === 'testing' && <>
            <h4>Testing forecast · {testing.data.registry_status === 'verified' ? 'verified registry location' : 'unverified registry location'}</h4>
            <p className="gov-note">{testing.data.limitation}</p>
            <ul className="gov-inline-list">{testing.data.signals.map(item => <li key={item.signal}>
                <strong>{LABELS[item.signal] || item.signal}</strong>
                {item.status === 'current' ? <><p>{Number(item.value).toLocaleString('en-PH', { maximumFractionDigits: 1 })} {item.unit} · {item.product}</p><small>Fetched {formatDate(item.fetched_at)} · forecast {formatDate(item.valid_from)} to {formatDate(item.valid_to)}</small><p className="gov-note">{item.limitation}</p></> : <p>{item.reason}</p>}
            </li>)}</ul>
            <p className="gov-note"><a href={testing.data.source_url} target="_blank" rel="noreferrer">{testing.data.attribution}</a> · area point {testing.data.requested_latitude}, {testing.data.requested_longitude} · refresh after {formatDate(testing.data.expires_at)}</p>
            <GovButton onClick={() => exportCsv('weather?export=true', 'Testing_Forecasts', true)}>Export testing forecasts CSV</GovButton>
            <details><summary>Hourly rainfall and daily river values</summary>{testing.data.signals.filter(item => item.series).map(item => <div key={item.signal}><h4>{LABELS[item.signal]}</h4><table><caption>{item.product} · {item.unit} · testing forecast</caption><thead><tr><th scope="col">Forecast time</th><th scope="col">Value ({item.unit})</th></tr></thead><tbody>{item.series.map(point => <tr key={point.at}><td>{formatDate(point.at)}</td><td>{Number(point.value).toLocaleString('en-PH', { maximumFractionDigits: 2 })}</td></tr>)}</tbody></table></div>)}</details>
        </>}
        {testing.data?.status === 'insufficient_location' && <p className="gov-note">Testing forecast: {testing.data.reason}</p>}
        {exportError && <p className="gov-error" role="alert">{exportError}</p>}
        <details><summary>Production forecasts and approved flood maps</summary>
        <GovState loading={context.loading && !context.data} error={context.error} onRetry={context.reload} />
        {context.data?.signals?.length > 0 && <GovButton onClick={() => exportCsv('hazards.csv', 'Forecast_Context')}>Export forecast CSV</GovButton>}
        {context.data?.status === 'insufficient_location' && <p>{context.data.reason}</p>}
        {context.data?.signals?.length > 0 && <ul className="gov-inline-list">{context.data.signals.map(item => <li key={item.signal}>
            <strong>{LABELS[item.signal] || item.signal}</strong> · {item.status === 'current' ? 'Current source snapshot' : item.status === 'stale' ? 'Stale source snapshot' : item.status === 'disabled' ? 'Source disabled' : 'Unavailable'}
            {item.value != null ? <><p>{Number(item.value).toLocaleString('en-PH', { maximumFractionDigits: 1 })} {item.unit} · {item.product}</p>
                <small>Fetched {formatDate(item.fetched_at)} · valid {formatDate(item.valid_from)} to {formatDate(item.valid_to)} · {item.source_resolution_km ? `approximately ${item.source_resolution_km} km grid` : 'grid resolution not recorded'}</small>
                <p className="gov-note">{item.limitation} <a href={item.documentation_url} target="_blank" rel="noreferrer">Source documentation</a></p></>
                : <p>{item.reason}</p>}
        </li>)}</ul>}
        <h4>Mapped flood exposure</h4>
        <p className="gov-note">UP NOAH return-period maps describe mapped flood hazard. They do not report a current flood or predict this asset’s failure.</p>
        <GovState loading={exposure.loading && !exposure.data} error={exposure.error} onRetry={exposure.reload} />
        {exposure.data?.status === 'available' ? <>
            <ul className="gov-inline-list">{exposure.data.scenarios.map(item => <li key={item.return_period_years}>
                <strong>{item.return_period_years}-year rainfall scenario:</strong> {item.classification === 'unclassified' ? 'Unclassified at this asset location' : `${item.classification} mapped hazard (class ${item.hazard_class})`}
            </li>)}</ul>
            <p className="gov-note">{exposure.data.limitation}</p>
            <p className="gov-note">Source: {exposure.data.attribution} · approved {formatDate(exposure.data.approved_at)}. <a href={exposure.data.source_url} target="_blank" rel="noreferrer">Dataset revision</a> · <a href={exposure.data.license_url} target="_blank" rel="noreferrer">License</a></p>
            <GovButton onClick={() => exportCsv('flood-exposure.csv', 'NOAH_Flood_Exposure')}>Export flood exposure CSV</GovButton>
        </> : exposure.data && <p className="gov-note">{exposure.data.reason || 'Approved mapped flood exposure is unavailable.'}</p>}
        </details>
    </section>;
}
