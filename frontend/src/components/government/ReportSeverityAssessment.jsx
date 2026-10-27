import { ArrowRight, CalendarClock, FileText } from 'lucide-react';
import { SEVERITY_LEVELS, severityLabel } from '../../utils/reportSeverity';

export default function ReportSeverityAssessment({ grade, onGrade, revisit, onRevisit, reason, onReason, closed, currentGrade }) {
    const selected = SEVERITY_LEVELS.find(level => level.value === grade);
    return <div className="severity-assessment">
        <div className="severity-assessment-context"><span>Recorded grade</span><strong>{currentGrade ? `${currentGrade} · ${severityLabel(currentGrade)}` : 'Not assessed'}</strong></div>
        <div className="severity-assessment-direction"><span>P0 · Monitoring</span><ArrowRight size={16} /><span>P5 · Immediate response</span></div>
        <fieldset className="severity-levels"><legend>Choose the severity supported by the evidence</legend>{SEVERITY_LEVELS.map(level => <label key={level.value} className={`severity-level ${grade === level.value ? 'is-selected' : ''}`}><input type="radio" name="report-severity" required value={level.value} checked={grade === level.value} onChange={() => onGrade(level.value)} disabled={closed && level.value === 'P0'} /><span className="severity-level-code">{level.value}</span><span><strong>{level.label}</strong><small>{level.description}</small></span></label>)}</fieldset>
        <div className="severity-assessment-notes"><label className="gov-field"><span><FileText size={15} /> Assessment notes</span><textarea rows={3} required minLength={10} maxLength={2000} value={reason} onChange={e => onReason(e.target.value)} placeholder="Describe the observed damage, people or services affected, and the reason for this level." /></label><label className="gov-field"><span><CalendarClock size={15} /> {grade === 'P0' ? 'Monitoring review date' : 'Next review date (optional)'}</span><input type="datetime-local" required={grade === 'P0'} value={revisit} onChange={e => onRevisit(e.target.value)} /></label></div>
        {selected && <p className={`severity-selection-summary ${grade === 'P5' ? 'is-immediate' : ''}`} role="status"><strong>{selected.value} · {selected.label}.</strong> {grade === 'P0' ? 'A review owner and a future revisit date are required.' : grade === 'P5' ? 'Follow the established safety-response procedure. Saving this grade records the assessment; it does not dispatch a team.' : 'This assessment will be recorded with your name and decision time.'}</p>}
    </div>;
}
