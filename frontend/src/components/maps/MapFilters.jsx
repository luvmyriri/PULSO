import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { GovButton } from '../government/GovWorkspace';

function Choices({ label, value, options, onChange, searchable = false }) {
    const [search, setSearch] = useState('');
    const visible = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    return <fieldset className="map-filter-choices"><legend>{label}</legend>{searchable && <label className="map-filter-search"><Search size={14} /><input aria-label={`Search ${label.toLowerCase()}`} type="search" placeholder={`Search ${label.toLowerCase()}`} value={search} onChange={e => setSearch(e.target.value)} /></label>}<div>{visible.map(o => <label key={o.value}><input type="radio" name={`map-${label}`} checked={value === o.value} onChange={() => onChange(o.value)} /><span>{o.label}</span></label>)}{!visible.length && <p>No matching options</p>}</div></fieldset>;
}

export default function MapFilters({ area, category, status, areas, categories, statuses, onChange, onClear }) {
    const ref = useRef(null);
    const count = Number(area !== 'all') + Number(category !== 'all') + Number(!['all','open','resolved'].includes(status));
    useEffect(() => {
        function dismiss(event) {
            if (!ref.current?.open) return;
            if (event.type === 'keydown' && event.key === 'Escape') { ref.current.open = false; ref.current.querySelector('summary').focus(); event.preventDefault(); }
            if (event.type === 'pointerdown' && !ref.current.contains(event.target)) ref.current.open = false;
        }
        document.addEventListener('keydown', dismiss); document.addEventListener('pointerdown', dismiss);
        return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss); };
    }, []);
    return <details className="map-filter-popover" ref={ref}><summary className="gov-button"><SlidersHorizontal size={15} />Filters{count > 0 && <span className="map-filter-count">{count}</span>}</summary><div className="map-filter-panel"><header><strong>Filter reports</strong><GovButton onClick={() => { ref.current.open = false; ref.current.querySelector('summary').focus(); }} aria-label="Close filters"><X size={16} /></GovButton></header>
        <Choices label="Category" value={category} options={[{ value: 'all', label: 'All categories' }, ...categories.map(v => ({ value: v, label: v }))]} onChange={v => onChange('category', v)} />
        <Choices label="Barangay" value={area} searchable options={[{ value: 'all', label: 'All areas' }, ...areas.map(v => ({ value: v, label: /^\d+$/.test(v) ? `Barangay ${v}` : v }))]} onChange={v => onChange('barangay', v)} />
        <Choices label="Report status" value={status} options={[{ value: 'all', label: 'All statuses' }, { value: 'open', label: 'Open reports' }, { value: 'resolved', label: 'Resolved reports' }, ...statuses.filter(v => v !== 'resolved').map(v => ({ value: v, label: v.replaceAll('_', ' ') }))]} onChange={v => onChange('status', v)} />
        <footer><GovButton onClick={onClear}>Reset filters</GovButton><GovButton primary onClick={() => { ref.current.open = false; ref.current.querySelector('summary').focus(); }}>Done</GovButton></footer>
    </div></details>;
}
