// Use dynamic import for ESM-only `pdf-merger-js` to support CommonJS runtime on Vercel
let PDFMergerClass = null;
async function getPDFMergerClass() {
  if (PDFMergerClass) return PDFMergerClass;
  try {
    const mod = await import('pdf-merger-js');
    PDFMergerClass = mod && (mod.default || mod);
    return PDFMergerClass;
  } catch (err) {
    console.error('Failed to import pdf-merger-js dynamically:', err);
    throw err;
  }
}

const mergePdf = async (pdf1, pdf2) => {
  try {
    const PDFMerger = await getPDFMergerClass();
    const merger = new PDFMerger();
    await merger.add(pdf1); // merge all pages. parameter is the path to file and filename.
    await merger.add(pdf2); // merge all pages
    return await merger.saveAsBuffer();
  } catch (err) {
    console.error('mergePdf error:', err);
    throw err;
  }
};

const mergeCustomPages = async (pdf1, pages1, pdf2, pages2) => {
  try {
    const PDFMerger = await getPDFMergerClass();
    const merger = new PDFMerger();

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
};

const mergeByOrder = async (pdf1, pdf2, orderItems) => {
  // orderItems: [{ which: 1|2, page: number }, ...]
  try {
    const PDFMerger = await getPDFMergerClass();
    const merger = new PDFMerger();

    console.log('mergeByOrder: starting with orderItems=', JSON.stringify(orderItems));

    for (const [idx, item] of orderItems.entries()) {
      const { which, page } = item;
      console.log(`mergeByOrder: adding item ${idx}: which=${which}, page=${page}`);
      if (!Number.isInteger(page) || page <= 0) throw new Error('Invalid page number in order item: ' + JSON.stringify(item));
      if (which === 1) await merger.add(pdf1, page);
      else if (which === 2) await merger.add(pdf2, page);
      else throw new Error('Invalid which in order item: ' + JSON.stringify(item));
    }

    console.log('mergeByOrder: finished adding pages, saving buffer');
    return await merger.saveAsBuffer();
  } catch (err) {
    console.error('mergeByOrder error:', err);
    throw err;
  }
};

module.exports = { mergePdf, mergeCustomPages, mergeByOrder };