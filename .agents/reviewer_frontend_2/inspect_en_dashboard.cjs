const fs = require('fs');
const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));

console.log('en.json translation.dashboard:');
console.log(JSON.stringify(en.translation.dashboard, null, 2));

console.log('\nen.json translation.residentDashboard:');
console.log(JSON.stringify(en.translation.residentDashboard, null, 2));
