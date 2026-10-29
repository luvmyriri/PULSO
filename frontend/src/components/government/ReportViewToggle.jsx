import { Link } from 'react-router-dom';
import { Map, FileText } from 'lucide-react';
import './report-docket.css';

export default function ReportViewToggle({ mode, mapTo, tableTo, label = 'Report view' }) {
    return <nav className="report-view-switch" aria-label={label}><Link to={mapTo} aria-current={mode === 'map' ? 'page' : undefined}><Map size={14} /><span>Map View</span></Link><Link to={tableTo} aria-current={mode === 'table' ? 'page' : undefined}><FileText size={14} /><span>Table View</span></Link></nav>;
}
