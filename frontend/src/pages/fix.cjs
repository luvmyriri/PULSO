const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/pages/PositionDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');

const brokenTarget = `    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });
                {/* Header */}`;

const fix = `    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });

    const { theme } = useTheme();
    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';
    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';

    useEffect(() => {
        if (!token || !currentUser) navigate('/gov');
    }, [token, currentUser, navigate]);

    const role = currentUser?.role || 'dispatcher';
    const config = ROLE_CONFIG[role] || ROLE_CONFIG['dispatcher'];

    return (
        <div className="min-h-screen bg-neutral-bg text-neutral-text font-sans flex text-sm">
            <GovSidebar currentUser={currentUser} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}`;

if (content.includes(brokenTarget)) {
    content = content.replace(brokenTarget, fix);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Target not found! Using regex...');
    const regex = /const \[currentUser\] = useState\(\(\) => \{[\s\S]*?\}\);\s*\{\/\* Header \*\/\}/;
    if (regex.test(content)) {
        content = content.replace(regex, fix);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed successfully with regex');
    } else {
        console.log('Regex also failed.');
    }
}
