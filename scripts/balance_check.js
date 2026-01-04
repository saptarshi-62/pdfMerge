const fs=require('fs');
const s=fs.readFileSync('d:/projects/pdfMerge/public/script.js','utf8');
let brace=0, paren=0, bracket=0;
for (let i=0;i<s.length;i++){
  const ch=s[i];
  if (ch==='{') brace++;
  if (ch==='}') brace--;
  if (ch==='(') paren++;
  if (ch===')') paren--;
  if (ch==='[') bracket++;
  if (ch===']') bracket--;
  if (brace<0||paren<0||bracket<0) {
    console.log('negative at', i, 'char', ch, 'brace', brace, 'paren', paren, 'bracket', bracket);
    console.log('context', s.slice(Math.max(0,i-40), i+40));
    process.exit(0);
  }
}
console.log('final counts brace', brace, 'paren', paren, 'bracket', bracket);
