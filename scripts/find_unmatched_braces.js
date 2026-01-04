const fs=require('fs');
const s=fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
const stack=[];
for (let i=0;i<s.length;i++){
  const ch=s[i];
  if (ch==='{') stack.push({i, ctx:s.slice(Math.max(0,i-30),i+30)});
  if (ch==='}') stack.pop();
}
console.log('unmatched count', stack.length);
if (stack.length>0) {
  const last = stack[stack.length-1];
  console.log('last unmatched at', last.i, 'context:\n', last.ctx);
}
