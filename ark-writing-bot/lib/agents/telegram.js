import { AGENTS, getAgentConfig } from "./config.js";

const API = "https://api.telegram.org";

function getToken(agentKey) {
  const config = getAgentConfig(agentKey);
  const token = process.env[config.tokenEnv];
  if (!token) throw new Error(`${config.tokenEnv} is missing`);
  return token;
}

async function callWithToken(token, method, payload = {}) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  }
  return data.result;
}

function chunks(text, max = 3800) {
  const value = String(text || "").trim();
  if (!value) return [];
  const out = [];
  let rest = value;
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.6) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.6) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export async function sendAgentMessage(agentKey, chatId, text) {
  const token = getToken(agentKey);
  let result = null;
  for (const part of chunks(text)) {
    result = await callWithToken(token, "sendMessage", { chat_id: chatId, text: part });
  }
  return result;
}

export async function sendAgentChatAction(agentKey, chatId, action = "typing") {
  const token = getToken(agentKey);
  return callWithToken(token, "sendChatAction", { chat_id: chatId, action });
}

export async function getAgentTelegramFile(agentKey, fileId) {
  const token = getToken(agentKey);
  const file = await callWithToken(token, "getFile", { file_id: fileId });
  if (!file?.file_path) throw new Error("Telegram did not return file_path");

  const response = await fetch(`${API}/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error(`Unable to download Telegram file: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filePath: file.file_path
  };
}

export async function sendAgentDocument(agentKey, chatId, buffer, filename, caption = "") {
  const token = getToken(agentKey);
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", String(caption).slice(0, 1000));
  form.append("document", new Blob([buffer], { type: "application/pdf" }), filename || "writing-feedback.pdf");

  const response = await fetch(`${API}/bot${token}/sendDocument`, {
    method: "POST",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram sendDocument failed: ${data.description || response.status}`);
  }
  return data.result;
}

export async function sendAgentSticker(agentKey, chatId, stickerFileId = "") {
  const sticker = String(stickerFileId || "").trim();
  if (!sticker) return null;
  const token = getToken(agentKey);
  return callWithToken(token, "sendSticker", { chat_id: chatId, sticker });
}

export async function setupAgentWebhook(agentKey, webhookUrl, secretToken = null) {
  const token = getToken(agentKey);
  const payload = {
    url: webhookUrl,
    allowed_updates: ["message"],
    drop_pending_updates: false
  };
  if (secretToken && /^[A-Za-z0-9_-]{1,256}$/.test(secretToken)) payload.secret_token = secretToken;
  await callWithToken(token, "setWebhook", payload);
  const me = await callWithToken(token, "getMe", {});
  const info = await callWithToken(token, "getWebhookInfo", {});
  return {
    agent: agentKey,
    username: me.username || AGENTS[agentKey]?.username,
    url: info.url,
    pending_update_count: info.pending_update_count || 0,
    last_error_message: info.last_error_message || null
  };
}
