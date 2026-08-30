export const runtime = "nodejs";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

async function telegram(method, payload) {
  const token = required("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const secret = required("TELEGRAM_WEBHOOK_SECRET");
    const supplied = url.searchParams.get("key");
    if (!supplied || supplied !== secret) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const webhookUrl = `${url.origin}/api/telegram`;
    await telegram("setWebhook", {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: [
        "message",
        "business_connection",
        "business_message",
        "edited_business_message",
        "deleted_business_messages"
      ],
      drop_pending_updates: false
    });

    const info = await telegram("getWebhookInfo", {});
    return Response.json({
      ok: true,
      webhook_url: webhookUrl,
      telegram: {
        url: info.url,
        pending_update_count: info.pending_update_count,
        last_error_message: info.last_error_message || null
      }
    });
  } catch (error) {
    console.error("Telegram setup error", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
