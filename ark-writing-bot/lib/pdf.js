import PDFDocument from "pdfkit";

function safe(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value)
    .replace(/[‘’ʻʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

function band(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : safe(value);
}

function addHeading(doc, text, size = 15) {
  doc.moveDown(0.7);
  doc.font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.25);
}

function addBody(doc, text, options = {}) {
  doc.font("Helvetica").fontSize(10.5).text(safe(text), { lineGap: 2, ...options });
}

function ensureSpace(doc, needed = 90) {
  if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

export function createFeedbackPdf(assessment, studentName = "Student") {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "ARK Writing Feedback" } });
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(22).text("ARK Writing Feedback");
    doc.font("Helvetica").fontSize(10).text(`Student: ${safe(studentName)}`);
    doc.text(`Task: ${safe(assessment.title, "Writing Task")}`);
    doc.text(`Type: ${safe(assessment.task_type, "Unknown")}    Word count: ${safe(assessment.word_count)}`);
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(18).text(`Estimated Band: ${band(assessment.estimated_band)}`);
    doc.moveDown(0.6);

    const criteria = [
      ["Task Response / Achievement", assessment.task_response],
      ["Coherence & Cohesion", assessment.coherence_cohesion],
      ["Lexical Resource", assessment.lexical_resource],
      ["Grammar Range & Accuracy", assessment.grammar_accuracy]
    ];

    for (const [name, item] of criteria) {
      ensureSpace(doc, 75);
      doc.font("Helvetica-Bold").fontSize(11.5).text(`${name}: ${band(item?.band)}`);
      addBody(doc, item?.feedback);
      doc.moveDown(0.4);
    }

    addHeading(doc, "Overall Feedback");
    addBody(doc, assessment.summary);

    if (Array.isArray(assessment.paragraph_feedback) && assessment.paragraph_feedback.length) {
      addHeading(doc, "Paragraph-by-paragraph");
      for (const item of assessment.paragraph_feedback) {
        ensureSpace(doc, 70);
        doc.font("Helvetica-Bold").fontSize(10.5).text(safe(item.section));
        addBody(doc, item.feedback);
        doc.moveDown(0.3);
      }
    }

    if (Array.isArray(assessment.corrections) && assessment.corrections.length) {
      addHeading(doc, "Important Corrections");
      assessment.corrections.slice(0, 18).forEach((item, i) => {
        ensureSpace(doc, 90);
        doc.font("Helvetica-Bold").fontSize(10.5).text(`${i + 1}. ${safe(item.category, "Correction")}`);
        doc.font("Helvetica").fontSize(10).text(`Original: ${safe(item.original)}`);
        doc.font("Helvetica-Bold").fontSize(10).text(`Better: ${safe(item.corrected)}`);
        doc.font("Helvetica").fontSize(9.5).text(`Why: ${safe(item.reason)}`, { lineGap: 2 });
        doc.moveDown(0.45);
      });
    }

    if (Array.isArray(assessment.better_sentences) && assessment.better_sentences.length) {
      addHeading(doc, "Stronger Sentence Options");
      assessment.better_sentences.slice(0, 5).forEach((item, i) => {
        ensureSpace(doc, 65);
        doc.font("Helvetica").fontSize(10).text(`${i + 1}. ${safe(item.original)}`);
        doc.font("Helvetica-Bold").fontSize(10).text(`   -> ${safe(item.improved)}`);
        doc.moveDown(0.35);
      });
    }

    if (Array.isArray(assessment.top_priorities) && assessment.top_priorities.length) {
      addHeading(doc, "Top Priorities");
      assessment.top_priorities.slice(0, 5).forEach((item, i) => addBody(doc, `${i + 1}. ${item}`));
    }

    if (assessment.note) {
      addHeading(doc, "Note", 12);
      addBody(doc, assessment.note);
    }

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(8).text("ARK Writing Feedback - automated assessment support", { align: "center" });
    doc.end();
  });
}
