import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GovWorkspace } from '../components/government/GovWorkspace';
import ReportDocket from '../components/government/ReportDocket';

export default function GovReportDetailPage() {
    const { reportId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const from = params.get('from') || '';
    const back = /^\/gov\/(?:map|reports)(?:\?|$)/.test(from) ? from : '/gov/reports';
    return <GovWorkspace title="Report record" parent={{ label: 'Reports', to: back }} actions={<Link className="gov-button" to={back}><ArrowLeft size={15} /> Back to reports</Link>}>
        <div className="report-full-docket"><ReportDocket key={reportId} selected={{ id: Number(reportId) }} fullPage onClose={() => navigate(back)} onChanged={() => {}} /></div>
    </GovWorkspace>;
}
