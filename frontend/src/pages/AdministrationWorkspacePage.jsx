import { useSearchParams } from 'react-router-dom';
import GovSettingsPage from './GovSettingsPage';
import StaffAdministrationPage, { AdministrationAuditPage } from './StaffAdministrationPage';
import RoleAdministrationPage from './RoleAdministrationPage';
import ResidentAdministrationPage from './ResidentAdministrationPage';

export default function AdministrationWorkspacePage() {
    const [params]=useSearchParams();
    const view=params.get('view')||params.get('tab')||'staff';
    if(view==='residents')return <ResidentAdministrationPage/>;
    if(view==='audit')return <AdministrationAuditPage/>;
    if(view==='roles')return <RoleAdministrationPage/>;
    if(['settings','automated-ai','agents','ai-tools'].includes(view))return <GovSettingsPage/>;
    return <StaffAdministrationPage/>;
}
