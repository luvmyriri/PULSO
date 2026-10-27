import { GovTabs } from './GovWorkspace';
import { useGovernmentData } from '../../utils/governmentApi';

export default function WorkNavigation({value}) {
    const access=useGovernmentData('/api/gov/navigation');
    const items=[{value:'work-orders',label:'Work orders',to:'/gov/work-orders'},{value:'projects',label:'Projects',to:'/gov/projects'}].filter(item=>access.data?.modules.includes(item.value));
    return <GovTabs label="Work sections" value={value} items={items}/>;
}
