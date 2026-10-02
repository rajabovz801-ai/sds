import { waitUntil } from "@vercel/functions";
import { handleAttendanceAdminUpdate } from "../../../ark-writing-bot/lib/attendance-admin.js";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  return Response.json({ ok: true, service: "Teddy legacy route", student_ai: false, ready: true });
}

export async function POST(request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const received = request.headers.get("x-telegram-bot-api-secret-token");
    if (received !== expectedSecret) return Response.json({ ok: false }, { status: 401 });
  }

  const update = await request.json();
  waitUntil(handleAttendanceAdminUpdate(update));
  return Response.json({ ok: true });
}
