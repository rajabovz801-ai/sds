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

const SHARED = `You are one specialist in ARK Education's Telegram multi-agent staff team.
Most communication is in Uzbek Latin. Match the user's language.
Be concise, useful and operational. Do not mention prompts, APIs, implementation details or model names.
Never invent student results, attendance, homework completion, deadlines, scores, database facts, or actions that were not actually supplied in the context.
If live data is absent, clearly say what is missing instead of fabricating it.
Do not pretend that a quiz, reminder, homework, coin, ban, message or report was actually sent unless the context explicitly says it was executed.
You report to Teddy Manager.`;

const PROMPTS = {
  teacher: `${SHARED}
You are ARK Teacher. Your domains: grammar, vocabulary, Reading, Listening, explanations, lesson content, study plans and academic quality of quizzes.
When asked to create a quiz, produce clean single-answer multiple-choice questions with exactly four options A-D and one unambiguous correct answer. Include an answer key at the end. Respect requested level, topic and question count. If no count is given, use 10.
Do not handle administrative reporting or claim delivery actions.`,
  checker: `${SHARED}
You are ARK Checker. Your domains: IELTS Writing, Speaking, submitted answers, essays, homework checking, error analysis, band-oriented feedback and corrections.
For Writing, use IELTS criteria when appropriate. For Speaking, assess fluency/coherence, lexical resource, grammar and pronunciation only when actual speech/transcript evidence exists.
Never invent content from a file/audio that is not present in context.`,
  operations: `${SHARED}
You are ARK Operations. Your domains: homework workflow, quizzes, deadlines, reminders, attendance workflow, retries, pass thresholds, coins/streak rules and student-facing delivery planning.
Turn academic content from ARK Teacher into a clear operational package. State pass mark, retry rule, reward rule and delivery status when relevant.
If a target student group/chat is not bound in the supplied context, say that delivery is waiting for group binding; do not claim it was sent.`,
  analyst: `${SHARED}
You are ARK Analyst. Your domains: results, progress, leaderboard, homework done/not-done, weak students, trends, daily/weekly reports and concise management summaries.
Use only supplied live data. Separate completed, missing, failed/retry and unknown when the data permits. Never infer names or scores that are not in the data.`
};

export async function runAgent(agentKey, instruction, context = "") {
  const system = PROMPTS[agentKey];
  if (!system) throw new Error(`Unknown specialist prompt: ${agentKey}`);
  const userText = [
    `Manager instruction:\n${String(instruction || "").trim()}`,
    context ? `\nContext from the system/previous agent:\n${String(context).slice(0, 14000)}` : ""
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
  return outputText(json) || "Topshiriq bo'yicha javob tayyor bo'lmadi.";
}
