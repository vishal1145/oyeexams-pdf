const express = require("express");
const router = express.Router();
const puppeteer = require('puppeteer');
var fs = require("fs");
const path = require('path');
router.get('/html-to-pdf', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      // headless: true
      executablePath: '/usr/bin/google-chrome'
    })
    const page = await browser.newPage()
    let reqPath = path.join(__dirname, "/abc.html");
    fs.readFile(
      reqPath,
      async function read(err, bufcontent) {
        var htmlcontent = bufcontent.toString();

        await page.setContent(htmlcontent, {
          // waitUntil: 'domcontentloaded'
          waitUntil: 'networkidle0',
          timeout: 0
        })
        await page.pdf({
          format: 'A4',
          landscape: true,
          margin: { left: '0.5cm', top: '0.5cm', right: '0.5cm', bottom: '0.5cm' },
          path: `${__dirname}/pdfFile.pdf`
        })
        // await browser.close()
        const pdfPath = __dirname + '/pdfFile.pdf'
        var pdfFile = fs.readFileSync(pdfPath); //, { encoding: 'base64' }
        res.contentType("application/pdf");
        res.send(pdfFile)
      })
  } catch (error) {
    console.log(error);
  }
})

module.exports = router