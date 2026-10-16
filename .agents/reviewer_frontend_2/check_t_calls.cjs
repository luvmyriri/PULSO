const fs = require('fs');

const files = [
  'frontend/src/locales/en.json',
  'frontend/src/locales/tl.json',
  'frontend/src/pages/ReportWizardPage.jsx',
  'frontend/src/pages/ReportSuccessPage.jsx',
  'frontend/src/pages/PublicTrackPage.jsx',
  'frontend/src/components/modals/ClaimReportModal.jsx',
  'frontend/src/pages/ResidentDashboard.jsx'
];

files.slice(2).forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=================== ${filePath} ===================`);
  lines.forEach((line, idx) => {
    if (line.includes('t(')) {
      console.log(`L${idx + 1}: ${line.trim()}`);
    }
  });
});
