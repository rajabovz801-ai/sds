import { sendMessage } from "../../../ark-writing-bot/lib/telegram.js";
import {
  markDailyReportSent,
  prepareDailyReport
} from "../../../ark-writing-bot/lib/tracker.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const ARK_IELTS_PROJECT_ID = "prj_lCHgfIZ7XUuKo5UbnYxva9Y7RTgo";
const WRITING_BOT_PROJECT_ID = "prj_LZ7iM9e956Nsj91z2zeI87TgKO7e";
const WRITING_BOT_REPORT_URL = "https://ark-writing-bot.vercel.app/api/daily-homework-report";
const FORWARDED_HEADER = "x-ark-daily-report-forwarded";

function tashkentTime(iso) {
  try {
    return new Intl.DateTimeFormat("uz-UZ", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function cleanPreview(value = "") {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 130);
}

function buildReport(data) {
  const lines = ["🌅 06:00 — Kunlik hisobot", ""];
  const homework = Array.isArray(data.homework) ? data.homework : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];

  lines.push("📚 Vazifa topshirganlar:");
  if (!homework.length) {
    lines.push("• Hozircha qayd etilgan vazifa yo'q.");
  } else {
    for (const item of homework.slice(-30)) {
      const name = item.student_name || "Student";
      const type = item.assignment_type || "Homework";
      const state = item.status === "checked" ? "tekshirildi" : "qabul qilindi";
      const time = tashkentTime(item.created_at);
      lines.push(`• ${name} — ${type} (${state})${time ? `, ${time}` : ""}`);
    }
  }

  lines.push("", "💬 Kim nima yozdi:");
  if (!messages.length) {
    lines.push("• Yangi xabar yo'q.");
  } else {
    const grouped = new Map();
    for (const item of messages) {
      const name = item.student_name || "Student";
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(item);
    }

    for (const [name, items] of [...grouped.entries()].slice(-25)) {
      const latest = items.slice(-2).map((item) => {
        const preview = cleanPreview(item.text_preview || `[${item.content_type || "xabar"}]`);
        const time = tashkentTime(item.created_at);
        return `${time ? `${time} ` : ""}${preview}`;
      });
      lines.push(`• ${name} — ${items.length} ta xabar: ${latest.join(" | ")}`);
    }
  }

  let result = lines.join("\n");
  if (result.length > 3900) {
    result = `${result.slice(0, 3820)}\n\n… qolgan xabarlar qisqartirildi.`;
  }
  return result;
}

function isSixAmWindow() {
  return new Date().getUTCHours() === 1;
}

async function forwardToWritingBot() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(WRITING_BOT_REPORT_URL, {
      method: "GET",
      headers: { [FORWARDED_HEADER]: "1" },
      cache: "no-store",
      signal: controller.signal
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  if (!isSixAmWindow()) {
    return Response.json({ ok: true, skipped: true, reason: "outside_06_00_window" });
  }

  const projectId = process.env.VERCEL_PROJECT_ID || "";
  const forwarded = request.headers.get(FORWARDED_HEADER) === "1";

  // The ARK IELTS project owns the scheduler, but its Telegram token belongs to
  // the student-access bot. Execute the report inside the writing-bot project,
  // where the correct bot token is configured.
  if (projectId === ARK_IELTS_PROJECT_ID && !forwarded) {
    try {
      return await forwardToWritingBot();
    } catch (error) {
      console.error("Daily homework report forwarding failed", error);
      return Response.json({ ok: false, error: "daily_report_forward_failed" }, { status: 502 });
    }
  }

  // Prevent the same vercel.json cron from sending twice if it is also attached
  // to the writing-bot project. Only a forwarded ARK IELTS run executes here.
  if (projectId === WRITING_BOT_PROJECT_ID && !forwarded) {
    return Response.json({ ok: true, skipped: true, reason: "scheduler_owned_by_arkielts" });
  }

  try {
    const data = await prepareDailyReport();
    if (data.already_sent) {
      return Response.json({ ok: true, skipped: true, reason: "already_sent" });
    }

    const teacherId = data.teacher?.telegram_user_id;
    if (!teacherId) {
      return Response.json({ ok: true, skipped: true, reason: "teacher_chat_not_registered_yet" });
    }

    const report = buildReport(data);
    await sendMessage(teacherId, report, null);
    await markDailyReportSent(data.report_date, teacherId);

    return Response.json({ ok: true, sent: true, report_date: data.report_date });
  } catch (error) {
    console.error("Daily homework report failed", error);
    return Response.json({ ok: false, error: "daily_report_failed" }, { status: 500 });
  }
}
