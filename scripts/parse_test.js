const fs = require('fs');
const s = fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
try {
  new Function(s);
  console.log('OK parse');
} catch (e) {
  console.error('PARSE ERROR', e && e.message);
  console.error(e);
}
