const fs = require('fs');

const files = [
  'frontend/src/pages/ReportWizardPage.jsx',
  'frontend/src/pages/ReportSuccessPage.jsx',
  'frontend/src/pages/PublicTrackPage.jsx',
  'frontend/src/components/modals/ClaimReportModal.jsx',
  'frontend/src/pages/ResidentDashboard.jsx',
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

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  console.log(`\n=== Checking interactive elements in ${f} ===`);
  
  // Find buttons, links, inputs
  const tagRegex = /<(button|a|input|select|textarea)\b([^>]*)>/g;
  let match;
  let count = 0;
  let warnings = [];
  while ((match = tagRegex.exec(content)) !== null) {
    count++;
    const tag = match[1];
    const attrs = match[2];
    
    // Check accessible name
    const hasAriaLabel = /aria-label=/i.test(attrs);
    const hasAriaLabelledBy = /aria-labelledby=/i.test(attrs);
    const hasTitle = /title=/i.test(attrs);
    const hasId = /id=/i.test(attrs);
    
    // Check focus ring
    const hasFocus = /focus-visible:|focus:/i.test(attrs);
    
    // Check sizing / padding for touch target
    // Look for classes like p-2, p-3, py-2, py-2.5, py-3, h-10, h-11, h-12, min-h-[44px], etc.
    const classMatch = attrs.match(/className=["']([^"']*)["']/);
    const className = classMatch ? classMatch[1] : '';
    
    const hasExplicitFocusRing = /focus-visible:ring-3/.test(className);
    
    if (tag === 'button' && !hasExplicitFocusRing && !className.includes('focus:outline-none')) {
      // check if it has any focus
      if (!hasFocus) {
        warnings.push({ tag, lineSnippet: match[0].slice(0, 80), issue: 'Missing explicit focus-visible ring' });
      }
    }
  }
  console.log(`Total interactive elements: ${count}, Warnings: ${warnings.length}`);
  if (warnings.length > 0) {
    console.log('Sample warnings:', warnings.slice(0, 5));
  }
});
