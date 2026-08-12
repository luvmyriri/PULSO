const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/pages/PositionDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\r\n/g, '\n'); // Normalize to LF for easier regex

// 1. Fix colors
content = content.replace(/gradient:\s*['"`].*?['"`],/g, "gradient: 'from-primary to-secondary animate-gradient-flow',");
content = content.replace(/color:\s*['"`][a-zA-Z]+['"`],\s*gradient/g, "color: 'orange',\n        gradient");
content = content.replace(/\{ step:\s*(['"`].*?['"`]),\s*color:\s*['"`].*?['"`]\s*\}/g, "{ step: $1, color: 'orange' }");

// 2. Add Spline imports at the top
if (!content.includes('import Spline')) {
    content = content.replace(
        "import GovSidebar from '../components/GovSidebar';",
        "import GovSidebar from '../components/GovSidebar';\nimport { useTheme } from '../contexts/ThemeContext';\nimport Spline from '@splinetool/react-spline';"
    );
}

// 3. Inject useTheme into the component EXACTLY
if (!content.includes('const { theme } = useTheme();')) {
    const componentRegex = /const PositionDashboard = \(\) => \{\n\s*const navigate = useNavigate\(\);\n\s*const \[token\] = useState\(\(\) => localStorage\.getItem\('pulso_token'\)\);\n\s*const \[currentUser\] = useState\(\(\) => \{\n\s*try \{ return JSON\.parse\(localStorage\.getItem\('pulso_user'\)\); \} catch \{ return null; \}\n\s*\}\);/;
    
    const replacement = `const PositionDashboard = () => {
    const navigate = useNavigate();
    const [token] = useState(() => localStorage.getItem('pulso_token'));
    const [currentUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }
    });

    const { theme } = useTheme();
    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';
    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';`;
    
    content = content.replace(componentRegex, replacement);
    
    // Check if it was replaced
    if (!content.includes('const { theme } = useTheme();')) {
        console.log('REGEX FAILED to inject theme variables. Trying fallback...');
        content = content.replace(
            "const [currentUser] = useState(() => {\n        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }\n    });",
            "const [currentUser] = useState(() => {\n        try { return JSON.parse(localStorage.getItem('pulso_user')); } catch { return null; }\n    });\n\n    const { theme } = useTheme();\n    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';\n    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';"
        );
    }
}

// 4. Update the Banner rendering
const bannerRegex = /\{\/\* Role Banner \*\/\}\n\s*<motion\.div\n\s*initial=\{\{ opacity: 0, y: -10 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*className=\{`rounded-2xl p-6 mb-6 bg-gradient-to-br \$\{config\.gradient\} text-white shadow-lg`\}\n\s*>\n\s*<div className="flex items-center justify-between flex-wrap gap-4">/m;

const bannerReplacement = `{/* Role Banner */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={\`relative overflow-hidden rounded-2xl p-6 mb-6 bg-gradient-to-br \${config.gradient} text-white shadow-lg\`}
                        >
                            {/* Spline Background */}
                            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none scale-110 origin-center">
                                <Spline scene={theme === 'dark' ? DARK_SCENE : LIGHT_SCENE} />
                            </div>

                            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">`;

content = content.replace(bannerRegex, bannerReplacement);

// Restore CRLF for Windows just to be polite
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(path, content, 'utf8');
console.log('Patch complete.');
