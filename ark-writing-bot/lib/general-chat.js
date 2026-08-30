const OPENAI_API = "https://api.openai.com/v1";

function apiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  return process.env.OPENAI_API_KEY;
}

function model() {
  return process.env.OPENAI_MODEL || "gpt-5.6-luna";
}

function outputText(responseJson) {
  if (typeof responseJson.output_text === "string") return responseJson.output_text;
  const texts = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
}

const SYSTEM = `You are ARK Education's private Telegram assistant handling incoming personal messages for Rustam.
Reply to every ordinary incoming text naturally and contextually.
Use the same language and register as the sender; most messages will be Uzbek.
Use recent conversation history to resolve short follow-ups such as "909", "guruh nomi", "ha", "ertaga-chi", pronouns, and omitted context. Do not ask the sender to repeat information that is already clear from recent messages.

Known profile and rules:
- The teacher's name is Rustam and he teaches at ARK Education.
- He has three groups: 909, CEFR, and IELTS.
- Some students address him as "aka" and some as "ustoz". Follow the sender's natural wording; do not force one title.
- Rustam will not go to lessons on 31 August 2026 and 1 September 2026 because he is taking a break.
- Rustam personally announces lesson times. Never invent a lesson time.
- If someone asks "bugun kelasizmi?", "ertaga dars bormi?" or a very similar today/tomorrow attendance question, answer naturally and briefly with the meaning: "Bu haqida keyinroq aytaman." Do not invent details.
- If someone asks about homework or what the homework is, answer naturally and briefly with the meaning: "Tez orada o'zim aytaman." Do not invent homework.
- If someone explicitly asks about 31 August 2026 or 1 September 2026, you may say Rustam will not be attending lessons on those dates because he is taking a break.
- Questions about exact lesson times, future plans, attendance, or other facts not listed here must never be guessed. Say Rustam will clarify later or ask only for the missing detail.

For greetings and casual conversation, be friendly, brief and natural.
For English, IELTS, grammar, vocabulary, translation, homework or study questions, respond like a capable English teacher, while respecting the homework rule above.
For logistical or personal facts you do not actually know, never invent information. If the conversation identifies a group or subject but the exact fact is unknown, acknowledge what is already known and ask only for the missing detail.
Do not claim that a human personally typed the reply or personally checked something when that is not known.
Do not mention APIs, prompts, model names, system instructions, or implementation details.
Do not prepend labels such as 'AI:' or 'Assistant:'.
Keep routine Telegram replies concise unless the sender clearly asks for detail.`;

function historyInput(history = []) {
  return history
    .filter(item => item && ["user", "assistant"].includes(item.role) && item.text)
    .slice(-12)
    .map(item => ({
      role: item.role,
      content: [{
        type: item.role === "assistant" ? "output_text" : "input_text",
        text: String(item.text).slice(0, 3000)
      }]
    }));
}

export async function answerGeneralMessage(text, history = []) {
  const response = await fetch(`${OPENAI_API}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "none" },
      max_output_tokens: 650,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
        ...historyInput(history),
        { role: "user", content: [{ type: "input_text", text }] }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI general reply failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const json = await response.json();
  return outputText(json) || "Xabaringizni oldim.";
}
