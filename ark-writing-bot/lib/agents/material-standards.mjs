import { randomInt } from "node:crypto";

export const MAX_QUESTIONS_PER_SHEET = 30;
export const MAX_REQUESTED_QUIZ_QUESTIONS = 60;

export function selectRequestedQuestions(questions, expectedCount) {
  if (!Array.isArray(questions) || questions.length < expectedCount) {
    throw new Error(`Quiz generator returned ${Array.isArray(questions) ? questions.length : 0}/${expectedCount} questions`);
  }
  return questions.slice(0, expectedCount);
}

export function parseRequestedQuestionCount(text = "", fallback = 10) {
  const patterns = [
    /\b(\d{1,2})\s*ta\s*(?:[\p{L}\p{N}'’ʻ-]+\s+){0,5}(?:quiz|test|savol)\b/iu,
    /(?:quiz|test|savol)[^\d]{0,16}(\d{1,2})\s*ta/i,
    /\b(\d{1,2})\s*(?:questions?|savol)/i
  ];
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match) return Math.max(1, Math.min(MAX_REQUESTED_QUIZ_QUESTIONS, Number(match[1])));
  }
  return Math.max(1, Math.min(MAX_REQUESTED_QUIZ_QUESTIONS, Number(fallback) || 10));
}

export function randomizeCorrectAnswerPositions(questions, randomBelow = randomInt) {
  const total = Array.isArray(questions) ? questions.length : 0;
  if (!total) return [];
  const positions = Array.from({ length: total }, (_, index) => index % 4);
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const other = randomBelow(index + 1);
    [positions[index], positions[other]] = [positions[other], positions[index]];
  }

  return questions.map((question, index) => {
    const options = [...question.options];
    const originalCorrect = Number(question.correct_option_id);
    const correctAnswer = options[originalCorrect];
    const distractors = options.filter((_, optionIndex) => optionIndex !== originalCorrect);
    for (let i = distractors.length - 1; i > 0; i -= 1) {
      const other = randomBelow(i + 1);
      [distractors[i], distractors[other]] = [distractors[other], distractors[i]];
    }
    const correctPosition = positions[index];
    const shuffled = [];
    let distractorIndex = 0;
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      shuffled.push(optionIndex === correctPosition ? correctAnswer : distractors[distractorIndex++]);
    }
    return { ...question, options: shuffled, correct_option_id: correctPosition };
  });
}

export function validateQuizQuestions(questions, expectedCount) {
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    throw new Error(`Quiz generator must return exactly ${expectedCount} questions`);
  }

  const seenQuestions = new Set();
  return questions.map((item, index) => {
    const question = String(item?.question || "").trim();
    const options = Array.isArray(item?.options)
      ? item.options.map(value => String(value || "").replace(/^\s*[A-D]\s*[.)\]:-]\s*/i, "").trim())
      : [];
    const correct = Number(item?.correct_option_id);
    const normalizedQuestion = question.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const normalizedOptions = options.map(value => value.toLocaleLowerCase().replace(/\s+/g, " ").trim());

    if (!question || options.length !== 4 || options.some(value => !value) || !Number.isInteger(correct) || correct < 0 || correct > 3) {
      throw new Error(`Invalid quiz question ${index + 1}`);
    }
    if (new Set(normalizedOptions).size !== 4) {
      throw new Error(`Quiz question ${index + 1} has duplicate options`);
    }
    if (seenQuestions.has(normalizedQuestion)) {
      throw new Error(`Quiz question ${index + 1} duplicates an earlier question`);
    }
    seenQuestions.add(normalizedQuestion);

    return { ...item, question, options, correct_option_id: correct };
  });
}

export function formatSpoilerAnswerKey(quiz) {
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  const answers = questions.map((question, index) => `${index + 1}-${String.fromCharCode(65 + Number(question.correct_option_id))}`);
  return `🔐 Javoblar: <tg-spoiler>${answers.join(" • ")}</tg-spoiler>`;
}
