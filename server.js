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
const { mergePdf, mergeCustomPages } = require("./testpdf");
const parsePages = require("./parsePages");
const fs = require("fs");
const os = require('os');
const upload = multer({ dest: os.tmpdir() });

// Log basic request info (method, path, content-length) to help diagnose runtime failures on Vercel
app.use((req, res, next) => {
  try {
    console.log(`REQ ${req.method} ${req.url} content-length=${req.headers['content-length'] || 'unknown'}`);
  } catch (e) {
    console.warn('Logging middleware error', e);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/static", express.static("public"));

// Simple health endpoint for deployment checks
app.get('/health', (req, res) => res.status(200).send('ok'));
//app.use( express.static('public'));

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
      if (!req.files || !req.files.pdf1 || !req.files.pdf2) {
        return res.status(400).send("Both pdf1 and pdf2 files are required");
      }
      if (!req.body.pages1 || !req.body.pages2) {
        return res.status(400).send("pages1 and pages2 fields are required");
      }

      const pages1 = parsePages(req.body.pages1);
      const pages2 = parsePages(req.body.pages2);

      if (!Array.isArray(pages1) || pages1.length === 0 || pages1.some(isNaN) ||
          !Array.isArray(pages2) || pages2.length === 0 || pages2.some(isNaN)) {
        return res.status(400).send("Invalid pages format. Example: 1,2,3-5");
      }

      const pdf1Path = req.files.pdf1[0].path;
      const pdf2Path = req.files.pdf2[0].path;

      const s1 = fs.existsSync(pdf1Path) ? fs.statSync(pdf1Path).size : 0;
      const s2 = fs.existsSync(pdf2Path) ? fs.statSync(pdf2Path).size : 0;
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

