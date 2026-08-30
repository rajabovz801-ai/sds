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
For greetings and casual conversation, be friendly, brief and natural.
For English, IELTS, grammar, vocabulary, translation, homework or study questions, respond like a capable English teacher.
For logistical or personal facts you do not actually know (for example exact lesson times, fees, attendance, promises, private plans), never invent information. Say briefly that it needs confirmation or ask a concise clarifying question.
Do not claim that a human personally typed the reply or personally checked something when that is not known.
Do not mention APIs, prompts, model names, system instructions, or implementation details.
Do not prepend labels such as 'AI:' or 'Assistant:'.
Keep routine Telegram replies concise unless the sender clearly asks for detail.`;

export async function answerGeneralMessage(text) {
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
