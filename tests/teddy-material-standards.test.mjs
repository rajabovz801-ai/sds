import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRequestedQuestionCount,
  validateQuizQuestions,
  formatSpoilerAnswerKey,
  randomizeCorrectAnswerPositions
} from "../ark-writing-bot/lib/agents/material-standards.mjs";

test("quiz requests support up to 60 questions and safely cap larger requests", () => {
  assert.equal(parseRequestedQuestionCount("30 ta present perfect test"), 30);
  assert.equal(parseRequestedQuestionCount("60 ta test"), 60);
  assert.equal(parseRequestedQuestionCount("75 ta test"), 60);
  assert.equal(parseRequestedQuestionCount("test tuz"), 10);
});

test("correct answers are balanced across A-D while options and answer keys stay aligned", () => {
  const questions = Array.from({ length: 30 }, (_, index) => ({
    question: `Question ${index + 1}`,
    options: ["Alpha", "Bravo", "Charlie", "Delta"],
    correct_option_id: index % 4
  }));
  const randomized = randomizeCorrectAnswerPositions(questions, max => max - 1);
  const counts = [0, 0, 0, 0];
  randomized.forEach((question, index) => {
    counts[question.correct_option_id] += 1;
    assert.equal(question.options[question.correct_option_id], questions[index].options[questions[index].correct_option_id]);
  });
  assert.deepEqual(counts.sort((a, b) => a - b), [7, 7, 8, 8]);
});

test("quiz validation rejects missing, repeated, ambiguous, or malformed questions", () => {
  const good = [{ question: "Choose the correct form.", options: ["A", "B", "C", "D"], correct_option_id: 1 }];
  assert.deepEqual(validateQuizQuestions(good, 1), good);
  assert.throws(() => validateQuizQuestions([], 1), /exactly 1 questions/);
  assert.throws(() => validateQuizQuestions([{ ...good[0], options: ["A", "A", "C", "D"] }], 1), /duplicate options/);
  assert.throws(() => validateQuizQuestions([{ ...good[0], question: "  " }], 1), /question 1/);
  assert.throws(() => validateQuizQuestions([{ ...good[0], correct_option_id: 4 }], 1), /question 1/);
  assert.throws(() => validateQuizQuestions([good[0], { ...good[0], question: "choose the correct form" }], 2), /duplicates an earlier question/);
  assert.deepEqual(validateQuizQuestions([{ ...good[0], options: ["A) Alpha", "B) Beta", "C) Gamma", "D) Delta"] }], 1)[0].options, ["Alpha", "Beta", "Gamma", "Delta"]);
});

test("answer key is formatted as a separate Telegram spoiler", () => {
  const quiz = { questions: [
    { correct_option_id: 2 },
    { correct_option_id: 0 },
    { correct_option_id: 3 }
  ] };
  assert.equal(formatSpoilerAnswerKey(quiz), "🔐 Javoblar: <tg-spoiler>1-C • 2-A • 3-D</tg-spoiler>");
});
