const express = require("express");
const path = require("path");
const app = express();

// Global handlers to ensure Vercel captures errors in logs
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});

const multer = require("multer");
const { mergePdf, mergeCustomPages, mergeByOrder } = require("./testpdf");
const parsePages = require("./parsePages");

function parseOrder(str) {
  // Accept tokens like "pdf1:3", "1:3", "pdf2:10" (comma-separated)
  const items = [];
  if (!str || typeof str !== 'string') return items;
  str.split(',').forEach(token => {
    const t = token.trim();
    if (!t) return;
    const m = t.match(/^(?:(?:pdf)?([12]))\s*:\s*(\d+)$/i);
    if (!m) throw new Error('Invalid order token: ' + t);
    items.push({ which: Number(m[1]), page: Number(m[2]) });
  });
  return items;
}
const fs = require("fs");
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

// Log basic request info (method, path, content-length) and response status/time to help diagnose runtime failures on Vercel
app.use((req, res, next) => {
  const start = Date.now();
  try {
    const reqLen = req.headers['content-length'] || 'unknown';
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`REQ ${req.method} ${req.url} ${res.statusCode} content-length=${reqLen} time=${duration}ms`);
    });
  } catch (e) {
    console.warn('Logging middleware error', e);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/static", express.static("public"));
app.use(express.static("public"));

// Simple health endpoint for deployment checks
app.get('/health', (req, res) => res.status(200).send('ok'));

const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/templates/index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "/templates/about.html"));
});

app.post(
  "/merge",
  upload.fields([
    { name: "pdf1", maxCount: 1 },
    { name: "pdf2", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      console.log(req.files);
      if (!req.files || !req.files.pdf1 || !req.files.pdf2) {
        return res.status(400).send("Both pdf1 and pdf2 files are required");
      }
      const pdf1Path = req.files.pdf1[0].path;
      const pdf2Path = req.files.pdf2[0].path;

      const s1 = fs.existsSync(pdf1Path) ? fs.statSync(pdf1Path).size : 0;
      const s2 = fs.existsSync(pdf2Path) ? fs.statSync(pdf2Path).size : 0;
      console.log(`Merging files: ${pdf1Path} (${s1} bytes), ${pdf2Path} (${s2} bytes)`);

      const d = await mergePdf(pdf1Path, pdf2Path);

      // cleanup files if they exist
      try { fs.unlinkSync(pdf1Path); } catch (e) { console.warn('unlink pdf1 failed', e); }
      try { fs.unlinkSync(pdf2Path); } catch (e) { console.warn('unlink pdf2 failed', e); }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
      res.setHeader("Content-Length", d.length);
      res.end(d);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

app.post(
  "/custom-merge",
  upload.fields([{ name: "pdf1", maxCount:1 }, { name: "pdf2", maxCount:1 }]),
  async (req, res) => {
    try {
      console.log('custom-merge req.body keys:', Object.keys(req.body).join(','), 'body=', JSON.stringify(req.body));
      if (!req.files || !req.files.pdf1 || !req.files.pdf2) {
        return res.status(400).send("Both pdf1 and pdf2 files are required");
      }

      const pdf1Path = req.files.pdf1[0].path;
      const pdf2Path = req.files.pdf2[0].path;

      const s1 = fs.existsSync(pdf1Path) ? fs.statSync(pdf1Path).size : 0;
      const s2 = fs.existsSync(pdf2Path) ? fs.statSync(pdf2Path).size : 0;

      // If a global 'order' string is provided, use it to build the merged PDF across both files
      if (req.body.order) {
        let orderItems;
        try {
          orderItems = parseOrder(req.body.order);
        } catch (e) {
          return res.status(400).send('Invalid order format. Example: pdf1:1,pdf2:3,pdf1:2');
        }
        if (!Array.isArray(orderItems) || orderItems.length === 0) {
          return res.status(400).send('Invalid order format. Example: pdf1:1,pdf2:3,pdf1:2');
        }

        // If the user also supplied pages1/pages2, ensure the ordered references are only to selected pages
        let pages1Arr = null;
        let pages2Arr = null;
        try {
          if (req.body.pages1) {
            pages1Arr = parsePages(req.body.pages1);
            console.log('Parsed pages1Arr=', pages1Arr);
            if (!Array.isArray(pages1Arr) || pages1Arr.length === 0 || pages1Arr.some(isNaN)) {
              return res.status(400).send('Invalid pages1 format. Example: 1,2,3-5');
            }
          }
          if (req.body.pages2) {
            pages2Arr = parsePages(req.body.pages2);
            console.log('Parsed pages2Arr=', pages2Arr);
            if (!Array.isArray(pages2Arr) || pages2Arr.length === 0 || pages2Arr.some(isNaN)) {
              return res.status(400).send('Invalid pages2 format. Example: 1,2,3-5');
            }
          }
        } catch (e) {
          console.error('pages parse failed', e);
          return res.status(400).send('Invalid pages format. Example: 1,2,3-5');
        }

        console.log('Validating orderItems against provided pages', JSON.stringify(orderItems));
        const invalidRefs = [];
        for (const item of orderItems) {
          if (item.which === 1 && pages1Arr && !pages1Arr.includes(item.page)) invalidRefs.push(`pdf1:${item.page}`);
          if (item.which === 2 && pages2Arr && !pages2Arr.includes(item.page)) invalidRefs.push(`pdf2:${item.page}`);
        }
        if (invalidRefs.length > 0) {
          console.warn('Order validation failed, invalid refs:', invalidRefs);
          return res.status(400).send('Order references pages not selected: ' + invalidRefs.join(','));
        }

        console.log(`Ordered merge files: ${pdf1Path} (${s1} bytes), ${pdf2Path} (${s2} bytes), order=${JSON.stringify(orderItems)}`);

        const d = await mergeByOrder(pdf1Path, pdf2Path, orderItems);

        try { fs.unlinkSync(pdf1Path); } catch (e) { console.warn('unlink pdf1 failed', e); }
        try { fs.unlinkSync(pdf2Path); } catch (e) { console.warn('unlink pdf2 failed', e); }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
        res.setHeader("Content-Length", d.length);
        return res.end(d);
      }

      // Fallback to previous behavior using pages1/pages2
      if (!req.body.pages1 || !req.body.pages2) {
        return res.status(400).send("pages1 and pages2 fields are required");
      }

      const pages1 = parsePages(req.body.pages1);
      const pages2 = parsePages(req.body.pages2);

      if (!Array.isArray(pages1) || pages1.length === 0 || pages1.some(isNaN) ||
          !Array.isArray(pages2) || pages2.length === 0 || pages2.some(isNaN)) {
        return res.status(400).send("Invalid pages format. Example: 1,2,3-5");
      }

      console.log(`Custom merge files: ${pdf1Path} (${s1} bytes), ${pdf2Path} (${s2} bytes), pages1=${pages1.join(',')}, pages2=${pages2.join(',')}`);

      const d = await mergeCustomPages(pdf1Path, pages1, pdf2Path, pages2);

      try { fs.unlinkSync(pdf1Path); } catch (e) { console.warn('unlink pdf1 failed', e); }
      try { fs.unlinkSync(pdf2Path); } catch (e) { console.warn('unlink pdf2 failed', e); }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
      res.setHeader("Content-Length", d.length);

      res.end(d);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

/*app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
*/

if (require.main === module) {
  const port =  3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

// Generic error handler to avoid crashing the serverless function
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err && err.status ? err.status : 500).send('Internal Server Error');
});

module.exports = app;

