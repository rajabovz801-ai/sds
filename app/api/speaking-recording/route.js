import { timingSafeEqual } from "node:crypto";
import { getVercelOidcToken } from "@vercel/functions/oidc";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "../../../lib/auth/session.ts";
import { getServiceSupabase } from "../../../lib/supabase/server.ts";
import { SPEAKING_DAYS } from "../../../lib/speakingPractice.ts";
import { sendAudio } from "../../../ark-writing-bot/lib/telegram.js";
import { prepareDailyReport } from "../../../ark-writing-bot/lib/tracker.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const ARK_IELTS_PROJECT_ID = "prj_lCHgfIZ7XUuKo5UbnYxva9Y7RTgo";
const ARK_IELTS_PROJECT_NAME = "arkielts";
const WRITING_BOT_PROJECT_ID = "prj_LZ7iM9e956Nsj91z2zeI87TgKO7e";
const WRITING_BOT_URL = "https://ark-writing-bot.vercel.app/api/speaking-recording";
const VERCEL_TEAM_ID = "team_a2tPUw7yvQMGgktGnlzlUA4W";
const VERCEL_TEAM_SLUG = "rajabovz801-7955s-projects";
const OIDC_TEAM_ISSUER = `https://oidc.vercel.com/${VERCEL_TEAM_SLUG}`;
const OIDC_GLOBAL_ISSUER = "https://oidc.vercel.com";
const OIDC_AUDIENCE = `https://vercel.com/${VERCEL_TEAM_SLUG}`;
const OIDC_SUBJECT = `owner:${VERCEL_TEAM_SLUG}:project:${ARK_IELTS_PROJECT_NAME}:environment:production`;
const TEAM_JWKS = createRemoteJWKSet(new URL(`${OIDC_TEAM_ISSUER}/.well-known/jwks`));
const GLOBAL_JWKS = createRemoteJWKSet(new URL(`${OIDC_GLOBAL_ISSUER}/.well-known/jwks`));
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const FORWARDED_HEADER = "x-ark-speaking-forwarded";
const SECRET_HEADER = "x-ark-bot-secret";

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function cleanText(value, max = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function speakingSelection(form) {
  const dayNumber = Number(form.get("day"));
  const topicId = cleanText(form.get("topicId"), 80);
  const questionIndex = Number(form.get("questionIndex"));
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 10) return null;
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 20) return null;

  const day = SPEAKING_DAYS.find((item) => item.day === dayNumber);
  const topic = day?.topics.find((item) => item.id === topicId);
  const question = topic?.questions?.[questionIndex];
  if (!day || !topic || !question) return null;
  return { day, topic, question, questionIndex };
}

async function activeStudentFromSession() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("students")
    .select("id,first_name,last_name,status")
    .eq("id", session.studentId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: `${data.first_name || ""} ${data.last_name || ""}`.replace(/\s+/g, " ").trim() || "Student"
  };
}

async function buildForwardHeaders() {
  const headers = { [FORWARDED_HEADER]: "1" };

  try {
    const oidcToken = String(await getVercelOidcToken() || "").trim();
    if (oidcToken) {
      headers.Authorization = `Bearer ${oidcToken}`;
      return headers;
    }
  } catch (error) {
    console.warn("Speaking forward OIDC token unavailable", error?.message || "unknown");
  }

  const secret = String(process.env.BOT_REGISTRATION_SECRET || "").trim();
  if (secret.length >= 24) {
    headers[SECRET_HEADER] = secret;
    return headers;
  }

  return null;
}

async function verifyOidcForward(request) {
  const authorization = String(request.headers.get("authorization") || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return false;
  const token = authorization.slice(7).trim();
  if (!token) return false;

  try {
    const unverified = decodeJwt(token);
    let issuer;
    let jwks;

    if (unverified.iss === OIDC_TEAM_ISSUER) {
      issuer = OIDC_TEAM_ISSUER;
      jwks = TEAM_JWKS;
    } else if (unverified.iss === OIDC_GLOBAL_ISSUER) {
      issuer = OIDC_GLOBAL_ISSUER;
      jwks = GLOBAL_JWKS;
    } else {
      return false;
    }

    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["RS256"],
      issuer,
      audience: OIDC_AUDIENCE,
      subject: OIDC_SUBJECT
    });

    return payload.owner_id === VERCEL_TEAM_ID
      && payload.owner === VERCEL_TEAM_SLUG
      && payload.project_id === ARK_IELTS_PROJECT_ID
      && payload.project === ARK_IELTS_PROJECT_NAME
      && payload.environment === "production";
  } catch (error) {
    console.warn("Speaking forward OIDC verification failed", error?.code || error?.message || "unknown");
    return false;
  }
}

async function verifyForwardRequest(request) {
  if (request.headers.get(FORWARDED_HEADER) !== "1") return false;
  if (await verifyOidcForward(request)) return true;

  const expected = String(process.env.BOT_REGISTRATION_SECRET || "").trim();
  const received = String(request.headers.get(SECRET_HEADER) || "").trim();
  return expected.length >= 24 && safeEqual(received, expected);
}

