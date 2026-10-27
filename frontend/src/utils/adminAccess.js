export function adminAllows(user, action) {
    if (!user || user.role === 'resident') return false;
    const explicit = user.capabilities?.admin;
    let grants = explicit === undefined && ['system_admin','admin'].includes(user.role) ? ['*'] : Array.isArray(explicit) ? explicit : [];
    if(grants.includes('manage'))grants=['*'];
    else if(grants.includes('view'))grants=[...grants,'staff_view','residents_view','settings_view','audit_view'];
    if (action === 'view') return grants.some(grant => ['*','staff_view','staff_manage','residents_view','residents_manage','settings_view','settings_manage','audit_view','audit'].includes(grant));
    return grants.includes('*') || grants.includes(action) || (action.endsWith('_view') && grants.includes(action.replace('_view','_manage'))) || (action === 'audit_view' && grants.includes('audit'));
}

export const ADMIN_VIEWS = [
    {value:'staff',label:'Staff and roles',action:'staff_view'},
    {value:'residents',label:'Resident accounts',action:'residents_view'},
    {value:'settings',label:'System settings',action:'settings_view'},
    {value:'automated-ai',label:'Automation and AI',action:'settings_view'},
    {value:'audit',label:'Activity log',action:'audit_view'},
];
