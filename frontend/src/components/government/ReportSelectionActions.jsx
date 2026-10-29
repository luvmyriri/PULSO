import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Map, X } from 'lucide-react';
import { GovButton } from './GovWorkspace';
import { useGovernmentData } from '../../utils/governmentApi';

export default function ReportSelectionActions({reports, selectedIds, activeId, onReview, onClear}) {
    const location=useLocation();
    const selected=reports.filter(report=>selectedIds.includes(report.id));
    const single=selected.length===1?selected[0]:null;
    const docket=useGovernmentData(single?`/api/gov/reports/${single.id}/docket`:null);
    if(!selected.length)return null;
    const position=selected.findIndex(report=>report.id===activeId);
    const map=new URLSearchParams(location.search);
    map.set('ids',selected.map(report=>report.id).join(','));
    map.set('source','Selected reports');
    map.delete('page');
    map.delete('asset_id');
    map.delete('search');
    if(position>=0)map.set('reportId',String(activeId));else map.delete('reportId');
    return <section className="report-selection-actions" aria-label="Selected report actions">
        <strong role="status">{selected.length} selected</strong>
        <div className="report-selection-actions__commands">
            <GovButton primary onClick={()=>onReview(selected[position>=0?position:0].id)}>Review {single?'report':'selected'}</GovButton>
            {single&&docket.data&&!docket.error&&!docket.loading&&<>
                {docket.data.allowed_actions?.includes('routing_area')&&<GovButton onClick={()=>onReview(single.id,'routing_area')}>Confirm routing barangay</GovButton>}
                {docket.data.can_assign_review&&docket.data.review_operations?.routing_area_id&&!['resolved','rejected','cancelled','completed'].includes(docket.data.report.status)&&<GovButton onClick={()=>onReview(single.id,'owner')}>Assign intake owner</GovButton>}
                {docket.data.can_grade_priority&&<GovButton onClick={()=>onReview(single.id,'priority')}>Assess severity</GovButton>}
                {docket.data.allowed_actions?.includes('assign')&&<GovButton onClick={()=>onReview(single.id,'assign')}>Create work order</GovButton>}
            </>}
            <Link className="gov-button" to={`/gov/map?${map}`}><Map size={15}/> View on map</Link>
            <GovButton onClick={onClear}><X size={15}/> Clear selection</GovButton>
        </div>
        {selected.length>1&&position>=0&&<div className="report-selection-actions__review" aria-label="Selected review sequence"><GovButton aria-label="Review previous selected report" disabled={position===0} onClick={()=>onReview(selected[position-1].id)}><ChevronLeft size={16}/></GovButton><span>{position+1} of {selected.length}</span><GovButton aria-label="Review next selected report" disabled={position===selected.length-1} onClick={()=>onReview(selected[position+1].id)}><ChevronRight size={16}/></GovButton></div>}
        {single&&docket.error&&<p className="gov-note" role="alert">Quick actions unavailable. <button className="gov-text-button" onClick={docket.reload}>Try again</button></p>}
    </section>;
}
