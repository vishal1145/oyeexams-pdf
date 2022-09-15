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
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(cors({
  credentials: true,
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
  exposedHeaders: ["set-cookie"]
}))

//handle exception
process.on('unhandledRejection', (result, error) => {
}).on('uncaughtException', err => {
  console.error(err, 'Uncaught Exception thrown');
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// const htmlToPdf = require('./htmltopdf')
// app.use('/convert', htmlToPdf)

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
    <span class="newoption"></span>
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
        Authorization: "Bearer " + token,
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
  console.log("in get-pdf");
  const { EAPaperTemplateID } = req.body;
  const pdfPath = `${__dirname}/${EAPaperTemplateID}.pdf`;
  await waitForProcessToFinish(EAPaperTemplateID);
  sendFileTOBrowser(res, pdfPath);
});

function waittime() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, 10000);
  });
}

const waitForProcessToFinish = async (EAPaperTemplateID) => {
  for (var i = 0; i < 100; i++) {
    await waittime();
    if (!processes[EAPaperTemplateID]) {
      return true;
    }
  }
  return true;
}

const sendFileTOBrowser = async (res, pdfPath) => {
  const pdfFile = fs.readFileSync(pdfPath); //, { encoding: 'base64' }
  res.contentType("application/pdf");
  res.send(pdfFile)
}

const processes = {};
const generatePDF = async (req) => {
  const { EAPaperTemplateID, EAExamAssignID, url, token } = req.body;
  processes[EAPaperTemplateID] = true;
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

  const uniqueName = EAPaperTemplateID;
  let reqPath = path.join(__dirname, `/${uniqueName}.html`);
  console.log("reqPath", reqPath);
  fs.writeFileSync(reqPath, content);

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome'
    })
    const page = await browser.newPage()

    const bufcontent = fs.readFileSync(
      reqPath, { encoding: 'utf8', flag: 'r' })
    await page.setContent(bufcontent, {
      // waitUntil: 'domcontentloaded',
      waitUntil: 'networkidle0',
      timeout: 0
    })
    var savePath = `${__dirname}/${uniqueName}.pdf`;
    console.log("savePath", savePath);
    await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { left: '0.5cm', top: '0.5cm', right: '0.5cm', bottom: '0.5cm' },
      path: savePath
    })
    delete processes[EAPaperTemplateID];
    // await browser.close()    
    return savePath;
  } catch (error) {
    delete processes[EAPaperTemplateID];
    console.log(error);
    return null;
  }
}

app.post("/generate-pdf", async (req, res) => {
  console.log("in generate-pdf");
  const pdfPath = await generatePDF(req);
  if (pdfPath) {
    sendFileTOBrowser(res, pdfPath);
  } else {
    res.status(500).send("Error");
  }
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
