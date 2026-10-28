import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GovWorkspace } from '../components/government/GovWorkspace';
import ReportDocket from '../components/government/ReportDocket';

export default function GovReportDetailPage() {
    const { reportId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const from = params.get('from') || '';
    const back = /^\/gov\/(?:map|reports|my-work|today|projects)(?:\?|$)/.test(from) && !from.includes('\\') ? from : '/gov/reports';
    const returnToWork = /^\/gov\/(?:my-work|today)(?:\?|$)/.test(back);
    const returnToProjects = /^\/gov\/projects(?:\?|$)/.test(back);
    const parentLabel = returnToWork ? 'My work' : returnToProjects ? 'Projects' : 'Reports';
    return <GovWorkspace title="Report record" parent={{ label: parentLabel, to: back }} actions={<Link className="gov-button" to={back}><ArrowLeft size={15} /> Back to {parentLabel.toLowerCase()}</Link>}>
        <div className="report-full-docket"><ReportDocket key={reportId} selected={{ id: Number(reportId) }} fullPage onClose={() => navigate(back)} onChanged={() => {}} /></div>
    </GovWorkspace>;
}
