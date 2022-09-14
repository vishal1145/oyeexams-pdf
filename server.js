require('dotenv').config()
const fs = require("fs");
const path = require('path')
const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');
const cors = require('cors')
const axios = require("axios");
const port = process.env.PORT || 3500;
const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static("/"));
app.set("view engine", "html");
app.use(cors())

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});


function optionDiv(OptionValue, optionSlag) {
  // `<div class="optiontop">
  //  <span class="optionstyle">$$optionslag$$</span
  //  ><span>$$options$$</span>
  // </div>`
  let optionText = `<div class="optiontop" style="margin-left:15px;">
  <span class="optionstyle">$$optionslag$$.</span>$$options$$
  </div>`;
  optionText = optionText.replace("$$options$$", OptionValue);
  optionText = optionText.replace("$$optionslag$$", optionSlag);
  return optionText;
}//<div class="questionclass">$$queNumber$$</div>
function getQuestionDiv(Question) {
  let text = `<div class="questiontop">
  <div class="questionstyle">
    <div class="questionclass">$$queNumber$$.</div>
    <div class="questionsstyle">
      <span class="answerlast">
        $$questionText$$
      </span>
      $$options$$
    </div>
  </div>
</div>`;

  let options = "";
  const queslstArr = Question.lstOption;
  for (let j = 0; j < (queslstArr || []).length; j++) {
    options =
      options + optionDiv(queslstArr[j].OptionValue, queslstArr[j].OptionSlag);
  }
  text = text.replace("$$options$$", options);
  text = text.replace("$$questionText$$", Question.QuestionDescription);
  text = text.replace("$$queNumber$$", Question.QueNumber);

  return text;
}

function getMarksDiv(Question) {
  let marktext = `<div class="marks">
  <span class="markone">$$marks$$</span>
  <span class="mark">Marks</span>
</div>`;
  marktext = marktext.replace("$$marks$$", Question.Marks);
  return marktext;
}

function getAnswerDiv(Question) {
  let answertext = `<div class="answerstyle">
  <span class="ansstyle"> Ans:</span>
  <span style="width: 92%">
    <span class="newoption">B</span>
    <span>$$answer$$</span>
  </span>
</div>`;

  Question.QuestionAnswer = Question.QuestionAnswer.replace(`uatportal`, 'staging.portal');

  answertext = answertext.replace("$$answer$$", Question.QuestionAnswer);
  return answertext;
}

async function getAPIResponse(EAPaperTemplateID, EAExamAssignID, url, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      EAPaperTemplateID: EAPaperTemplateID,
      EAExamAssignID: EAExamAssignID
    });

    const config = {
      method: "post",
      url: url,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(function (response) {
        const data = JSON.stringify(response.data);
        resolve(data);
      })
      .catch(function (error) {
        console.log(error);
      });
  });
}

app.post("/get-pdf", async (req, res) => {
  const { EAPaperTemplateID, EAExamAssignID, url, token } = req.body;
  const data = await getAPIResponse(EAPaperTemplateID, EAExamAssignID, url, token);
  let content = fs.readFileSync(`${__dirname}/index.html`, { encoding: 'utf8' })
  const parsedData = JSON.parse(data);
  const questtionlist = parsedData.data.QuestionInstruction;
  const paperTemplateInfo = parsedData.data.paperTemplateInfo;
  // console.log("questtionlistlength->", questtionlist);
  let allquestionsDiv = "";
  for (let q = 0; q < questtionlist.length; q++) {
    let questionDiv = getQuestionDiv(questtionlist[q].Questions[0]);
    questionDiv = questionDiv + getMarksDiv(questtionlist[q].Questions[0]);
    questionDiv = questionDiv + getAnswerDiv(questtionlist[q].Questions[0]);

    allquestionsDiv = allquestionsDiv + questionDiv;
  }
  const totalMarks = paperTemplateInfo.TotalMarks.toFixed(0);
  const NegativeMarks = paperTemplateInfo.NegativeMarks.toFixed(0)
  // console.log("allquestionsDiv", allquestionsDiv);
  content = content.replace("$$examname$$", paperTemplateInfo.Name);
  content = content.replace("$$ClassName$$", paperTemplateInfo.ClassName);
  content = content.replace("$$SubjectName$$", paperTemplateInfo.SubjectName);
  content = content.replace("$$TotalMarks$$", totalMarks);
  content = content.replace("$$Duration$$", paperTemplateInfo.Duration);
  content = content.replace("$$NegativeMarks$$", NegativeMarks);
  content = content.replace("$$imageSource$$", req.body.imageSource);
  content = content.replace("$$studentName$$", req.body.studentName);
  content = content.replace("$$studentSection$$", req.body.studentSection);
  content = content.replace("$$studentRollNo$$", req.body.studentRollNo);
  content = content.replace(
    "$$TotalQuestionCount$$",
    paperTemplateInfo.TotalQuestionCount
  );
  content = content.replace("$$allquestionsDiv$$", allquestionsDiv);

  fs.writeFileSync("abc.html", content);

  try {
    const PUPPETEER_OPTIONS = {
      headless: true,
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
        "--proxy-server='direct://'",
        '--proxy-bypass-list=*',
        '--deterministic-fetch',
      ],
    };
    const browser = await puppeteer.launch()
      // PUPPETEER_OPTIONS
      // headless: true,
      // executablePath: '/usr/bin/chromium-browser'
    // })
    const page = await browser.newPage()
    let reqPath = path.join(__dirname, "/abc.html");
    const bufcontent = fs.readFileSync(
      reqPath, { encoding: 'utf8', flag: 'r' })
    await page.setContent(bufcontent, {
      waitUntil: 'domcontentloaded'
    })
    await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { left: '0.5cm', top: '0.5cm', right: '0.5cm', bottom: '0.5cm' },
      path: `${__dirname}/pdfFile.pdf`
    })
    // await browser.close()
    const pdfPath = __dirname + '/pdfFile.pdf'
    const pdfFile = fs.readFileSync(pdfPath);
    res.contentType("application/pdf");
    res.send(pdfFile)
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
