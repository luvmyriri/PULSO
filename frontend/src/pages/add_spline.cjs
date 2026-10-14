const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/pages/PositionDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');

const target = `                        {/* Role Banner */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={\`rounded-2xl p-6 mb-6 bg-gradient-to-br \${config.gradient} text-white shadow-lg\`}
                        >
                            <div className="flex items-center justify-between flex-wrap gap-4">`;

const replacement = `                        {/* Role Banner */}
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

if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log('Banner Spline added successfully');
} else {
    console.log('Target not found!');
}

// Add Imports if not exist
if (!content.includes('import Spline')) {
    content = content.replace(
        `import GovSidebar from '../components/GovSidebar';`,
        `import GovSidebar from '../components/GovSidebar';\nimport { useTheme } from '../contexts/ThemeContext';\nimport Spline from '@splinetool/react-spline';`
    );
    console.log('Imports added successfully');
}

fs.writeFileSync(path, content, 'utf8');
