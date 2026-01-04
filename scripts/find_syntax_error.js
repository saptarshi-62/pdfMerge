const fs=require('fs');
const s=fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
let lo=0, hi=s.length, mid;
let lastOK=0;
while (lo<hi) {
  mid=Math.floor((lo+hi+1)/2);
  try { new Function(s.slice(0,mid)); lastOK=mid; lo=mid; } catch (e) { hi=mid-1; }
  if (hi-lo<=1) break;
}
console.log('lastOK', lastOK);
const ctxStart = Math.max(0, lastOK-200);
const ctxEnd = Math.min(s.length, lastOK+200);
console.log('context:\n', s.slice(ctxStart, ctxEnd));
