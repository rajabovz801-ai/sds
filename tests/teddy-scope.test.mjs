import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Teddy keeps student login and staff agents while removing the daily report scheduler", () => {
  const config = JSON.parse(read("vercel.json"));
  const manager = read("app/api/telegram/manager/route.js");
  const legacy = read("app/api/telegram/route.js");
  const english = read("app/api/telegram/english/route.js");
  assert.deepEqual(config.crons || [], []);
  assert.match(manager, /handlePrivateRegistration/);
  assert.match(manager, /handleStaffManagerMessage/);
  assert.doesNotMatch(manager, /forwardToLegacy|answerGeneralMessage/);
  assert.match(english, /sendPlatformEntry/);
  assert.doesNotMatch(legacy, /runAgent|answerGeneralMessage|assessEssay|createFeedbackPdf/);
  assert.equal(existsSync(new URL("../app/api/daily-homework-report/route.js", import.meta.url)), false);
});

test("Teddy student groups stay quiet and Telegram quiz polls are disabled", () => {
  const manager = read("app/api/telegram/manager/route.js");
  const setup = read("app/api/telegram/setup/route.js");
  const agentTelegram = read("ark-writing-bot/lib/agents/telegram.js");
  assert.doesNotMatch(manager, /handleStudentSubmission|recordGroupMember|poll_answer/);
  assert.doesNotMatch(setup, /poll_answer/);
  assert.match(agentTelegram, /allowed_updates:\s*\["message"\]/);
  assert.doesNotMatch(agentTelegram, /sendAgentQuizPoll|sendPoll/);
});

test("staff quizzes use A4 Latin Modern PDFs and keep answers in a Telegram spoiler", () => {
  const assignment = read("ark-writing-bot/lib/agents/assignment-workflow-v2.js");
  const pdf = read("ark-writing-bot/lib/agents/quiz-pdf.mjs");
  const standards = read("ark-writing-bot/lib/agents/material-standards.mjs");
  assert.match(assignment, /renderQuizPdf\(quiz\)/);
  assert.match(assignment, /formatSpoilerAnswerKey\(quiz\)/);
  assert.doesNotMatch(assignment, /sendPoll|sendAgentQuizPoll/);
  assert.match(pdf, /size:\s*"A4"/);
  assert.match(pdf, /LatinModernBold/);
  assert.doesNotMatch(pdf, /ANSWER KEY/);
  assert.match(standards, /MAX_QUESTIONS_PER_SHEET = 30/);
  assert.match(standards, /MAX_REQUESTED_QUIZ_QUESTIONS = 60/);
});
