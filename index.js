// require('dotenv').config()
const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const cors = require("cors");
const axios = require("axios");
const port = parseInt(process.env.PORT) || 3500;
const app = express();
let CronJob = require("cron").CronJob;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
// app.use(express.static("/"));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(
  cors({
    credentials: true,
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    exposedHeaders: ["set-cookie"],
  })
);

//handle exception
process
  .on("unhandledRejection", (result, error) => {})
  .on("uncaughtException", (err) => {
    console.error(err, "Uncaught Exception thrown");
  });

app.get("/", (req, res) => {
  // res.sendFile(__dirname + "/index.html");
  res.send("Hello");
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
} //<div class="questionclass">$$queNumber$$</div>
function getQuestionDiv(Question, objectNo, length) {
  let text;
  if (objectNo == length) {
    text = `<div class="questiontop">
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
  } else {
    text = `<div class="questiontop">
    <div class="questionstyle">
      <div class="questionclass">$$queNumber$$.</div>
      <div class="questionsstyle">
        <span class="answerlast">
          $$questionText$$
        </span>
        $$options$$
        <h4 style="text-align: center; margin-top: 0px; margin-bottom: 0px;">
          OR
        </h4>
      </div>
    </div>
  </div>`;
  }

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
function getQuestionForAnswerDiv(Question) {
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

function getAnswerDiv(Question, objectNo, length) {
  let answertext;
  if (objectNo == length) {
    answertext = `<div class="answerstyle">
    <span class="ansstyle"> Ans:</span>
    <span style="width: 92%">
      <span class="newoption"></span>
      <span>$$answer$$</span>
    </span>
  </div>`;
  } else {
    answertext = `<div class="answerstyle">
    <span class="ansstyle"> Ans:</span>
    <span style="width: 92%">
      <span class="newoption"></span>
      <span>$$answer$$</span>
    </span> 
    </div>
    <h4 style="text-align: center; margin-top: 0px; margin-bottom: 0px; margin-left: 0%">
          OR
    </h4>
  `;
  }

  // Question.QuestionAnswer = Question.QuestionAnswer.replace(`uatportal`, 'staging.portal');

  answertext = answertext.replace("$$answer$$", Question.QuestionAnswer);
  return answertext;
}

// width= 20;
// innerHeight
// ismaxhe = true;

async function getAPIResponse(EAPaperTemplateID, EAExamAssignID, url, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      EAPaperTemplateID: EAPaperTemplateID,
      EAExamAssignID: EAExamAssignID,
    });

    const config = {
      method: "post",
      url: url + "eapapertemplate/get_template_detail_doc",
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
        console.log("getAPIResponse==>", error);
      });
  });
}

async function getHeaderInfo(StudentID,EAPaperTemplateID, url, token) {
  return new Promise((resolve, reject) => {
    const config = {
      method: "post",
      url: url + `staff/get_header_info?StudentID=${StudentID}&EAPaperId=${EAPaperTemplateID}`,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    };

    axios(config)
      .then(function (response) {
        const data = JSON.stringify(response.data);
        resolve(data);
      })
      .catch(function (error) {
        console.log("getHeaderInfoerror==>", error);
      });
  });
}

async function getPaperTemplateInfo(EAPaperTemplateID, IsOMRPaper, url, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      EAPaperTemplateID: EAPaperTemplateID,
      IsOMRPaper: IsOMRPaper,
    });

    const config = {
      method: "post",
      url: url + "eapapertemplate/get_template_detail",
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
        console.log("getPaperTemplateInfo==>", error);
      });
  });
}

//getFontSize Font-family info

async function getFontSizeFontFamilyInfo(EAPaperTemplateID, url, token) {
  return new Promise((resolve, reject) => {
    const config = {
      method: "get",
      url:
        url +
        `PaperSetions/get_paper-FontSize-FontName?EAPaperId=${EAPaperTemplateID}`,
      headers: {
        Authorization: "Bearer " + token,
      },
    };

    axios(config)
      .then(function (response) {
        const data = JSON.stringify(response.data);
        resolve(data);
      })
      .catch(function (error) {
        console.log("getFontSizeFontFamilyInfoerror==>", error);
      });
  });
}

//getsection info
async function getSectionInfo(EAPaperTemplateID, url, token) {
  return new Promise((resolve, reject) => {
    const config = {
      method: "get",
      url:
        url +
        `PaperSetions/get_all_paper_sections?EAPaperId=${EAPaperTemplateID}`, //fe894ffa-2345-4d5d-89e6-0d08f8988b7c`,//${StudentID}`,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    };

    axios(config)
      .then(function (response) {
        const data = JSON.stringify(response.data);
        resolve(data);
      })
      .catch(function (error) {
        console.log("getSectionInfo==>", error);
      });
  });
}

