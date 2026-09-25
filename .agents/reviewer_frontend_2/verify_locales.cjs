const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('frontend/src/locales/en.json', 'utf8'));
const tl = JSON.parse(fs.readFileSync('frontend/src/locales/tl.json', 'utf8'));

function getLeaves(obj, prefix = '') {
  let leaves = {};
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(leaves, getLeaves(obj[k], fullKey));
    } else {
      leaves[fullKey] = obj[k];
    }
  }
  return leaves;
}

const enLeaves = getLeaves(en);
const tlLeaves = getLeaves(tl);

const files = [
  'frontend/src/pages/ReportWizardPage.jsx',
  'frontend/src/pages/ReportSuccessPage.jsx',
  'frontend/src/pages/PublicTrackPage.jsx',
  'frontend/src/components/modals/ClaimReportModal.jsx',
  'frontend/src/pages/ResidentDashboard.jsx'
];

const regex = /\bt\(\s*['"]([^'"]+)['"]/g;

let anyError = false;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  const usedKeys = new Set();
  while ((match = regex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
  console.log('--- File:', f, 'Keys count:', usedKeys.size);
  const missingEn = [];
  const missingTl = [];
  for (const key of usedKeys) {
    const keyWithNs = key.startsWith('translation.') ? key : 'translation.' + key;
    const keyWithoutNs = key.startsWith('translation.') ? key.replace(/^translation\./, '') : key;
    
    const inEn = (key in enLeaves) || (keyWithNs in enLeaves) || (keyWithoutNs in enLeaves);
    const inTl = (key in tlLeaves) || (keyWithNs in tlLeaves) || (keyWithoutNs in tlLeaves);

    if (!inEn) missingEn.push(key);
    if (!inTl) missingTl.push(key);
  }
  if (missingEn.length > 0) {
    console.log('  MISSING in en.json:', missingEn);
    anyError = true;
  }
  if (missingTl.length > 0) {
    console.log('  MISSING in tl.json:', missingTl);
    anyError = true;
  }
  if (missingEn.length === 0 && missingTl.length === 0) {
    console.log('  All used keys present in en.json and tl.json!');
  }
});

// Also check all files in frontend/src/ to see if other pages have missing keys
function getAllFiles(dir, exts = ['.jsx', '.js', '.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(fullPath))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

console.log('\n--- Scanning all frontend/src files for t() calls ---');
const allSrcFiles = getAllFiles('frontend/src');
let totalUsedAcrossAll = 0;
const missingAll = [];

allSrcFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    totalUsedAcrossAll++;
    const key = match[1];
    const keyWithNs = key.startsWith('translation.') ? key : 'translation.' + key;
    const keyWithoutNs = key.startsWith('translation.') ? key.replace(/^translation\./, '') : key;
    const inEn = (key in enLeaves) || (keyWithNs in enLeaves) || (keyWithoutNs in enLeaves);
    const inTl = (key in tlLeaves) || (keyWithNs in tlLeaves) || (keyWithoutNs in tlLeaves);
    if (!inEn || !inTl) {
      missingAll.push({ file: f, key, inEn, inTl });
    }
  }
});

console.log('Total t() invocations across frontend/src:', totalUsedAcrossAll);
if (missingAll.length > 0) {
  console.log('Missing across entire frontend/src:', missingAll);
} else {
  console.log('Zero missing keys across entire frontend/src!');
}
