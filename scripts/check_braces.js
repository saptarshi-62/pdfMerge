const fs=require('fs');
const s=fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
const arr=['{','}','(',')','`','"','\''];
const counts={};
for(const ch of arr){counts[ch]=s.split(ch).length-1}
console.log('counts',counts);
console.log('last100:\n'+s.slice(Math.max(0,s.length-100)));
console.log('length',s.length);
