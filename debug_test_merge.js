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
  console.log('Status:', res.status, 'Length:', buf.length);
  return { status: res.status, buf, headers: res.headers.raw() };
}

(async () => {
  try {
    const a = await makePdf('PDF A - page 1', path.join(__dirname, 'tmp', 'a1.pdf'));
    const b = await makePdf('PDF B - page 1', path.join(__dirname, 'tmp', 'b1.pdf'));

    console.log('Posting without order (should be A then B)');
    const r1 = await postCustomMerge(a, b, { pages1: '1', pages2: '1' });
    fs.writeFileSync(path.join(__dirname, 'tmp', 'merged_noorder.pdf'), r1.buf);

    console.log('Posting with order pdf1:1,pdf2:1 (should be A then B)');
    const r2 = await postCustomMerge(a, b, { order: 'pdf1:1,pdf2:1' });
    fs.writeFileSync(path.join(__dirname, 'tmp', 'merged_order_ab.pdf'), r2.buf);

    console.log('Posting with order pdf2:1,pdf1:1 (should be B then A)');
    const r3 = await postCustomMerge(a, b, { order: 'pdf2:1,pdf1:1' });
    fs.writeFileSync(path.join(__dirname, 'tmp', 'merged_order_ba.pdf'), r3.buf);

    console.log('Posting with pages1=1,3 and order including pdf1:2 (should be 400 and not include page 2)');
    const r4 = await postCustomMerge(a, b, { pages1: '1,3', pages2: '1', order: 'pdf1:1,pdf2:1,pdf1:2' });
    console.log('Status for invalid order test:', r4.status);

    console.log('Files written to tmp/*.pdf — check differences');
  } catch (e) {
    console.error(e);
  }
})();