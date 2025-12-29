const express = require("express");
const path = require("path");
const app = express();
const multer = require("multer");
const { mergePdf, mergeCustomPages } = require("./testpdf");
const parsePages = require("./parsePages");
const fs = require("fs");
const upload = multer({ dest: "/tmp" });
/*app.use(express.urlencoded({ extended: true }));
app.use(express.json());*/

app.use("/static", express.static("public"));
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
    console.log(req.files);
    let d = await mergePdf(
      req.files.pdf1[0].path,
      req.files.pdf2[0].path
    );
    fs.unlinkSync(req.files.pdf1[0].path);
    fs.unlinkSync(req.files.pdf2[0].path);
    //res.redirect(`http://localhost:3000/static/${d}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.setHeader("Content-Length", d.length);

    res.end(d);

    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
  }
);

app.post(
  "/custom-merge",
  upload.fields([{ name: "pdf1" }, { name: "pdf2" }]),
  async (req, res) => {
    const pages1 = parsePages(req.body.pages1);
    const pages2 = parsePages(req.body.pages2);

    const d = await mergeCustomPages(
      req.files.pdf1[0].path,
      pages1,
      req.files.pdf2[0].path,
      pages2
    );

    fs.unlinkSync(req.files.pdf1[0].path);
    fs.unlinkSync(req.files.pdf2[0].path);

    //res.redirect(`http://localhost:3000/static/${d}.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.setHeader("Content-Length", d.length);

    res.end(d);
  }
);

/*app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
*/

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = app;

