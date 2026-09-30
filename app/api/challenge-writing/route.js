import { NextResponse } from "next/server";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STUDENT_COOKIE = "ark60_session";
const ADMIN_COOKIE = "ark60_admin";
const START_UTC = Date.UTC(2026, 9, 1);
const WRITING_DAYS = new Set([1,2,3,5,6,7,8,9,10,12,13,14,15,16,17]);\nconst PREVIEW_USERNAME = "rustam7";

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function uzDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dayIso(day) {
  return new Date(START_UTC + (day - 1) * 86400000).toISOString().slice(0, 10);
}

function validDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && WRITING_DAYS.has(day) ? day : null;
}

async function studentFromRequest(request) {
  const token = request.cookies.get(STUDENT_COOKIE)?.value || "";
  if (!token) return null;
  const supabase = getServiceSupabase();
  const { data: session } = await supabase
    .from("ark60_sessions")
    .select("student_id,expires_at,revoked_at")
    .eq("token_hash", digest(token))
    .maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const { data: student } = await supabase
    .from("ark60_students")
    .select("id,first_name,last_name,username,status")
    .eq("id", session.student_id)
    .eq("status", "active")
    .maybeSingle();
  return student || null;
}

async function adminFromRequest(request) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value || "";
  if (!token) return null;
  const supabase = getServiceSupabase();
  const { data: session } = await supabase
    .from("ark60_admin_sessions")
    .select("admin_id,expires_at,revoked_at")
    .eq("token_hash", digest(token))
    .maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const { data: admin } = await supabase
    .from("ark60_admins")
    .select("id,display_name,username,role,status")
    .eq("id", session.admin_id)
    .eq("status", "active")
    .maybeSingle();
  return admin || null;
}

