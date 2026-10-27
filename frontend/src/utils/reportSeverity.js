export const SEVERITY_LEVELS = [
    { value: 'P0', label: 'Monitoring', description: 'Observe and revisit; no immediate intervention.' },
    { value: 'P1', label: 'Preventive work', description: 'Minor deterioration or planned preventive work.' },
    { value: 'P2', label: 'Standard repair', description: 'Routine repair without a verified active hazard.' },
    { value: 'P3', label: 'High priority', description: 'Significant local impact or a worsening defect.' },
    { value: 'P4', label: 'Severe hazard', description: 'Serious active hazard requiring urgent action.' },
    { value: 'P5', label: 'Immediate response', description: 'Immediate safety response and escalation required.' },
];
export const severityLabel = value => SEVERITY_LEVELS.find(level => level.value === value)?.label;
