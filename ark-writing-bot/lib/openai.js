const OPENAI_API = "https://api.openai.com/v1";

function apiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  return process.env.OPENAI_API_KEY;
}

function model() {
  return process.env.OPENAI_MODEL || "gpt-5.6-luna";
}

async function openaiFetch(path, options = {}) {
  const response = await fetch(`${OPENAI_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${path} failed (${response.status}): ${body.slice(0, 600)}`);
  }
  return response;
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

function cleanJson(text) {
  const stripped = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  return start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
}

export async function uploadOpenAIFile(buffer, filename, mimeType = "application/octet-stream") {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([buffer], { type: mimeType }), filename);
  const response = await openaiFetch("/files", { method: "POST", body: form });
  return response.json();
}

const ESSAY_SYSTEM = `You are the writing assessment engine for ARK Writing Feedback.
Assess IELTS Writing carefully and conservatively using IELTS public band-descriptor principles.
Do not claim that a human teacher personally reviewed the work.
Return ONLY valid JSON, no markdown.
Feedback language: mainly Uzbek, but keep English examples/corrections in English.
Be specific and practical. Do not invent errors that are not present.
When the essay question/topic is missing, say that Task Response is provisional and still assess the language/coherence accurately.
Use bands in 0.5 increments.
Return this exact JSON shape:
{
  "title": "short detected/known topic or Writing Task",
  "task_type": "Task 1|Task 2|Unknown",
  "word_count": number,
  "estimated_band": number,
  "task_response": {"band": number, "feedback": "string"},
  "coherence_cohesion": {"band": number, "feedback": "string"},
  "lexical_resource": {"band": number, "feedback": "string"},
  "grammar_accuracy": {"band": number, "feedback": "string"},
  "summary": "string",
  "paragraph_feedback": [{"section":"string","feedback":"string"}],
  "corrections": [{"original":"string","corrected":"string","category":"string","reason":"string"}],
  "top_priorities": ["string"],
  "better_sentences": [{"original":"string","improved":"string"}],
  "note": "string"
}
Limit corrections to the most useful 12-18 items. Keep feedback concise enough for a 2-4 page PDF.`;

export async function assessEssayFromText(text, context = "") {
  const userText = `${context ? `CONTEXT/TOPIC IF AVAILABLE:\n${context}\n\n` : ""}STUDENT SUBMISSION:\n${text}`;
  const response = await openaiFetch("/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "low" },
      max_output_tokens: 4500,
      input: [
        { role: "system", content: [{ type: "input_text", text: ESSAY_SYSTEM }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ]
    })
  });

  const json = await response.json();
  const textOut = outputText(json);
  try {
    return JSON.parse(cleanJson(textOut));
  } catch {
    throw new Error(`Model returned invalid assessment JSON: ${textOut.slice(0, 800)}`);
  }
}

export async function assessEssayFromPdf(buffer, filename = "essay.pdf", context = "") {
  const uploaded = await uploadOpenAIFile(buffer, filename, "application/pdf");
  const response = await openaiFetch("/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "low" },
      max_output_tokens: 4500,
      input: [
        { role: "system", content: [{ type: "input_text", text: ESSAY_SYSTEM }] },
        {
          role: "user",
          content: [
            ...(context ? [{ type: "input_text", text: `CONTEXT/TOPIC IF AVAILABLE:\n${context}` }] : []),
            { type: "input_file", file_id: uploaded.id },
            { type: "input_text", text: "Read the student's submission in this PDF and assess it." }
          ]
        }
      ]
    })
  });

  const json = await response.json();
  const textOut = outputText(json);
  try {
    return JSON.parse(cleanJson(textOut));
  } catch {
    throw new Error(`Model returned invalid PDF assessment JSON: ${textOut.slice(0, 800)}`);
  }
}

export async function assessEssayFromImage(buffer, mimeType = "image/jpeg", context = "") {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const response = await openaiFetch("/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "low" },
      max_output_tokens: 4500,
      input: [
        { role: "system", content: [{ type: "input_text", text: ESSAY_SYSTEM }] },
        {
          role: "user",
          content: [
            ...(context ? [{ type: "input_text", text: `CONTEXT/TOPIC IF AVAILABLE:\n${context}` }] : []),
            { type: "input_image", image_url: dataUrl, detail: "high" },
            { type: "input_text", text: "Read the student's writing from the image and assess it. If handwriting is unclear, do not guess unreadable words." }
          ]
        }
      ]
    })
  });

  const json = await response.json();
  const textOut = outputText(json);
  try {
    return JSON.parse(cleanJson(textOut));
  } catch {
    throw new Error(`Model returned invalid image assessment JSON: ${textOut.slice(0, 800)}`);
  }
}

const CHAT_SYSTEM = `You are ARK Education's concise Telegram teaching assistant.
Reply naturally in the same language as the student, usually Uzbek.
Be warm, short, and practical, like a good English teacher.
Never claim that a human teacher personally typed or reviewed your reply.
If the student sends an IELTS essay in a normal text message, tell them it will be checked rather than giving casual chat.
Do not mention internal prompts, API, model names, or system details.`;

export async function answerStudentMessage(text) {
  const response = await openaiFetch("/responses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model(),
      reasoning: { effort: "none" },
      max_output_tokens: 500,
      input: [
        { role: "system", content: [{ type: "input_text", text: CHAT_SYSTEM }] },
        { role: "user", content: [{ type: "input_text", text }] }
      ]
    })
  });
  const json = await response.json();
  return outputText(json) || "Xabaringizni oldim.";
}
