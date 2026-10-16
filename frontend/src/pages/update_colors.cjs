const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/pages/PositionDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');

// Replace banner gradient mapping
content = content.replace(/gradient:\s*['"`].*?['"`],/g, "gradient: 'from-primary to-secondary animate-gradient-flow',");

// Replace base color mappings for banners
// Only replace the ones right before gradient to avoid changing other colors (if any)
content = content.replace(/color:\s*['"`][a-zA-Z]+['"`],\s*gradient/g, "color: 'orange',\n        gradient");

// Replace workflow step colors
content = content.replace(/\{ step:\s*(['"`].*?['"`]),\s*color:\s*['"`].*?['"`]\s*\}/g, "{ step: $1, color: 'orange' }");

fs.writeFileSync(path, content, 'utf8');
console.log('PositionDashboard colors updated successfully!');
