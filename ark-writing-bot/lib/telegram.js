const TELEGRAM_API = "https://api.telegram.org";

function token() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }
  return process.env.TELEGRAM_BOT_TOKEN;
}

export async function telegram(method, payload = {}) {
  const response = await fetch(`${TELEGRAM_API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  }
  return data.result;
}

export async function sendMessage(chatId, text, businessConnectionId) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...(businessConnectionId ? { business_connection_id: businessConnectionId } : {})
  });
}

export async function sendDocument(chatId, buffer, filename, caption, businessConnectionId) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (businessConnectionId) form.append("business_connection_id", businessConnectionId);
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([buffer], { type: "application/pdf" }), filename);

  const response = await fetch(`${TELEGRAM_API}/bot${token()}/sendDocument`, {
    method: "POST",
    body: form
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram sendDocument failed: ${data.description || response.status}`);
  }
  return data.result;
}

export async function getTelegramFile(fileId) {
  const file = await telegram("getFile", { file_id: fileId });
  if (!file.file_path) throw new Error("Telegram did not return file_path");

  const response = await fetch(`${TELEGRAM_API}/file/bot${token()}/${file.file_path}`);
  if (!response.ok) throw new Error(`Unable to download Telegram file: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filePath: file.file_path
  };
}
