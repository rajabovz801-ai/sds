import { sendMessage } from "../../../ark-writing-bot/lib/telegram.js";
import {
  markDailyReportSent,
  prepareDailyReport
} from "../../../ark-writing-bot/lib/tracker.js";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function GET() {
  if (!isSixAmWindow()) {
    return Response.json({ ok: true, skipped: true, reason: "outside_06_00_window" });
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
