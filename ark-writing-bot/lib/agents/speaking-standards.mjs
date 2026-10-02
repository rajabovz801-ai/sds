export function isSpeakingMaterialRequest(text = "") {
  const value = String(text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  return /\bspeaking\b/.test(value)
    && /(mavzu|topic|part\s*[123]|cue\s*card|savol|question|practice)/i.test(value)
    && /(\bber\b|\btuz\w*|\btayyorla\w*|\byarat\w*|\byoz\w*|\bgive\b|\bcreate\b|\bprepare\b)/i.test(value);
}

export function buildSpeakingMaterialPrompt(topic = "surprise me", instruction = "") {
  const sampleAnswers = /(sample\s*answer|namunaviy\s*javob|javoblar\s*ham)/i.test(instruction)
    ? "Add one natural Band 7 sample answer to each Part 1 question and one concise 1.5-minute sample response for Part 2."
    : "Do not add full sample answers unless requested.";

  return [
    "Create a complete, original IELTS Speaking practice pack for an English learner.",
    `Topic: ${String(topic || "surprise me").trim()}. If the topic is 'surprise me', choose one specific, useful IELTS topic.`,
    "Use clear student-facing English and this exact structure:",
    "TITLE: IELTS Speaking Practice — [topic]",
    "PART 1: exactly 5 natural questions.",
    "PART 2: one complete IELTS cue card with 3 or 4 bullet prompts.",
    "PART 3: exactly 5 thoughtful follow-up questions linked to the cue card.",
    "B2+/C1 VOCABULARY: 10 useful items, each with a concise Uzbek meaning and a short English example.",
    "USEFUL PHRASES: 5 natural phrases with a short note on when to use them.",
    sampleAnswers,
    "Keep the questions non-repetitive, age-neutral, realistic and suitable for IELTS. Do not invent facts or claim the topic was checked against previous materials.",
    `Staff instruction for any extra constraints: ${String(instruction || "").slice(0, 700)}`
  ].join("\n");
}
