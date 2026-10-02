import test from "node:test";
import assert from "node:assert/strict";
import { renderQuizPdf } from "../ark-writing-bot/lib/agents/quiz-pdf.mjs";

function quizWith(count) {
  return {
    title: "Present Perfect Test",
    level: "B1",
    questions: Array.from({ length: count }, (_, index) => ({
      question: `Question ${index + 1}: Choose the correct verb form.`,
      options: ["has worked", "have worked", "is working", "worked"],
      correct_option_id: index % 4
    }))
  };
}

test("30 question quiz PDF fits one A4 sheet in two columns", async () => {
  const pdf = await renderQuizPdf(quizWith(30));
  const source = pdf.toString("latin1");
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.match(source, /\/MediaBox\s*\[0 0 595\.28 841\.89\]/);
  assert.equal((source.match(/\/Type \/Page\b/g) || []).length, 1);
  assert.ok(pdf.length > 10_000);
});

test("60 question quiz PDF uses exactly two A4 sheets with 30 questions per sheet", async () => {
  const pdf = await renderQuizPdf(quizWith(60));
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 2);
});

test("short quiz PDF uses one A4 page", async () => {
  const pdf = await renderQuizPdf(quizWith(4));
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
});
