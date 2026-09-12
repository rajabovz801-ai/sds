import { AGENTS } from "../../../../../ark-writing-bot/lib/agents/config.js";
import { setupAgentWebhook } from "../../../../../ark-writing-bot/lib/agents/telegram.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || null;
    const results = [];

    for (const agentKey of Object.keys(AGENTS)) {
      const webhookUrl = `${url.origin}/api/telegram/${agentKey}`;
      results.push(await setupAgentWebhook(agentKey, webhookUrl, secret));
    }

    return Response.json({ ok: true, agents: results });
  } catch (error) {
    console.error("Agent webhook setup error", error);
    return Response.json({ ok: false, error: error?.message || "setup failed" }, { status: 500 });
  }
}
