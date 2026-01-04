const fs = require('fs');
const s = fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
let i = 928; // start from last known good
for (; i <= s.length; i++) {
  try {
    new Function(s.slice(0, i));
  } catch (e) {
    console.log('fail at pos', i, 'message', e.message);
    const ctx = s.slice(Math.max(0, i-80), Math.min(s.length, i+80));
    console.log('context:\n', ctx);
    break;
  }
}
if (i > s.length) console.log('no failure found');
