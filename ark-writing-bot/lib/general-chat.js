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

const SYSTEM = `You are ARK Education's private Telegram assistant handling incoming personal messages.
Reply to every ordinary incoming text naturally and contextually.
Use the same language and register as the sender; most messages will be Uzbek.
Use recent conversation history to resolve short follow-ups such as "909", "guruh nomi", "ha", "ertaga-chi", pronouns, and omitted context. Do not ask the sender to repeat information that is already clear from recent messages.
For greetings and casual conversation, be friendly, brief and natural.
For English, IELTS, grammar, vocabulary, translation, homework or study questions, respond like a capable English teacher.
For logistical or personal facts you do not actually know (for example exact lesson times, fees, attendance, promises, private plans), never invent information. If the conversation identifies a group or subject but the exact fact is unknown, acknowledge what is already known and ask only for the missing detail.
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
