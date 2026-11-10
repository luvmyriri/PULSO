import { useId } from 'react';
import { Check } from 'lucide-react';
import './resident-checkbox.css';

export default function ResidentCheckbox({ label, description, checked, disabled, onChange }) {
  const id = useId();
  return <label className="resident-checkbox">
    <span className="resident-checkbox__text">
      <span id={`${id}-label`} className="resident-checkbox__label">{label}</span>
      {description && <small id={`${id}-description`}>{description}</small>}
    </span>
    <span className="resident-checkbox__control">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange}
        aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} />
      <Check size={18} strokeWidth={3} aria-hidden="true" />
    </span>
  </label>;
}
