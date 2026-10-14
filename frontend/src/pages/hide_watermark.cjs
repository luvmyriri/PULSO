const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/pages/PositionDashboard.jsx';

let content = fs.readFileSync(path, 'utf8');

// The line we want to replace
const targetClass = 'className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none scale-110 origin-center"';
// Our new class with extended bottom/right to hide the watermark via overflow-hidden on parent
const newClass = 'className="absolute -top-10 -left-10 -right-20 -bottom-20 z-0 opacity-40 mix-blend-overlay pointer-events-none"';

if (content.includes(targetClass)) {
    content = content.replace(targetClass, newClass);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully adjusted Spline bounds to hide watermark');
} else {
    console.log('Could not find the target Spline container class');
    
    // Attempt a more generic replace if formatting differs
    const fallbackRegex = /className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none.*?"/;
    if (fallbackRegex.test(content)) {
        content = content.replace(fallbackRegex, newClass);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Successfully adjusted via fallback regex');
    }
}
