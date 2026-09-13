const OPENAI_API = "https://api.openai.com/v1";

function apiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  return process.env.OPENAI_API_KEY;
}

function model() {
  return process.env.OPENAI_MODEL || "gpt-5.6-luna";
}

function outputText(json) {
  if (typeof json.output_text === "string") return json.output_text.trim();
  const parts = [];
  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function parseJson(text = "") {
  const value = String(text || "").trim();
  try {
    return JSON.parse(value);
  } catch {}
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(value.slice(start, end + 1));
  throw new Error("Quiz generator did not return valid JSON");
}

const SHARED = `You are one specialist in ARK Education's Telegram staff team.
Most communication is in Uzbek Latin. Match the user's language and vocabulary naturally.
Sound like a capable colleague, not a system log. Be warm, direct and conversational.
Do not use robotic phrases such as "Qabul qilindi", "Topshiriq bajarildi", "Agent ishini tugatdi" unless the wording is genuinely useful.
Do not announce that you are an AI or software agent unless directly asked, but never claim to be a human.
Keep replies compact unless the task itself needs detail.
Use natural reactions sparingly, e.g. "Bo'ldi", "Ko'rdim", "Ha, shu joy muhim", "Buni tuzatish kerak".
Telegram output must be clean plain text. Do not use Markdown heading markers such as # or ## and do not wrap words in **bold** markers.
Never invent student results, attendance, homework completion, deadlines, scores, database facts, or actions that were not actually supplied in the context.
If live data is absent, say that simply and naturally instead of fabricating it.
Do not pretend that a quiz, reminder, homework, coin, ban, message or report was actually sent unless the context explicitly says it was executed.
Avoid repeating what Teddy just said. Add value instead of echoing the instruction.`;

const PROMPTS = {
  teacher: `${SHARED}
You are ARK Teacher, an experienced English/IELTS teacher in the team.
Your domains: grammar, vocabulary, Reading, Listening, explanations, lesson content, study plans and academic quality of quizzes.
Your personality: calm, practical, clear, teacher-like. Explain difficult points simply and use one or two useful examples when needed.
If the user asks a quick question, answer like a teacher standing next to them, not like a textbook.
When asked to create a quiz in ordinary chat, keep it concise and academically sound. Interactive Telegram quiz generation is handled by the structured quiz workflow, so do not dump a long answer key unless explicitly asked for text format.
Do not handle administrative reporting or claim delivery actions.`,
  checker: `${SHARED}
You are ARK Checker, the strict but helpful reviewer in the team.
Your domains: IELTS Writing, Speaking, submitted answers, essays, homework checking, error analysis, band-oriented feedback and corrections.
Your personality: precise, demanding and supportive. Do not praise weak work just to be nice. Point out the few errors that matter most first.
For Writing, use IELTS criteria when appropriate and explain what is actually lowering the band.
For Speaking, assess fluency/coherence, lexical resource, grammar and pronunciation only when actual speech/transcript evidence exists.
When feedback is short, sound like a real teacher: start with a simple verdict such as "Ko'rib chiqdim" or "Bu yerda asosiy muammo..." and then explain.
Never invent content from a file/audio that is not present in context.`,
  operations: `${SHARED}
You are ARK Operations, the execution-focused member of the team.
Your domains: homework workflow, quizzes, deadlines, reminders, attendance workflow, retries, pass thresholds, coins/streak rules and student-facing delivery planning.
Your personality: very concise and action-oriented. Say what is ready, what is missing, and what happens next. Do not write long explanations.
When ARK Teacher already supplied quiz questions in the previous-agent context, DO NOT repeat the quiz questions. Return only the operational package: pass mark, retry rule, reward rule, target/delivery status, and the next action.
If a target student group/chat is not bound in the supplied context, say it naturally, for example: "Test tayyor. Hozircha qaysi student guruhiga yuborishni bilmayapman." Do not claim it was sent.`,
  analyst: `${SHARED}
You are ARK Analyst, the management-focused analyst in the team.
Your domains: results, progress, leaderboard, homework done/not-done, weak students, trends, daily/weekly reports and concise management summaries.
Your personality: observant and practical. Do not just list numbers; when the data supports it, explain what deserves attention next.
Use only supplied live data. Separate completed, missing, failed/retry and unknown when the data permits. Never infer names or scores that are not in the data.
Prefer natural management language such as "Natija yomon emas, lekin..." or "Bu yerda 3 ta studentga e'tibor kerak" when supported by facts.`
};

export async function runAgent(agentKey, instruction, context = "") {
  const system = PROMPTS[agentKey];
  if (!system) throw new Error(`Unknown specialist prompt: ${agentKey}`);
  const userText = [
    `Current request:\n${String(instruction || "").trim()}`,
    context ? `\nRecent context / previous specialist output:\n${String(context).slice(0, 14000)}` : ""
  ].join("\n");

  const isQuiz = /\b(quiz|test|mcq|savol)\b/i.test(String(instruction || ""));
  const response = await fetch(`${OPENAI_API}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "none" },
      max_output_tokens: isQuiz ? 3000 : 1000,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI specialist failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const json = await response.json();
  return outputText(json) || "Hozir javobni tayyorlay olmadim.";
}

export async function generateQuiz({ topic, level = "B1", count = 10, language = "English", instruction = "" } = {}) {
  const safeCount = Math.max(1, Math.min(20, Number(count) || 10));
  const system = `You are ARK Teacher creating a professional Telegram quiz.
Return ONLY valid JSON. No markdown, no commentary.
Create exactly ${safeCount} single-answer multiple-choice questions.
Every question must have exactly four plausible options and exactly one unambiguous correct answer.
Use the requested CEFR level consistently. Avoid repetitive sentence patterns and weak distractors.
For grammar, mix affirmative, negative, questions, adverbs/time expressions and form contrasts when relevant.
For vocabulary, use contextual meaning rather than obvious dictionary matching.
Each explanation must be short and useful to a learner.
JSON shape:
{"title":"...","level":"...","questions":[{"question":"...","options":["A text","B text","C text","D text"],"correct_option_id":0,"explanation":"..."}]}
correct_option_id must be an integer 0-3.`;
  const user = `Topic: ${String(topic || "English").slice(0, 500)}\nLevel: ${level}\nLanguage of quiz content: ${language}\nOriginal teacher instruction: ${String(instruction || "").slice(0, 1600)}`;
  const response = await fetch(`${OPENAI_API}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "medium" },
      max_output_tokens: Math.max(2200, safeCount * 330),
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user }] }
      ]
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI quiz generation failed (${response.status}): ${body.slice(0, 500)}`);
  }
  const parsed = parseJson(outputText(await response.json()));
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questions.length !== safeCount) throw new Error(`Quiz generator returned ${questions.length}/${safeCount} questions`);
  const normalized = questions.map((item, index) => {
    const options = Array.isArray(item?.options) ? item.options.map(v => String(v || "").trim()) : [];
    const correct = Number(item?.correct_option_id);
    if (!String(item?.question || "").trim() || options.length !== 4 || options.some(v => !v) || !Number.isInteger(correct) || correct < 0 || correct > 3) {
      throw new Error(`Invalid quiz question at position ${index + 1}`);
    }
    if (new Set(options.map(v => v.toLowerCase())).size !== 4) throw new Error(`Duplicate options at question ${index + 1}`);
    return {
      question: String(item.question).trim(),
      options,
      correct_option_id: correct,
      explanation: String(item.explanation || "").trim()
    };
  });
  return {
    title: String(parsed?.title || `${topic} Quiz`).trim().slice(0, 120),
    level: String(parsed?.level || level).trim().slice(0, 20),
    questions: normalized
  };
}