app.post("/get-pdf", async (req, res) => {
  console.log("in get-pdf");
  if (req.body.isShowAnswer) {
    let EAPaperTemplateID = req.body.EAPaperTemplateID;
    let EAPaperTemplateIDPath = EAPaperTemplateID + "answer";
    const pdfPath = `${__dirname}/${EAPaperTemplateIDPath}.pdf`;
    if (fs.existsSync(pdfPath)) {
      sendFileTOBrowser(res, pdfPath);
    } else {
      generateAnswerPDF(req);
      res
        .status(512)
        .json({ success: false, msg: "File generation in progress" });
    }
  } else {
    let EAPaperTemplateID = req.body.EAPaperTemplateID;
    let EAPaperTemplateIDPath = EAPaperTemplateID + "question";
    const pdfPath = `${__dirname}/${EAPaperTemplateIDPath}.pdf`;
    if (fs.existsSync(pdfPath)) {
      try {
        sendFileTOBrowser(res, pdfPath);
      } catch (error) {
        console.log("error==>", error);
      }
    } else {
      generateQuestionPDF(req);
      res
        .status(512)
        .json({ success: false, msg: "File generation in progress" });
    }
  }
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
};

const sendFileTOBrowser = async (res, pdfPath) => {
  const pdfFile = fs.readFileSync(pdfPath); //, { encoding: 'base64' }
  // const resdata = await PDFWatermark({
  //   pdf_path: pdfPath,
  //   text: "OyeExams",  //optional
  //   image_path: "./oyeexams.png",
  // });
  res.contentType("application/pdf");
  res.send(pdfFile);
};

const getWaterMark = async (parsedHeaderData) => {
  try {
    let opacity = parseInt(parsedHeaderData?.data?.Opacity) / 100;
    let width = parseInt(parsedHeaderData?.data?.Size);
    let top = parsedHeaderData?.data?.Top;
    let left = parsedHeaderData?.data?.Left;
    let rotation = parsedHeaderData?.data?.Rotation;
    let textCSS = {}
    try {
      textCSS = JSON.parse(parsedHeaderData?.data?.TextCSS);
    } catch (error) {
      console.log("textCSSError", textCSS);
    }
    
    let fontStyle = "";
    let fontSize = 24;
    let textDecoration = "";
    let fontWeight = "";
    let color = "#000000";
    if (textCSS?.bold) fontWeight = "bolder";
    if (textCSS?.italic) fontStyle = "italic";
    if (textCSS?.underline) textDecoration = "underline";
    if (textCSS?.textcolor != "") color = textCSS?.textcolor;
    if (textCSS?.textsize != "") fontSize = parseInt(textCSS?.textsize);
    if (parsedHeaderData?.data?.IncludeWaterMark === 1) {
      if (parsedHeaderData?.data?.IS_TEXT_FILE === 1) {
        let str = `     
    <span class="bgtext"
        style="--my-watermark-var: '${parsedHeaderData?.data?.Text}'; transform: rotate(${rotation}deg); font-style: ${fontStyle}; top: ${top}%; left: ${left}%; font-size: ${fontSize}px; text-decoration: ${textDecoration}; font-weight: ${fontWeight}; color: ${color}; opacity: ${opacity};"></span>
    `;
        return { str, hasmark: true, cnt: parsedHeaderData?.data?.Text };
      } else {
        top = 30;
        left = 30;
        width = 30;
        let str1 = ` <img  class="bgimg"
    src=${parsedHeaderData?.data?.WaterMarkUrl}
    style="display: block; margin-left: auto; margin-right: auto; width: ${width}%; top: ${top}%; left: ${left}%; transform: rotate(${rotation}deg); opacity: ${opacity};position: fixed;z-index: -1;">`;

        return { str: str1, hasmark: false };
      }
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
  }
};
const processes = {};
let FontSize = "18";
let FontName = "Calibri";
const generateAnswerPDF = async (req) => {
  const {
    EAPaperTemplateID,
    EAExamAssignID,
    url,
    token,
    StudentID,
    IsOMRPaper,
  } = req.body;
  if (processes[EAPaperTemplateID]) {
    return;
  }

  processes[EAPaperTemplateID] = true;
  try {
    const data = await getAPIResponse(
      EAPaperTemplateID,
      EAExamAssignID,
      url,
      token
    );
    const headerData = await getHeaderInfo(StudentID,EAPaperTemplateID, url, token);
    const templateInfoData = await getPaperTemplateInfo(
      EAPaperTemplateID,
      IsOMRPaper,
      url,
      token
    );
    const getSectionInfoData = await getSectionInfo(
      EAPaperTemplateID,
      url,
      token
    );
    const fontSizeFontFamilyInfoData = await getFontSizeFontFamilyInfo(
      EAPaperTemplateID,
      url,
      token
    );
    let content = fs.readFileSync(`${__dirname}/index.html`, {
      encoding: "utf8",
    });
    const parsedData = JSON.parse(data);
    const parsedHeaderData = JSON.parse(headerData);
    const parsedTemplateInfoData = JSON.parse(templateInfoData);
    const questtionlist = parsedData.data.QuestionInstruction;
    const paperTemplateInfo = parsedData.data.paperTemplateInfo;
    const headerInstructionList = parsedData.data.HeaderInstruction;
    const sectionInfoData = JSON.parse(getSectionInfoData);
    const sectionDataArr = sectionInfoData.data;
    const fontSizeFontFamilyData = JSON.parse(fontSizeFontFamilyInfoData);

    // if ((sectionDataArr[0].FontSize != "") || (sectionDataArr[0].FontName != "")) {
    //   `<div class="dynamicStyle"
    //     style="font-size: '${sectionDataArr[0].FontSize}'; font-style: ${sectionDataArr[0].FontName}"</div>`;
    // }
    // console.log("questtionlistlength->", questtionlist);
    let allquestionsDiv = "";
    let oneQuestionDiv = "";
    for (let q = 0; q < questtionlist.length; q++) {
      for (let s = 0; s < (questtionlist[q].Questions || []).length; s++) {
        let questionDiv = getQuestionForAnswerDiv(
          questtionlist[q].Questions[s]
        );
        let marksDiv = getMarksDiv(questtionlist[q].Questions[s]);
        //oneQuestionDiv = "<div class='qmarks' style='margin-bottom:20px'>" + questionDiv + marksDiv + "</div>";
        if (
          questtionlist[q].Questions.length > s + 1 ||
          questtionlist[q].Questions.length == 1
        ) {
          oneQuestionDiv =
            "<div class='qmarks' style='margin-bottom:10px'>" +
            questionDiv +
            marksDiv +
            "</div>";
        } else {
          oneQuestionDiv =
            "<div class='' style='margin-bottom:10px'>" +
            questionDiv +
            "</div>";
        }
        sectionDataArr.map((a) => {
          if (a.StartId === q && s === 0) {
            oneQuestionDiv =
              `<div style='text-align:center; font-weight: 700; text-decoration: underline;'>${a.Sections}</div>` +
              "<div class='qmarks' style='margin-bottom:20px'>" +
              questionDiv +
              marksDiv +
              "</div>";
          }
        });
        let answerDiv = getAnswerDiv(
          questtionlist[q].Questions[s],
          s + 1,
          questtionlist[q].Questions.length
        );
        allquestionsDiv = allquestionsDiv + oneQuestionDiv + answerDiv;
      }
      // let questionDiv = getQuestionDiv(questtionlist[q].Questions[0]);
      // questionDiv = questionDiv + getMarksDiv(questtionlist[q].Questions[0]);
      // questionDiv = questionDiv + getAnswerDiv(questtionlist[q].Questions[0]);

      // allquestionsDiv = allquestionsDiv + questionDiv;
    }
    const totalMarks = paperTemplateInfo.TotalMarks.toFixed(0);
    const NegativeMarks = paperTemplateInfo.NegativeMarks.toFixed(0);
    // console.log("allquestionsDiv", allquestionsDiv);
    content = content.replace(
      "$$examname$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.Name
    ); //paperTemplateInfo.Name);
    content = content.replace(
      "$$ClassName$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.ClassName
    );
    content = content.replace(
      "$$SubjectName$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.SubjectName
    );
    content = content.replace(
      "$$TotalMarks$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.TotalMarks
    ); //totalMarks);
    content = content.replace(
      "$$Duration$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.Duration
    );
    content = content.replace(
      "$$PaperHeaderImage$$",
      parsedHeaderData?.data?.PaperHeaderImage
    );
    content = content.replace(
      "$$PaperHeaderName$$",
      parsedHeaderData?.data?.PaperHeaderName
    );
    content = content.replace(
      "$$PaperHeaderAddress$$",
      parsedHeaderData?.data?.PaperHeaderAddress
    );
    if (NegativeMarks == 0) {
      content = content.replace("negativeMark", "");
    } else {
      let str = `
      <td style="
                border: 1px solid #3a5077;
                padding-left: 5px;
                padding-right: 5px;
              ">
                        Negative Marks: ${NegativeMarks}
                    </td>
      `;
      content = content.replace("negativeMark", str);
    }
    content = content.replace(
      "$$TotalQuestionCount$$",
      paperTemplateInfo.TotalQuestionCount
    );

    if (headerInstructionList.length > 0) {
      let instructionText = `<div _ngcontent-jxa-c16="" class="row ng-star-inserted">
      <div _ngcontent-jxa-c16="" class="col-12 col-md-12 instructions ml-3" style="border-top: 1px solid #D1DAE6; margin: 10px; margin-bottom: 0">
      <p _ngcontent-jxa-c16="" class="texthead py-2 m-0 " style="padding: 10px; color:#3a5077;">Instructions</p>
      <div _ngcontent-jxa-c16="" class="steptext ng-star-inserted">
      $$instructionOptions$$</div></div></div>`;
      let instructionOptions = "";
      for (let i = 0; i < headerInstructionList.length; i++) {
        instructionOptions += `<div _ngcontent-jxa-c16="" class="steptext mr-1"> ${headerInstructionList[i]?.InstructionNumber}. ${headerInstructionList[i]?.Instruction}. 
        </div>`;
      }
      instructionText = instructionText.replace(
        "$$instructionOptions$$",
        instructionOptions
      );
      content = content.replace("$$instructions$$", instructionText);
    } else {
      content = content.replace("$$instructions$$", "");
    }

    const waterMarkText = await getWaterMark(parsedHeaderData);
    if (waterMarkText) {
      content = content.replace("$$watermark$$", waterMarkText.str);
    } else {
      content = content.replace("$$watermark$$", "");
    }

    //
    // if (sectionDataArr.length > 0) {
    //   if (((sectionDataArr[0].FontSize != "") && (sectionDataArr[0].FontName != ""))) {
    //     FontSize = sectionDataArr[0].FontSize;
    //     FontName = sectionDataArr[0].FontName;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    //   if (sectionDataArr[0].FontSize != "") {
    //     FontSize = sectionDataArr[0].FontSize;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    //   if (sectionDataArr[0].FontName != "") {
    //     FontName = sectionDataArr[0].FontName;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    // }

    if (fontSizeFontFamilyData.data != null) {
      if (
        fontSizeFontFamilyData.data.FontSize != "" &&
        fontSizeFontFamilyData.data.FontName != ""
      ) {
        FontSize = fontSizeFontFamilyData.data.FontSize;
        FontName = fontSizeFontFamilyData.data.FontName;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
      if (fontSizeFontFamilyData.data.FontSize != "") {
        FontSize = fontSizeFontFamilyData.data.FontSize;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
      if (fontSizeFontFamilyData.data.FontName != "") {
        FontName = fontSizeFontFamilyData.data.FontName;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
    }
    //

    content = content.replace("$$allquestionsDiv$$", allquestionsDiv);

    content = content.replace(/fontsize/g, `${FontSize}px`);
    content = content.replace(/fontfamily/g, `${FontName}`);
    let uniqueName = EAPaperTemplateID;
    uniqueName = uniqueName + "answer";
    let reqPath = path.join(__dirname, `/${uniqueName}.html`);
    console.log("reqPath", reqPath);
    fs.writeFileSync(reqPath, content);
    console.log("Log", "HTML FIle Saved");

    await waittime();
    console.log("Log", "Wait finish");

    try {
      console.log("Log", "Staring pupeeter");
      const browser = await puppeteer.launch({
        // executablePath: path.resolve(
        //   __dirname,
        //   "../node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome"
        // ),
        // executablePath: "/usr/bin/chromium",
        // executablePath: '/usr/bin/google-chrome-stable',
        // executablePath: '/usr/bin/google-chrome',
        executablePath: "/usr/bin/chromium-browser",
        // headless: true,
        // args: ['--use-gl=egl'],
        // defaultViewport: {
        //   width: 136,
        //   height: 842,
        //   deviceScaleFactor: 1
        // },
        // args: [
        //   '--window-size=1920,1080',
        // ],
        args: ["--no-sandbox"],
      });
      console.log("Log", "Pupeeter launch");
      const page = await browser.newPage();

      console.log("Log", "Page open");

      const bufcontent = fs.readFileSync(reqPath, {
        encoding: "utf8",
        flag: "r",
      });

      // let base64 = Buffer.from(bufcontent, "utf8").toString("base64");
      // console.log(base64);

      await page.setContent(bufcontent, {
        // waitUntil: 'domcontentloaded',
        waitUntil: "networkidle0",
        timeout: 0,
      });

      // await page.goto(`data:text/html;UTF-8;base64,${base64}`,
      //   {
      //     waitUntil: 'networkidle0',
      //     timeout: 0
      //   });

      await page.waitForTimeout(2000);
      await page.emulateMediaType("print");

      console.log("Log", "Buffer generate");
      var savePath = `${__dirname}/${uniqueName}.pdf`;
      console.log("savePath", savePath);
      await page.addStyleTag({
        content: "@page { size:1100px 1380px; }",
      });
      await page.pdf({
        // format: 'A2',1024px
        // printBackground: true,
        // format: 'A4',
        // landscape: true,
        // margin: { top: '0.5cm', bottom: '0.5cm' },//left: '0cm', right: '0cm',
        // width: '3508px',
        // height: '2480px',
        // height: height / 0.75,
        // width: width / 0.75,
        // scale: 1 / 0.75,
        // printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: ``,
        footerTemplate: `
        <div style="width: 100%; font-size: 9px;
        padding: 0px 0px 0; color: #bbb; position: relative;">
        <div style="position: absolute; right: 5px; top: 5px;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
        `,
        // this is needed to prevent content from being placed over the footer
        // margin: { bottom: '70px' },
        margin: { top: "0cm" },
        path: savePath,
      });
      console.log("Log", "mark process done");
      delete processes[EAPaperTemplateID];
      await browser.close();
      return savePath;
    } catch (error) {
      console.log("Log", "In catch");
      delete processes[EAPaperTemplateID];
      console.log(error);
      return null;
    }
  } catch (error) {
    console.log(error);
  }
};

const generateQuestionPDF = async (req) => {
  const {
    EAPaperTemplateID,
    EAExamAssignID,
    url,
    token,
    StudentID,
    IsOMRPaper,
  } = req.body;
  if (processes[EAPaperTemplateID]) {
    return;
  }
  try {
    processes[EAPaperTemplateID] = true;
    const data = await getAPIResponse(
      EAPaperTemplateID,
      EAExamAssignID,
      url,
      token
    );
    const headerData = await getHeaderInfo(StudentID,EAPaperTemplateID, url, token);
    const templateInfoData = await getPaperTemplateInfo(
      EAPaperTemplateID,
      IsOMRPaper,
      url,
      token
    );
    const getSectionInfoData = await getSectionInfo(
      EAPaperTemplateID,
      url,
      token
    );
    const fontSizeFontFamilyInfoData = await getFontSizeFontFamilyInfo(
      EAPaperTemplateID,
      url,
      token
    );
    let content = fs.readFileSync(`${__dirname}/index.html`, {
      encoding: "utf8",
    });
    const parsedData = JSON.parse(data);
    let parsedHeaderData = JSON.parse(headerData);
    if(!parsedHeaderData)
    {
      parsedHeaderData = req.body.paperHeaderData
    }
    const parsedTemplateInfoData = JSON.parse(templateInfoData);
    const questtionlist = parsedData.data.QuestionInstruction;
    const paperTemplateInfo = parsedData.data.paperTemplateInfo;
    const headerInstructionList = parsedData.data.HeaderInstruction;
    const sectionInfoData = JSON.parse(getSectionInfoData);
    const sectionDataArr = sectionInfoData.data;
    const fontSizeFontFamilyData = JSON.parse(fontSizeFontFamilyInfoData);
    // console.log("questtionlistlength->", questtionlist);

    let allquestionsDiv = "";

    for (let q = 0; q < (questtionlist || []).length; q++) {
      let oneQuestionDiv = "";
      for (let s = 0; s < (questtionlist[q].Questions || []).length; s++) {
        let questionDiv = getQuestionDiv(
          questtionlist[q].Questions[s],
          s + 1,
          questtionlist[q].Questions.length
        );
        let marksDiv = getMarksDiv(questtionlist[q].Questions[s]);
        if (
          questtionlist[q].Questions.length > s + 1 ||
          questtionlist[q].Questions.length == 1
        ) {
          oneQuestionDiv =
            "<div class='qmarks' style='margin-bottom:10px'>" +
            questionDiv +
            marksDiv +
            "</div>";
        } else {
          oneQuestionDiv =
            "<div class='' style='margin-bottom:10px'>" +
            questionDiv +
            "</div>";
        }
        sectionDataArr.map((a) => {
          if (a.StartId === q && s === 0) {
            oneQuestionDiv =
              `<div style='text-align:center; font-weight: 700; text-decoration: underline;'>${a.Sections}</div>` +
              "<div class='qmarks' style='margin-bottom:20px'>" +
              questionDiv +
              marksDiv +
              "</div>";
          }
        });
        allquestionsDiv = allquestionsDiv + oneQuestionDiv;
      }
    }
    const totalMarks = paperTemplateInfo.TotalMarks.toFixed(0);
    const NegativeMarks = paperTemplateInfo.NegativeMarks.toFixed(0);
    // console.log("allquestionsDiv", allquestionsDiv);
    content = content.replace(
      "$$examname$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.Name
    ); //paperTemplateInfo.Name);
    content = content.replace(
      "$$ClassName$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.ClassName
    );
    content = content.replace(
      "$$SubjectName$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.SubjectName
    );
    content = content.replace(
      "$$TotalMarks$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.TotalMarks
    ); //totalMarks);
    content = content.replace(
      "$$Duration$$",
      parsedTemplateInfoData?.data?.paperTemplateInfo?.Duration
    );
    content = content.replace(
      "$$PaperHeaderImage$$",
      parsedHeaderData?.data?.PaperHeaderImage
    );
    content = content.replace(
      "$$PaperHeaderName$$",
      parsedHeaderData?.data?.PaperHeaderName
    );
    content = content.replace(
      "$$PaperHeaderAddress$$",
      parsedHeaderData?.data?.PaperHeaderAddress
    );
    if (NegativeMarks == 0) {
      content = content.replace("negativeMark", "");
    } else {
      let str = `
      <td style="
                border: 1px solid #3a5077;
                padding-left: 5px;
                padding-right: 5px;
              ">
                        Negative Marks: ${NegativeMarks}
                    </td>
      `;
      content = content.replace("negativeMark", str);
    }
    content = content.replace(
      "$$TotalQuestionCount$$",
      paperTemplateInfo.TotalQuestionCount
    );

    if (headerInstructionList.length > 0) {
      let instructionText = `<div _ngcontent-jxa-c16="" class="row ng-star-inserted">
      <div _ngcontent-jxa-c16="" class="col-12 col-md-12 instructions ml-3" style="border-top: 1px solid #D1DAE6; margin: 10px; margin-bottom: 0">
      <p _ngcontent-jxa-c16="" class="texthead py-2 m-0 "style="padding: 10px; color:#3a5077; ">Instructions</p>
      <div _ngcontent-jxa-c16="" class="steptext ng-star-inserted">
      $$instructionOptions$$</div></div></div>`;
      let instructionOptions = "";
      for (let i = 0; i < headerInstructionList.length; i++) {
        instructionOptions += `<div _ngcontent-jxa-c16="" class="steptext mr-1"> ${headerInstructionList[i]?.InstructionNumber}. ${headerInstructionList[i]?.Instruction}. 
        </div>`;
      }
      instructionText = instructionText.replace(
        "$$instructionOptions$$",
        instructionOptions
      );
      content = content.replace("$$instructions$$", instructionText);
    } else {
      content = content.replace("$$instructions$$", "");
    }

    const waterMarkText = await getWaterMark(parsedHeaderData);
    if (waterMarkText) {
      content = content.replace("$$watermark$$", waterMarkText.str);
    } else {
      content = content.replace("$$watermark$$", "");
    }

    //
    // if (sectionDataArr.length > 0) {
    //   if (((sectionDataArr[0].FontSize != "") && (sectionDataArr[0].FontName != ""))) {
    //     FontSize = sectionDataArr[0].FontSize;
    //     FontName = sectionDataArr[0].FontName;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    //   if (sectionDataArr[0].FontSize != "") {
    //     FontSize = sectionDataArr[0].FontSize;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    //   if (sectionDataArr[0].FontName != "") {
    //     FontName = sectionDataArr[0].FontName;
    //     allquestionsDiv = `<div class="dynamicStyle"
    //     style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
    //   }
    // }

    if (fontSizeFontFamilyData.data != null) {
      if (
        fontSizeFontFamilyData.data.FontSize != "" &&
        fontSizeFontFamilyData.data.FontName != ""
      ) {
        FontSize = fontSizeFontFamilyData.data.FontSize;
        FontName = fontSizeFontFamilyData.data.FontName;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
      if (fontSizeFontFamilyData.data.FontSize != "") {
        FontSize = fontSizeFontFamilyData.data.FontSize;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
      if (fontSizeFontFamilyData.data.FontName != "") {
        FontName = fontSizeFontFamilyData.data.FontName;
        allquestionsDiv = `<div class="dynamicStyle"
          style="font-size: ${FontSize}px !important; font-family: '${FontName}'!important;"> ${allquestionsDiv} </div>`;
      }
    }

    //

    content = content.replace("$$allquestionsDiv$$", allquestionsDiv);

    content = content.replace(/fontsize/g, `${FontSize}px`);
    content = content.replace(/fontfamily/g, `${FontName}`);
    let uniqueName = EAPaperTemplateID;
    uniqueName = uniqueName + "question";
    let reqPath = path.join(__dirname, `/${uniqueName}.html`);
    console.log("reqPath", reqPath);
    fs.writeFileSync(reqPath, content);
    console.log("Log", "HTML FIle Saved");

    await waittime();
    console.log("Log", "Wait finish");

    try {
      console.log("Log", "Staring pupeeter");
      const browser = await puppeteer.launch({
        // executablePath: path.resolve(
        //   __dirname,
        //   "../node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome"
        // ),
        // executablePath: "/usr/bin/chromium",
        //executablePath: '/usr/bin/google-chrome-stable',
        // executablePath: '/usr/bin/google-chrome',
        executablePath: "/usr/bin/chromium-browser",
        // headless: true,
        // args: ['--use-gl=egl'],

        args: ["--no-sandbox"],
      });
      console.log("Log", "Pupeeter launch");
      const page = await browser.newPage();

      console.log("Log", "Page open");

      const bufcontent = fs.readFileSync(reqPath, {
        encoding: "utf8",
        flag: "r",
      });

      // let base64 = Buffer.from(bufcontent, "utf8").toString("base64");
      // console.log(base64);

      await page.setContent(bufcontent, {
        // waitUntil: 'domcontentloaded',
        waitUntil: "networkidle0",
        timeout: 0,
      });

      // await page.goto(`data:text/html;UTF-8;base64,${base64}`,
      //   {
      //     waitUntil: 'networkidle0',
      //     timeout: 0
      //   });

      await page.waitForTimeout(2000);
      await page.emulateMediaType("print");

      console.log("Log", "Buffer generate");
      var savePath = `${__dirname}/${uniqueName}.pdf`;
      console.log("savePath", savePath);
      await page.addStyleTag({
        content: "@page { size:1100px 1380px; }",
      });

      // await page.evaluate(() => {
      //   const div = document.createElement('div');
      //   div.innerHTML = 'OyeExams Watermark Text...';
      //   div.style.cssText = "position: fixed; bottom: 10px; right: 10px; background: red; z-index: -1";
      //   document.body.appendChild(div);
      // });

      await page.pdf({
        // format: 'A4',
        // landscape: true,
        // margin: { top: '0.5cm', bottom: '0.5cm' },//left: '0cm', right: '0cm',
        //
        displayHeaderFooter: true,
        headerTemplate: ``,
        footerTemplate: `
        <div style="width: 100%; font-size: 9px;
        padding: 0px 0px 0; color: #bbb; position: relative;">
        <div style="position: absolute; right: 5px; top: 5px;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  `,
        // this is needed to prevent content from being placed over the footer
        // margin: { bottom: '70px' },
        //
        path: savePath,
        margin: { top: "0cm" },
      });
      console.log("Log", "mark process done");
      delete processes[EAPaperTemplateID];
      await browser.close();
      return savePath;
    } catch (error) {
      console.log("Log", "In catch");
      delete processes[EAPaperTemplateID];
      console.log(error);
      return null;
    }
  } catch (error) {
    console.log(error);
  }
};

let removeDataCronJob = new CronJob("42 18 * * *", async function () {
  fs.readdir(__dirname, function (err, files) {
    const EXTENSION = '.pdf';

    const targetFiles = files.filter(file => {
      return (path.extname(file).toLowerCase() === EXTENSION) || (path.extname(file).toLowerCase() === ".html" && file != "index.html" && file != "abc.html" && file != "test.html")
    });
    for (let i = 0; i < targetFiles.length; i++) {
      let { birthtime } = fs.statSync(targetFiles[i])
      let currenDate = new Date()
      let expirationDate = currenDate.setDate(currenDate.getDate() - 7);
      console.log(birthtime)
      if (new Date(birthtime) <= new Date(expirationDate)) {
        fs.unlink(path.join(__dirname, targetFiles[i]), () => {
          console.log(targetFiles[i] + " - deleted")
        })
      }
    }
    console.log(targetFiles)
  })
});
removeDataCronJob.start();

app.post("/remove-pdf", async (req, res) => {
  const { EAPaperTemplateID } = req.body;
  const fileName1 = EAPaperTemplateID + "answer";
  const fileName2 = EAPaperTemplateID + "question";
  const pdfPath1 = `${__dirname}/${fileName1}.pdf`;
  const htmlPath1 = `${__dirname}/${fileName1}.html`;
  const pdfPath2 = `${__dirname}/${fileName2}.pdf`;
  const htmlPath2 = `${__dirname}/${fileName2}.html`;

  try {
    if (fs.existsSync(pdfPath1) && fs.existsSync(pdfPath2)) {
      fs.unlinkSync(pdfPath1);
      fs.unlinkSync(htmlPath1);
      fs.unlinkSync(pdfPath2);
      fs.unlinkSync(htmlPath2);
    } else if (fs.existsSync(pdfPath1)) {
      fs.unlinkSync(pdfPath1);
      fs.unlinkSync(htmlPath1);
    } else if (fs.existsSync(pdfPath2)) {
      fs.unlinkSync(pdfPath2);
      fs.unlinkSync(htmlPath2);
    } else {
      // res.send({ success: true, msg: "file deleted" });
    }
  } catch (error) {
    console.log(error);
  }
  res.send({ success: true, msg: "file deleted" });
});
app.listen(port, () => {
  console.log("Listening to port", port);
});
