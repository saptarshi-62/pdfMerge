//import PDFMerger from 'pdf-merger-js';
const PDFMerger = require('pdf-merger-js').default;

//var merger = new PDFMerger();


const mergePdf = async (p1,p2) => {
  const merger = new PDFMerger();
  await merger.add(p1);  //merge all pages. parameter is the path to file and filename.
  await merger.add(p2); // merge only page 2
  /*let d = new Date().getTime();
  await merger.save(`public/${d}.pdf`); //save under given name and reset the internal document

  return d;*/
  const buffer = await merger.saveAsBuffer();
  return buffer;
  
  // Export the merged PDF as a nodejs Buffer
  // const mergedPdfBuffer = await merger.saveAsBuffer();
  // fs.writeSync('merged.pdf', mergedPdfBuffer);
}

const mergeCustomPages = async (pdf1, pages1, pdf2, pages2) => {
  const merger = new PDFMerger();
  const out = Date.now();

  for (const p of pages1) {
    await merger.add(pdf1, p);
  }

  for (const p of pages2) {
    await merger.add(pdf2, p);
  }

  /*await merger.save(`public/${out}.pdf`);
  return out;*/
  return await merger.saveAsBuffer();
  
}

module.exports = {mergePdf, mergeCustomPages};
//export default mergePdf;