async function getContent(day) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("ark60_content")
    .select("id,day_number,module,title,status,payload,published_at")
    .eq("day_number", day)
    .eq("module", "writing")
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "content";
  const supabase = getServiceSupabase();

  if (action === "availability") {
    const day = Number(url.searchParams.get("day"));
    if (!Number.isInteger(day) || day < 1 || day > 60) return json({ published: false });
    const content = await getContent(day);
    return json({ published: Boolean(content), task_type: content?.payload?.task_type || null });
  }

  if (action === "admin_list") {
    const admin = await adminFromRequest(request);
    if (!admin) return json({ detail: "Admin sign-in required." }, 401);
    const { data: submissions, error } = await supabase
      .from("ark60_submissions")
      .select("id,student_id,day_number,payload,submitted_at,band,review_status,review_feedback,reviewed_at")
      .eq("module", "writing")
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (error) return json({ detail: "Could not load writing submissions." }, 500);
    const ids = [...new Set((submissions || []).map((row) => row.student_id))];
    let students = [];
    if (ids.length) {
      const result = await supabase.from("ark60_students").select("id,first_name,last_name,username").in("id", ids);
      students = result.data || [];
    }
    const people = new Map(students.map((s) => [s.id, s]));
    return json({
      admin,
      submissions: (submissions || []).map((row) => ({ ...row, student: people.get(row.student_id) || null })),
    });
  }

  if (action === "notifications") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const { data, error } = await supabase
      .from("ark60_submissions")
      .select("id,day_number,payload,band,review_status,review_feedback,reviewed_at,submitted_at")
      .eq("student_id", student.id)
      .eq("module", "writing")
      .eq("review_status", "checked")
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) return json({ detail: "Could not load notifications." }, 500);
    return json({ student, notifications: data || [] });
  }

  if (action === "pdf") {
    const admin = await adminFromRequest(request);
    if (!admin) return json({ detail: "Admin sign-in required." }, 401);
    const id = url.searchParams.get("id") || "";
    const { data: submission, error } = await supabase
      .from("ark60_submissions")
      .select("id,student_id,day_number,payload,submitted_at,band,review_status,review_feedback,reviewed_at")
      .eq("id", id)
      .eq("module", "writing")
      .maybeSingle();
    if (error || !submission) return json({ detail: "Submission not found." }, 404);
    const { data: student } = await supabase
      .from("ark60_students")
      .select("first_name,last_name,username")
      .eq("id", submission.student_id)
      .maybeSingle();

    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Writing Day ${submission.day_number}` } });
    doc.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
    });
    const payload = submission.payload || {};
    const fullName = student ? `${student.first_name} ${student.last_name}` : "Student";
    doc.font("Helvetica-Bold").fontSize(19).text("ARK EDUCATION CENTRE");
    doc.moveDown(0.25).font("Helvetica").fontSize(9).fillColor("#555").text("60 DAY IELTS CHALLENGE · WRITING SUBMISSION");
    doc.moveDown(1).fillColor("#111").fontSize(11);
    doc.font("Helvetica-Bold").text(fullName);
    doc.font("Helvetica").text(`Day ${submission.day_number} · ${String(payload.task_type || "Writing").toUpperCase()} · ${payload.word_count || wordCount(payload.answer)} words`);
    doc.text(`Submitted: ${new Date(submission.submitted_at).toLocaleString("en-GB", { timeZone: "Asia/Tashkent" })} UZT`);
    doc.text(`Active writing time: ${Math.floor((payload.duration_seconds || 0) / 60)}m ${String((payload.duration_seconds || 0) % 60).padStart(2, "0")}s`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(12).text("Task");
    doc.moveDown(0.35).font("Helvetica").fontSize(10.5).text(String(payload.prompt || ""), { lineGap: 3 });
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(12).text("Student response");
    doc.moveDown(0.35).font("Helvetica").fontSize(10.5).text(String(payload.answer || ""), { lineGap: 4, align: "left" });
    if (submission.review_status === "checked") {
      doc.moveDown(1.2).font("Helvetica-Bold").fontSize(12).text(`Band: ${submission.band ?? "—"}`);
      if (submission.review_feedback) doc.moveDown(0.35).font("Helvetica").fontSize(10.5).text(`Feedback: ${submission.review_feedback}`, { lineGap: 3 });
    }
    doc.end();
    await finished;
    const buffer = Buffer.concat(chunks);
    const safe = fullName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "student";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="day-${submission.day_number}-${safe}-writing.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const student = await studentFromRequest(request);
  const admin = await adminFromRequest(request);
  if (!student && !admin) return json({ detail: "Please sign in." }, 401);
  const day = validDay(url.searchParams.get("day"));
  if (!day) return json({ detail: "No daily Writing task is scheduled for this day." }, 404);
  if (!admin && student?.username !== PREVIEW_USERNAME && dayIso(day) > uzDate()) return json({ detail: "This Writing task is not available yet." }, 403);
  const content = await getContent(day);
  if (!content) return json({ detail: "Writing material has not been published yet." }, 404);

  let submission = null;
  if (student && !admin) {
    const result = await supabase
      .from("ark60_submissions")
      .select("id,submitted_at,band,review_status,review_feedback,reviewed_at,payload")
      .eq("student_id", student.id)
      .eq("day_number", day)
      .eq("module", "writing")
      .maybeSingle();
    submission = result.data || null;
  }
  return json({ content, submission, preview: Boolean(admin || student?.username === PREVIEW_USERNAME) });
}

export async function POST(request) {
  const supabase = getServiceSupabase();
  let body = {};
  try { body = await request.json(); } catch { return json({ detail: "Invalid request." }, 400); }
  const action = String(body.action || "");

  if (action === "grade") {
    const admin = await adminFromRequest(request);
    if (!admin) return json({ detail: "Admin sign-in required." }, 401);
    const id = String(body.id || "");
    const band = Number(body.band);
    const feedback = String(body.feedback || "").trim().slice(0, 4000);
    if (!id || !Number.isFinite(band) || band < 0 || band > 9 || Math.round(band * 2) !== band * 2) {
      return json({ detail: "Choose a valid IELTS band score in 0.5 steps." }, 400);
    }
    const { data, error } = await supabase
      .from("ark60_submissions")
      .update({ band, review_status: "checked", review_feedback: feedback || null, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("module", "writing")
      .select("id,day_number,band,review_status,review_feedback,reviewed_at")
      .maybeSingle();
    if (error || !data) return json({ detail: "Could not save the Writing score." }, 500);
    return json({ ok: true, submission: data });
  }

  if (action !== "submit") return json({ detail: "Unknown action." }, 400);
  const student = await studentFromRequest(request);
  if (!student) return json({ detail: "Please sign in." }, 401);
  const day = validDay(body.day);
  if (!day) return json({ detail: "No daily Writing task is scheduled for this day." }, 400);
  if (student.username !== PREVIEW_USERNAME && dayIso(day) > uzDate()) return json({ detail: "This Writing task is not available yet." }, 403);
  const content = await getContent(day);
  if (!content) return json({ detail: "Writing material has not been published yet." }, 404);
  const answer = String(body.answer || "").trim();
  if (!answer) return json({ detail: "Write your response before submitting." }, 400);
  if (answer.length > 30000) return json({ detail: "Response is too long." }, 413);
  const durationLimit = Number(content.payload?.duration_seconds || 0);
  const durationSeconds = Math.max(0, Math.min(durationLimit || 3600, Math.floor(Number(body.duration_seconds) || 0)));
  const payload = {
    task_type: content.payload?.task_type || "writing",
    title: content.title,
    prompt: content.payload?.prompt || "",
    answer,
    word_count: wordCount(answer),
    duration_seconds: durationSeconds,
    min_words: Number(content.payload?.min_words || 0),
    source: "challenge-writing-v1",
  };
  const { data, error } = await supabase
    .from("ark60_submissions")
    .insert({ student_id: student.id, day_number: day, module: "writing", payload, review_status: "pending" })
    .select("id,submitted_at,review_status,payload")
    .maybeSingle();
  if (error) {
    if (String(error.code) === "23505") return json({ detail: "You have already submitted this Writing task." }, 409);
    return json({ detail: "Could not submit your Writing response." }, 500);
  }
  return json({ ok: true, submission: data });
}
