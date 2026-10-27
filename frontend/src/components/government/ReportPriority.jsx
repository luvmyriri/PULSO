import { severityLabel } from '../../utils/reportSeverity';
import './report-docket.css';
export default function ReportPriority({ grade, compact=false }) {
    const label=severityLabel(grade);
    return <span title={label?`${grade} · ${label}`:undefined} aria-label={label?`${grade} · ${label}`:'Not graded'} className={`report-priority ${['P5','P4'].includes(grade) ? 'is-severe' : grade === 'P3' ? 'is-high' : ''}`}>{label ? compact?grade:`${grade} · ${label}` : 'Not graded'}</span>;
}