async function receiveFromStudent(request) {
  if (!sameOrigin(request)) {
    return Response.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }

  const student = await activeStudentFromSession();
  if (!student) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const selection = speakingSelection(form);
  const duration = Math.max(1, Math.min(300, Math.round(Number(form.get("duration")) || 0)));

  if (!(audio instanceof File) || audio.size < 100 || audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ ok: false, error: "invalid_audio" }, { status: 400 });
  }
  if (audio.type !== "audio/mpeg" && audio.type !== "audio/mp3") {
    return Response.json({ ok: false, error: "mp3_required" }, { status: 415 });
  }
  if (!selection) {
    return Response.json({ ok: false, error: "invalid_speaking_selection" }, { status: 400 });
  }

  const forwardHeaders = await buildForwardHeaders();
  if (!forwardHeaders) {
    console.error("Speaking forward authentication is not configured");
    return Response.json({ ok: false, error: "speaking_forward_not_configured" }, { status: 503 });
  }

  const outgoing = new FormData();
  outgoing.append("audio", audio, `day-${selection.day.day}-${selection.topic.id}-q${selection.questionIndex + 1}.mp3`);
  outgoing.append("studentId", student.id);
  outgoing.append("studentName", student.name);
  outgoing.append("day", String(selection.day.day));
  outgoing.append("dayTitle", selection.day.title);
  outgoing.append("topicTitle", selection.topic.title);
  outgoing.append("questionNumber", String(selection.questionIndex + 1));
  outgoing.append("questionText", selection.question.text);
  outgoing.append("duration", String(duration));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(WRITING_BOT_URL, {
      method: "POST",
      headers: forwardHeaders,
      body: outgoing,
      cache: "no-store",
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) {
      console.error("Writing bot speaking forward failed", response.status, body?.error || "unknown");
      return Response.json({ ok: false, error: "telegram_delivery_failed" }, { status: 502 });
    }
    return Response.json({ ok: true, sent: true });
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverFromWritingBot(request) {
  if (!(await verifyForwardRequest(request))) {
    return Response.json({ ok: false, error: "unauthorized_forward" }, { status: 401 });
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size < 100 || audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ ok: false, error: "invalid_audio" }, { status: 400 });
  }
  if (audio.type !== "audio/mpeg" && audio.type !== "audio/mp3") {
    return Response.json({ ok: false, error: "mp3_required" }, { status: 415 });
  }

  const studentName = cleanText(form.get("studentName"), 120) || "Student";
  const day = Math.max(1, Math.min(10, Number(form.get("day")) || 1));
  const dayTitle = cleanText(form.get("dayTitle"), 100);
  const topicTitle = cleanText(form.get("topicTitle"), 120);
  const questionNumber = Math.max(1, Math.min(20, Number(form.get("questionNumber")) || 1));
  const questionText = cleanText(form.get("questionText"), 280);
  const duration = Math.max(1, Math.min(300, Math.round(Number(form.get("duration")) || 0)));

  const reportData = await prepareDailyReport();
  const teacherId = reportData?.teacher?.telegram_user_id;
  if (!teacherId) {
    return Response.json({ ok: false, error: "teacher_chat_not_registered" }, { status: 503 });
  }

  const caption = [
    "🎙️ <b>SPEAKING PRACTICE</b>",
    "",
    `👤 <b>Student:</b> ${escapeHtml(studentName)}`,
    `📅 <b>Day ${String(day).padStart(2, "0")}:</b> ${escapeHtml(dayTitle)}`,
    `🏷️ <b>Topic:</b> ${escapeHtml(topicTitle)}`,
    `❓ <b>Question ${questionNumber}:</b> ${escapeHtml(questionText)}`,
    `⏱️ <b>Duration:</b> ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`,
    "",
    "✅ <b>ARK Education · Part 1</b>"
  ].join("\n");

  const buffer = Buffer.from(await audio.arrayBuffer());
  const cleanStudent = studentName.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "student";
  await sendAudio(
    teacherId,
    buffer,
    `${cleanStudent}_day${day}_q${questionNumber}.mp3`,
    caption,
    {
      duration,
      title: `${topicTitle} · Q${questionNumber}`,
      performer: studentName
    }
  );

  return Response.json({ ok: true, sent: true });
}

export async function POST(request) {
  try {
    const projectId = process.env.VERCEL_PROJECT_ID || "";
    if (projectId === ARK_IELTS_PROJECT_ID) return await receiveFromStudent(request);
    if (projectId === WRITING_BOT_PROJECT_ID) return await deliverFromWritingBot(request);
    return Response.json({ ok: false, error: "unsupported_project" }, { status: 404 });
  } catch (error) {
    console.error("Speaking recording delivery failed", error);
    return Response.json({ ok: false, error: "speaking_recording_failed" }, { status: 500 });
  }
}
