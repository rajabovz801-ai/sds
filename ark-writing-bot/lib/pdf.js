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

function addHeading(doc, text, size = 14) {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(size).text(text);
  doc.moveDown(0.2);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - 48, doc.y).stroke();
  doc.moveDown(0.35);
}

function addBody(doc, text, options = {}) {
  doc.font("Helvetica").fontSize(10.5).text(safe(text), { lineGap: 2.2, ...options });
}

function ensureSpace(doc, needed = 90) {
  if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

export function createFeedbackPdf(assessment, studentName = "Student") {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: { Title: "ARK Education IELTS Writing Feedback" }
    });

    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(11).text("ARK EDUCATION CENTRE", { align: "center" });
    doc.font("Helvetica-Bold").fontSize(22).text("IELTS Writing Feedback", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).text(`O'quvchi: ${safe(studentName)}`);
    doc.text(`Task: ${safe(assessment.title, "Writing Task")}`);
    doc.text(`Turi: ${safe(assessment.task_type, "Unknown")}    So'zlar soni: ${safe(assessment.word_count)}`);
    doc.moveDown(0.6);

    if (Array.isArray(assessment.corrections) && assessment.corrections.length) {
      addHeading(doc, "1. Birinchi navbatda: xatolar va tuzatishlar");
      assessment.corrections.slice(0, 18).forEach((item, i) => {
        ensureSpace(doc, 105);
        doc.font("Helvetica-Bold").fontSize(10.5).text(`${i + 1}. ${safe(item.category, "Xato")}`);
        doc.font("Helvetica").fontSize(10).text(`Siz yozgansiz: ${safe(item.original)}`);
        doc.font("Helvetica-Bold").fontSize(10).text(`To'g'riroq variant: ${safe(item.corrected)}`);
        doc.font("Helvetica").fontSize(9.5).text(`Nima uchun: ${safe(item.reason)}`, { lineGap: 2 });
        doc.moveDown(0.5);
      });
    } else {
      addHeading(doc, "1. Birinchi navbatda: xatolar va tuzatishlar");
      addBody(doc, "Aniq correction ro'yxati topilmadi yoki submission yetarli darajada o'qilmadi.");
    }

    addHeading(doc, "2. IELTS band tahlili");
    doc.font("Helvetica-Bold").fontSize(18).text(`Taxminiy Overall Band: ${band(assessment.estimated_band)}`);
    doc.moveDown(0.5);

    const criteria = [
      ["Task Achievement / Response", assessment.task_response],
      ["Coherence & Cohesion", assessment.coherence_cohesion],
      ["Lexical Resource", assessment.lexical_resource],
      ["Grammar Range & Accuracy", assessment.grammar_accuracy]
    ];

    for (const [name, item] of criteria) {
      ensureSpace(doc, 80);
      doc.font("Helvetica-Bold").fontSize(11.5).text(`${name}: ${band(item?.band)}`);
      addBody(doc, item?.feedback);
      doc.moveDown(0.4);
    }

    addHeading(doc, "3. Ustoz uslubidagi umumiy feedback");
    addBody(doc, assessment.summary);

    if (Array.isArray(assessment.paragraph_feedback) && assessment.paragraph_feedback.length) {
      addHeading(doc, "4. Paragrafma-paragraf tahlil");
      for (const item of assessment.paragraph_feedback) {
        ensureSpace(doc, 75);
        doc.font("Helvetica-Bold").fontSize(10.5).text(safe(item.section));
        addBody(doc, item.feedback);
        doc.moveDown(0.35);
      }
    }

    if (Array.isArray(assessment.better_sentences) && assessment.better_sentences.length) {
      addHeading(doc, "5. Kuchliroq yozish variantlari");
      assessment.better_sentences.slice(0, 6).forEach((item, i) => {
        ensureSpace(doc, 70);
        doc.font("Helvetica").fontSize(10).text(`${i + 1}. Sizning gapingiz: ${safe(item.original)}`);
        doc.font("Helvetica-Bold").fontSize(10).text(`   Yaxshiroq: ${safe(item.improved)}`);
        doc.moveDown(0.4);
      });
    }

    if (Array.isArray(assessment.top_priorities) && assessment.top_priorities.length) {
      addHeading(doc, "6. Keyingi Writing uchun vazifa");
      assessment.top_priorities.slice(0, 5).forEach((item, i) => {
        addBody(doc, `${i + 1}. ${item}`);
        doc.moveDown(0.15);
      });
    }

    if (assessment.note) {
      addHeading(doc, "Eslatma", 12);
      addBody(doc, assessment.note);
    }

    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(8).text(
      "ARK Education Centre - avtomatik IELTS Writing baholash yordami. Yakuniy rasmiy IELTS band emas.",
      { align: "center" }
    );
    doc.end();
  });
}
