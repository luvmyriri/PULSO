const fs = require('fs');
const path = require('path');

const wizardComponents = [
  'frontend/src/components/report-wizard/WizardHeader.jsx',
  'frontend/src/components/report-wizard/WizardSignalCutRail.jsx',
  'frontend/src/components/report-wizard/Step1CategoryEmergency.jsx',
  'frontend/src/components/report-wizard/Step2LocationMap.jsx',
  'frontend/src/components/report-wizard/Step3EvidenceUpload.jsx',
  'frontend/src/components/report-wizard/Step4DetailsDuplicate.jsx',
  'frontend/src/components/report-wizard/Step5ContactPreferences.jsx',
  'frontend/src/components/report-wizard/Step6ReviewConsent.jsx',
  'frontend/src/components/report-wizard/DuplicateWarningModal.jsx'
];

wizardComponents.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n=================== ${path.basename(file)} ===================`);
  
  // Focus rings
  const ring3 = content.match(/focus-visible:ring-3/g) || [];
  const ringOffset2 = content.match(/focus-visible:ring-offset-2/g) || [];
  const otherRings = content.match(/focus-visible:ring-[0-9]/g) || [];
  const standardRings = content.match(/focus:ring-[0-9]/g) || [];
  console.log(`Focus rings: ring-3=${ring3.length}, ring-offset-2=${ringOffset2.length}, other focus-visible=${otherRings.length}, focus:ring=${standardRings.length}`);

  // Roles & ARIA
  const roles = content.match(/role=["']([^"']+)["']/g) || [];
  const ariaLabels = content.match(/aria-label=["']([^"']+)["']/g) || [];
  const ariaLive = content.match(/aria-live=["']([^"']+)["']/g) || [];
  const ariaModal = content.match(/aria-modal/g) || [];
  console.log(`Roles: ${JSON.stringify(roles)}`);
  console.log(`Aria-label count: ${ariaLabels.length}, Aria-live: ${JSON.stringify(ariaLive)}, Aria-modal count: ${ariaModal.length}`);

  // Buttons & inputs without explicit touch height
  const buttons = content.match(/<button[\s\S]*?>/g) || [];
  console.log(`Button count: ${buttons.length}`);
});
