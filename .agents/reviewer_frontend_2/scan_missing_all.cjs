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

function getAllFiles(dir, exts = ['.jsx', '.js']) {
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

const allFiles = getAllFiles('frontend/src');
const regex = /\bt\(\s*['"]([^'"]+)['"]/g;

console.log('--- Scanning all frontend/src files for missing translations ---');
const missingByFile = {};

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    const keyWithNs = key.startsWith('translation.') ? key : 'translation.' + key;
    const keyWithoutNs = key.startsWith('translation.') ? key.replace(/^translation\./, '') : key;
    const inEn = (key in enLeaves) || (keyWithNs in enLeaves) || (keyWithoutNs in enLeaves);
    const inTl = (key in tlLeaves) || (keyWithNs in tlLeaves) || (keyWithoutNs in tlLeaves);
    if (!inEn || !inTl) {
      if (!missingByFile[f]) missingByFile[f] = [];
      missingByFile[f].push({ key, inEn, inTl });
    }
  }
});

for (const [file, items] of Object.entries(missingByFile)) {
  console.log(`\nFile: ${file} (Count: ${items.length})`);
  items.forEach(it => console.log(`  - ${it.key} (inEn: ${it.inEn}, inTl: ${it.inTl})`));
}
