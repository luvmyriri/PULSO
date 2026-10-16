const fs = require('fs');

const files = {
  wizard: 'frontend/src/pages/ReportWizardPage.jsx',
  success: 'frontend/src/pages/ReportSuccessPage.jsx',
  track: 'frontend/src/pages/PublicTrackPage.jsx',
  claimModal: 'frontend/src/components/modals/ClaimReportModal.jsx',
  residentDash: 'frontend/src/pages/ResidentDashboard.jsx'
};

for (const [name, path] of Object.entries(files)) {
  console.log(`\n=================== CHECKING ${name} (${path}) ===================`);
  const content = fs.readFileSync(path, 'utf8');
  
  // Check focus rings
  const ring3Matches = content.match(/focus-visible:ring-3/g) || [];
  const ringOffsetMatches = content.match(/focus-visible:ring-offset-2/g) || [];
  const standardFocusMatches = content.match(/focus:ring-[0-9]/g) || [];
  const focusVisibleMatches = content.match(/focus-visible:ring-[0-9]/g) || [];
  
  console.log('Focus Ring Stats:');
  console.log('  focus-visible:ring-3 count:', ring3Matches.length);
  console.log('  focus-visible:ring-offset-2 count:', ringOffsetMatches.length);
  console.log('  all focus-visible:ring-* count:', focusVisibleMatches.length);
  console.log('  standard focus:ring-* count:', standardFocusMatches.length);
  
  // Check touch targets (min-h-[44px], min-w-[44px], h-11, etc)
  const minH44 = content.match(/min-h-\[44px\]/g) || [];
  const minW44 = content.match(/min-w-\[44px\]/g) || [];
  const h11 = content.match(/\bh-11\b/g) || [];
  const h12 = content.match(/\bh-12\b/g) || [];
  const minTouch = content.match(/min-h-\[48px\]/g) || [];
  console.log('Touch Target Indicators:');
  console.log('  min-h-[44px]:', minH44.length, 'min-w-[44px]:', minW44.length, 'h-11:', h11.length, 'h-12:', h12.length, 'min-h-[48px]:', minTouch.length);
  
  // Check ARIA roles & attributes
  const roleMatches = content.match(/role=["']([a-zA-Z0-9_-]+)["']/g) || [];
  const ariaLiveMatches = content.match(/aria-live=["']([a-zA-Z0-9_-]+)["']/g) || [];
  const ariaModalMatches = content.match(/aria-modal/g) || [];
  const ariaLabelMatches = content.match(/aria-label/g) || [];
  const ariaDescribedBy = content.match(/aria-describedby/g) || [];
  console.log('ARIA Stats:');
  console.log('  roles:', roleMatches);
  console.log('  aria-live:', ariaLiveMatches);
  console.log('  aria-modal count:', ariaModalMatches.length);
  console.log('  aria-label count:', ariaLabelMatches.length);
  console.log('  aria-describedby count:', ariaDescribedBy.length);

  // Check LocalStorage / Draft persistence
  const lsDraft = content.match(/pulso_report_wizard_draft_v1/g) || [];
  const localStorageMatches = content.match(/localStorage/g) || [];
  console.log('Draft Persistence:');
  console.log('  pulso_report_wizard_draft_v1 matches:', lsDraft.length);
  console.log('  localStorage usages:', localStorageMatches.length);
  
  // Check Dark Theme classes
  const darkClasses = content.match(/dark:[a-zA-Z0-9_\-\/\[\]#]+/g) || [];
  console.log('Dark Theme:');
  console.log('  dark: class usages count:', darkClasses.length);
}
