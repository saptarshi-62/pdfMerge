const fs=require('fs');
const s=fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
const lines=s.split('\n');
let ok=0;
for (let i=1;i<=lines.length;i++){
  try{ new Function(lines.slice(0,i).join('\n')); ok=i; }catch(e){ console.log('error at line', i, e && e.message); break; }
}
console.log('last ok line', ok);
console.log('context around:', lines.slice(Math.max(0,ok-5), ok+5).join('\n'));
