const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function makePdf(text, filename) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 200]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 20, y: 100, size: 24, font, color: rgb(0, 0, 0) });
  const bytes = await pdfDoc.save();
  fs.writeFileSync(filename, bytes);
  return filename;
}

async function postCustomMerge(file1, file2, fields) {
  const form = new FormData();
  form.append('pdf1', fs.createReadStream(file1));
  form.append('pdf2', fs.createReadStream(file2));
  for (const k of Object.keys(fields)) form.append(k, fields[k]);

  const res = await fetch('http://localhost:3000/custom-merge', { method: 'POST', body: form, headers: form.getHeaders() });
  const buf = await res.buffer();
  return { status: res.status, text: buf.toString('utf8'), headers: res.headers.raw() };
}

(async () => {
  try {
    const a = await makePdf('PDF A - page 1', path.join(__dirname, 'tmp', 'a1.pdf'));
    const b = await makePdf('PDF B - page 1', path.join(__dirname, 'tmp', 'b1.pdf'));

    console.log('Posting invalid case (pages1=1,3 order includes pdf1:2)');
    const r = await postCustomMerge(a, b, { pages1: '1,3', pages2: '1', order: 'pdf1:1,pdf2:1,pdf1:2' });
    console.log('Response status:', r.status);
    console.log('Response body:', r.text);
  } catch (e) {
    console.error(e);
  }
})();