const fs = require('fs');

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

const content = fs.readFileSync('frontend/src/pages/ResidentDashboard.jsx', 'utf8');
const lines = content.split('\n');

// Word boundary before t(
const regex = /\bt\(\s*['"]([^'"]+)['"](?:\s*,\s*(\{[^}]+\}|['"][^'"]*['"]))?\)/g;

const missing = [];

lines.forEach((line, idx) => {
  let match;
  while ((match = regex.exec(line)) !== null) {
    const key = match[1];
    const opts = match[2] || '';
    const keyWithNs = key.startsWith('translation.') ? key : 'translation.' + key;
    const keyWithoutNs = key.startsWith('translation.') ? key.replace(/^translation\./, '') : key;

    const inEn = (key in enLeaves) || (keyWithNs in enLeaves) || (keyWithoutNs in enLeaves);
    const inTl = (key in tlLeaves) || (keyWithNs in tlLeaves) || (keyWithoutNs in tlLeaves);

    if (!inEn || !inTl) {
      missing.push({ line: idx + 1, key, opts, text: line.trim() });
    }
  }
});

console.log('Real missing t() calls in ResidentDashboard:', missing.length);
missing.forEach(m => console.log(`L${m.line}: ${m.key} -> ${m.opts}`));
