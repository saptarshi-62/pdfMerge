//import PDFMerger from 'pdf-merger-js';
const PDFMerger = require('pdf-merger-js').default;

//var merger = new PDFMerger();


const mergePdf = async (pdf1,pdf2) => {
  try {
    const merger = new PDFMerger();
    await merger.add(pdf1);  //merge all pages. parameter is the path to file and filename.
    await merger.add(pdf2); // merge only page 2
    return await merger.saveAsBuffer();
  } catch (err) {
    console.error('mergePdf error:', err);
    throw err;
  }
}

const mergeCustomPages = async (pdf1, pages1, pdf2, pages2) => {
  try {
    const merger = new PDFMerger();
    const out = Date.now();

    for (const p of pages1) {
      await merger.add(pdf1, p);
    }

    for (const p of pages2) {
      await merger.add(pdf2, p);
    }

    return await merger.saveAsBuffer();
  } catch (err) {
    console.error('mergeCustomPages error:', err);
    throw err;
  }
}

module.exports = {mergePdf, mergeCustomPages};
//export default mergePdf;