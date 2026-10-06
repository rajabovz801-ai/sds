import PDFDocument from "pdfkit";
import { MAX_QUESTIONS_PER_SHEET } from "./material-standards.mjs";

function drawHeader(doc, quiz) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font("Times-Bold").fontSize(10).text("ARK EDUCATION CENTRE", { align: "center", characterSpacing: 0.8 });
  doc.moveDown(0.25);
  doc.font("Times-Bold").fontSize(17).text(String(quiz.title || "English Test"), { align: "center", lineGap: 1 });
  doc.moveDown(0.25);
  doc.font("Times-Roman").fontSize(10.5).text(`${quiz.questions.length} ta savol${quiz.level ? `  •  ${quiz.level}` : ""}`, { align: "center" });
  doc.moveDown(0.45);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + width, doc.y).lineWidth(0.7).strokeColor("#333333").stroke();
  return doc.y + 12;
}

function questionMetrics(doc, question, index, width, scale = 1) {
  const cleanQuestion = String(question.question || "").replace(/^\s*\d{1,2}\s*[.)-]\s*/, "");
  const questionText = `${index + 1}. ${cleanQuestion}`;
  const optionsText = question.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}) ${option}`).join("   ");
  const questionStyle = { width, lineGap: 0.5 };
  const optionStyle = { width, lineGap: 0.1 };

  doc.font("Times-Bold").fontSize(13 * scale);
  const questionHeight = doc.heightOfString(questionText, questionStyle);
  doc.font("Times-Roman").fontSize(11.7 * scale);
  const optionHeight = doc.heightOfString(optionsText, optionStyle);
  const blockHeight = questionHeight + 2.5 + optionHeight;
  return { questionText, optionsText, questionStyle, optionStyle, questionHeight, optionHeight, blockHeight };
}

function drawQuestion(doc, question, index, x, width, y, pageBottom, extraGap = 0, scale = 1) {
  const { questionText, optionsText, questionStyle, optionStyle, questionHeight, optionHeight, blockHeight } = questionMetrics(doc, question, index, width, scale);
  if (y + blockHeight > pageBottom) return null;

  doc.font("Times-Bold").fontSize(13 * scale).text(questionText, x, y, questionStyle);
  let currentY = y + questionHeight + 1.2;
  doc.font("Times-Roman").fontSize(11.7 * scale);
  doc.text(optionsText, x + 4, currentY, optionStyle);
  currentY += optionHeight;
  return currentY + 1.3 + extraGap;
}

export async function renderQuizPdf(quiz) {
  if (!Array.isArray(quiz?.questions) || quiz.questions.length === 0) throw new Error("Cannot create a PDF without questions");
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 36, right: 42, bottom: 38, left: 42 }, bufferPages: true, info: { Title: `${quiz.title || "English Test"} - ARK Education` } });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left - doc.page.margins.right;
    const columnGap = 24;
    const columnWidth = (contentWidth - columnGap) / 2;
    const rightColumnX = left + columnWidth + columnGap;
    const pageBottom = doc.page.height - doc.page.margins.bottom - 20;
    const plannedPageCount = Math.ceil(quiz.questions.length / MAX_QUESTIONS_PER_SHEET);
    for (let pageIndex = 0; pageIndex < plannedPageCount; pageIndex += 1) {
      if (pageIndex > 0) doc.addPage();
      const pageStart = pageIndex * MAX_QUESTIONS_PER_SHEET;
      const pageQuestions = quiz.questions.slice(pageStart, pageStart + MAX_QUESTIONS_PER_SHEET);
      const leftCount = Math.ceil(pageQuestions.length / 2);
      const columns = [
        { x: left, items: pageQuestions.slice(0, leftCount), startIndex: pageStart },
        { x: rightColumnX, items: pageQuestions.slice(leftCount), startIndex: pageStart + leftCount }
      ];
      const columnStartY = drawHeader(doc, quiz);
      doc.moveTo(left + columnWidth + columnGap / 2, columnStartY - 3)
        .lineTo(left + columnWidth + columnGap / 2, pageBottom)
        .lineWidth(0.35).strokeColor("#cccccc").stroke();

      for (const column of columns) {
        if (!column.items.length) continue;
        let cursorY = columnStartY;
        let scale = 1;
        let metrics = [];
        let totalHeight = 0;
        while (scale >= 0.68) {
          metrics = column.items.map((question, offset) => questionMetrics(doc, question, column.startIndex + offset, columnWidth, scale));
          totalHeight = metrics.reduce((sum, item) => sum + item.blockHeight, 0);
          if (totalHeight <= pageBottom - cursorY) break;
          scale -= 0.04;
        }
        if (totalHeight > pageBottom - cursorY) {
          reject(new Error(`Questions ${column.startIndex + 1}-${column.startIndex + column.items.length} do not fit the A4 two-column layout`));
          return;
        }

        const extraGap = column.items.length > 1
          ? Math.min(7, Math.max(0, (pageBottom - cursorY - totalHeight - 8) / (column.items.length - 1)))
          : 0;
        for (let offset = 0; offset < column.items.length; offset += 1) {
          const index = column.startIndex + offset;
          const nextY = drawQuestion(doc, column.items[offset], index, column.x, columnWidth, cursorY, pageBottom, extraGap, scale);
          if (nextY === null) {
            reject(new Error(`Question ${index + 1} does not fit the A4 two-column layout`));
            return;
          }
          cursorY = nextY;
        }
      }
    }

    const range = doc.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page += 1) {
      doc.switchToPage(page);
      doc.font("Times-Italic").fontSize(9).fillColor("#555555");
      doc.text(`ARK EDUCATION CENTRE  •  ${page + 1} / ${range.count}`, 42, doc.page.height - 54, { width: doc.page.width - 84, align: "center", lineBreak: false });
    }
    doc.end();
  });
}

export async function renderMaterialPdf(title, content) {
  const body = String(content || "").trim();
  if (!body) throw new Error("Cannot create a PDF without material text");
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 42, right: 48, bottom: 42, left: 48 }, bufferPages: true, info: { Title: `${title || "ARK Education"} - ARK Education` } });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font("Times-Bold").fontSize(10.5).text("ARK EDUCATION CENTRE", { align: "center", characterSpacing: 0.8 });
    doc.moveDown(0.4);
    doc.font("Times-Bold").fontSize(17).text(String(title || "English Learning Material"), { align: "center" });
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + width, doc.y).lineWidth(0.7).strokeColor("#333333").stroke();
    doc.moveDown(0.8);
    doc.font("Times-Roman").fontSize(13).fillColor("#111111").text(body, { width, lineGap: 4, paragraphGap: 7, align: "left" });

    const range = doc.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page += 1) {
      doc.switchToPage(page);
      doc.font("Times-Italic").fontSize(9).fillColor("#555555");
      doc.text(`ARK EDUCATION CENTRE  •  ${page + 1} / ${range.count}`, 48, doc.page.height - 56, { width: doc.page.width - 96, align: "center", lineBreak: false });
    }
    doc.end();
  });
}
