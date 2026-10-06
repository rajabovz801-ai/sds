import { NextResponse } from "next/server";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { getServiceSupabase } from "@/lib/supabase/server";
import { isDayUnlocked } from "@/lib/ark60-content-auth";
import { assessArk60Submission, assessArk60SubmissionById, gradePendingArk60WritingBatch } from "@/lib/ark60-writing-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STUDENT_COOKIE = "ark60_session";
const ADMIN_COOKIE = "ark60_admin";
const START_UTC = Date.UTC(2026, 9, 1);
const WRITING_DAYS = new Set([1,2,3,5,6,7,8,9,10,12,13,14,15,16,17]);
const PREVIEW_USERNAME = "rustam7";

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
    const requestedDay = Number(url.searchParams.get("day") || 0);
    let query = supabase
      .from("ark60_submissions")
      .select("id,student_id,day_number,payload,submitted_at,band,review_status,review_feedback,reviewed_at")
      .eq("module", "writing")
      .order("submitted_at", { ascending: false })
      .limit(1000);
    if (Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= 60) query = query.eq("day_number", requestedDay);
    const { data: submissions, error } = await query;
    if (error) return json({ detail: "Could not load writing submissions." }, 500);
    const ids = [...new Set((submissions || []).map((row) => row.student_id))];
    const days = [...new Set((submissions || []).map((row) => row.day_number))];
    let students = [];
    let studyRows = [];
    let visitRows = [];
    if (ids.length) {
      const [peopleResult, studyResult, visitResult] = await Promise.all([
        supabase.from("ark60_students").select("id,first_name,last_name,username").in("id", ids),
        days.length
          ? supabase.from("ark60_study_sessions").select("student_id,day_number,active_seconds").eq("module","writing").in("student_id",ids).in("day_number",days)
          : Promise.resolve({data:[]}),
        days.length
          ? supabase.from("ark60_writing_visits").select("id,student_id,day_number,entered_at,last_seen_at,left_at,exit_reason").in("student_id",ids).in("day_number",days).order("entered_at",{ascending:true})
          : Promise.resolve({data:[]})
      ]);
      students = peopleResult.data || [];
      studyRows = studyResult.data || [];
      visitRows = visitResult.data || [];
    }
    const people = new Map(students.map((student) => [student.id, student]));
    const active = new Map();
    for (const row of studyRows) {
      const key = row.student_id + ":" + row.day_number;
      active.set(key, (active.get(key) || 0) + Number(row.active_seconds || 0));
    }
    const visits = new Map();
    for (const visit of visitRows) {
      const key = visit.student_id + ":" + visit.day_number;
      if (!visits.has(key)) visits.set(key, []);
      visits.get(key).push({
        id: visit.id,
        entered_at: visit.entered_at,
        last_seen_at: visit.last_seen_at,
        left_at: visit.left_at,
        exit_reason: visit.exit_reason
      });
    }
    const rows = (submissions || [])
      .filter((row) => String(people.get(row.student_id)?.username || "").toLowerCase() !== PREVIEW_USERNAME)
      .map((row) => ({
        ...row,
        active_writing_seconds: active.get(row.student_id + ":" + row.day_number) || 0,
        writing_visits: visits.get(row.student_id + ":" + row.day_number) || [],
        student: people.get(row.student_id) || null
      }));
    return json({ admin, submissions: rows });
  }

  if (action === "notifications") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const { data, error } = await supabase
      .from("ark60_submissions")
      .select("id,day_number,payload,band,review_status,review_feedback,reviewed_at,submitted_at")
      .eq("student_id", student.id)
      .eq("module", "writing")
      .eq("review_status", "reviewed")
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

    const ai = payload.ai_assessment || null;
    if (ai) {
      const criterionLabel = payload.task_type === "task1" ? "Task Achievement" : "Task Response";
      doc.moveDown(1.2).font("Helvetica-Bold").fontSize(13).fillColor("#111").text("AI assessment - teacher review required");
      doc.moveDown(0.35).font("Helvetica-Bold").fontSize(11).text(`Suggested Band: ${Number(ai.band ?? submission.band ?? 0).toFixed(1)}`);
      doc.moveDown(0.45).font("Helvetica").fontSize(9.5);
      doc.text(`${criterionLabel}: ${Number(ai.task_criterion ?? 0).toFixed(1)}    Coherence & Cohesion: ${Number(ai.coherence_cohesion ?? 0).toFixed(1)}`);
      doc.text(`Lexical Resource: ${Number(ai.lexical_resource ?? 0).toFixed(1)}    Grammar: ${Number(ai.grammar ?? 0).toFixed(1)}`);
      if (ai.summary) {
        doc.moveDown(0.7).font("Helvetica-Bold").fontSize(10.5).text("Assessment summary");
        doc.moveDown(0.2).font("Helvetica").fontSize(9.5).text(String(ai.summary), { lineGap: 3 });
      }
      const strengths = Array.isArray(ai.strengths) ? ai.strengths : [];
      if (strengths.length) {
        doc.moveDown(0.7).font("Helvetica-Bold").fontSize(10.5).text("Strengths");
        doc.moveDown(0.2).font("Helvetica").fontSize(9.3);
        strengths.forEach((item, index) => doc.text(`${index + 1}. ${String(item)}`, { lineGap: 2 }));
      }
      const errors = Array.isArray(ai.errors) ? ai.errors : [];
      if (errors.length) {
        doc.moveDown(0.8).font("Helvetica-Bold").fontSize(10.5).text("Specific corrections");
        errors.forEach((item, index) => {
          doc.moveDown(0.4).font("Helvetica-Bold").fontSize(9.4).text(`${index + 1}. ${String(item.category || "Correction")}`);
          doc.font("Helvetica").fontSize(9.2).text(`Original: ${String(item.original || "")}`, { lineGap: 2 });
          doc.text(`Correction: ${String(item.correction || "")}`, { lineGap: 2 });
          if (item.explanation) doc.text(`Why: ${String(item.explanation)}`, { lineGap: 2 });
        });
      }
    }
    doc.moveDown(1.2).font("Helvetica-Bold").fontSize(12).text("Teacher decision");
    if (submission.review_status === "reviewed") {
      doc.moveDown(0.35).font("Helvetica-Bold").fontSize(11).text(`Final Band: ${submission.band ?? "-"}`);
      if (submission.review_feedback) doc.moveDown(0.35).font("Helvetica").fontSize(10).text(`Teacher feedback: ${submission.review_feedback}`, { lineGap: 3 });
      doc.moveDown(0.25).font("Helvetica").fontSize(8.5).fillColor("#555").text("Status: reviewed and approved by teacher");
    } else {
      doc.moveDown(0.35).font("Helvetica").fontSize(9.5).fillColor("#555").text("Status: pending teacher review. The AI score above is a suggestion, not the final published result.");
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
  if (!admin && student && !(await isDayUnlocked(day, student))) return json({ detail: "This Writing task is not available yet." }, 403);
  const content = await getContent(day);
  if (!content) return json({ detail: "Writing material has not been published yet." }, 404);

  let submission = null;
  let draft = null;
  if (student && !admin && student.username !== PREVIEW_USERNAME) {
    const [submissionResult, draftResult] = await Promise.all([
      supabase
        .from("ark60_submissions")
        .select("id,submitted_at,band,review_status,review_feedback,reviewed_at,payload")
        .eq("student_id", student.id)
        .eq("day_number", day)
        .eq("module", "writing")
        .maybeSingle(),
      supabase
        .from("ark60_writing_drafts")
        .select("answer,duration_seconds,timer_started,timer_paused,remaining_seconds,updated_at")
        .eq("student_id", student.id)
        .eq("day_number", day)
        .maybeSingle(),
    ]);
    submission = submissionResult.data || null;
    draft = submission ? null : (draftResult.data || null);
  }
  const draftScope = student
    ? digest(String(student.id)).slice(0, 16)
    : admin
      ? "admin-" + digest(String(admin.id)).slice(0, 16)
      : null;
  return json({ content, submission, draft, draft_scope: draftScope, preview: Boolean(admin || student?.username === PREVIEW_USERNAME) });
}

export async function POST(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 45000) return json({ detail: "Request is too large." }, 413);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ detail: "Invalid request origin." }, 403);
  const supabase = getServiceSupabase();
  let body = {};
  try { body = await request.json(); } catch { return json({ detail: "Invalid request." }, 400); }
  const action = String(body.action || "");

  if (action === "writing_visit_enter") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const day = validDay(body.day);
    if (!day) return json({ detail: "No daily Writing task is scheduled for this day." }, 400);
    if (!(await isDayUnlocked(day, student))) return json({ detail: "This Writing task is not available yet." }, 403);
    const content = await getContent(day);
    if (!content) return json({ detail: "Writing material has not been published yet." }, 404);
    if (student.username === PREVIEW_USERNAME) return json({ ok: true, preview: true, visit: null });

    const { data: existing } = await supabase
      .from("ark60_submissions")
      .select("id")
      .eq("student_id", student.id)
      .eq("day_number", day)
      .eq("module", "writing")
      .maybeSingle();
    if (existing) return json({ ok: true, submitted: true, visit: null });

    const stamp = new Date().toISOString();
    await supabase
      .from("ark60_writing_visits")
      .update({ left_at: stamp, last_seen_at: stamp, exit_reason: "reenter" })
      .eq("student_id", student.id)
      .eq("day_number", day)
      .is("left_at", null);

    const { data: visit, error } = await supabase
      .from("ark60_writing_visits")
      .insert({ student_id: student.id, day_number: day, entered_at: stamp, last_seen_at: stamp })
      .select("id,entered_at")
      .maybeSingle();
    if (error || !visit) return json({ detail: "Could not start Writing visit tracking." }, 500);
    return json({ ok: true, visit });
  }

  if (action === "writing_visit_ping") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const day = validDay(body.day);
    const visitId = String(body.visit_id || "");
    if (!day || !visitId) return json({ detail: "Invalid Writing visit." }, 400);
    if (student.username === PREVIEW_USERNAME) return json({ ok: true, preview: true });
    const stamp = new Date().toISOString();
    await supabase
      .from("ark60_writing_visits")
      .update({ last_seen_at: stamp })
      .eq("id", visitId)
      .eq("student_id", student.id)
      .eq("day_number", day)
      .is("left_at", null);
    return json({ ok: true });
  }

  if (action === "writing_visit_leave") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const day = validDay(body.day);
    const visitId = String(body.visit_id || "");
    if (!day || !visitId) return json({ detail: "Invalid Writing visit." }, 400);
    if (student.username === PREVIEW_USERNAME) return json({ ok: true, preview: true });
    const allowedReasons = new Set(["hidden","pagehide","back","unload","unknown"]);
    const reason = allowedReasons.has(String(body.reason || "")) ? String(body.reason) : "unknown";
    const stamp = new Date().toISOString();
    await supabase
      .from("ark60_writing_visits")
      .update({ left_at: stamp, last_seen_at: stamp, exit_reason: reason })
      .eq("id", visitId)
      .eq("student_id", student.id)
      .eq("day_number", day)
      .is("left_at", null);
    return json({ ok: true });
  }

  if (action === "draft") {
    const student = await studentFromRequest(request);
    if (!student) return json({ detail: "Please sign in." }, 401);
    const day = validDay(body.day);
    if (!day) return json({ detail: "No daily Writing task is scheduled for this day." }, 400);
    if (!(await isDayUnlocked(day, student))) return json({ detail: "This Writing task is not available yet." }, 403);
    const content = await getContent(day);
    if (!content) return json({ detail: "Writing material has not been published yet." }, 404);

    const answer = String(body.answer || "");
    if (answer.length > 30000) return json({ detail: "Draft is too long." }, 413);
    const durationLimit = Math.max(0, Number(content.payload?.duration_seconds || 0));
    const remaining = Math.max(0, Math.min(durationLimit || 3600, Math.floor(Number(body.remaining_seconds) || 0)));
    const durationSeconds = Math.max(0, Math.min(durationLimit || 3600, Math.floor(Number(body.duration_seconds) || 0)));
    if (student.username === PREVIEW_USERNAME) return json({ ok: true, preview: true, saved: false });

    const { data: existing } = await supabase
      .from("ark60_submissions")
      .select("id")
      .eq("student_id", student.id)
      .eq("day_number", day)
      .eq("module", "writing")
      .maybeSingle();
    if (existing) return json({ ok: true, submitted: true, saved: false });

    const { data, error } = await supabase
      .from("ark60_writing_drafts")
      .upsert({
        student_id: student.id,
        day_number: day,
        answer,
        duration_seconds: durationSeconds,
        timer_started: Boolean(body.timer_started),
        timer_paused: Boolean(body.timer_paused),
        remaining_seconds: remaining,
        updated_at: new Date().toISOString(),
      }, { onConflict: "student_id,day_number" })
      .select("updated_at")
      .maybeSingle();
    if (error) return json({ detail: "Could not save your Writing draft." }, 500);
    return json({ ok: true, saved: true, updated_at: data?.updated_at || null });
  }

  if (action === "ai_grade") {
    const admin = await adminFromRequest(request);
    if (!admin) return json({ detail: "Admin sign-in required." }, 401);
    const id = String(body.id || "");
    if (!id) return json({ detail: "Submission id is required." }, 400);
    const result = await assessArk60SubmissionById(id);
    if (!result.ok) return json({ detail: result.error || "AI assessment failed." }, 503);
    return json({ ok: true, result });
  }

  if (action === "ai_grade_pending") {
    const admin = await adminFromRequest(request);
    if (!admin) return json({ detail: "Admin sign-in required." }, 401);
    const result = await gradePendingArk60WritingBatch(Number(body.limit || 8));
    return json({ ok: true, ...result });
  }

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
      .update({ band, review_status: "reviewed", review_feedback: feedback || null, reviewed_at: new Date().toISOString() })
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
  if (!(await isDayUnlocked(day, student))) return json({ detail: "This Writing task is not available yet." }, 403);
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
  if (student.username === PREVIEW_USERNAME) {
    return json({
      ok: true,
      preview: true,
      submission: {
        id: "preview-writing-" + day,
        submitted_at: new Date().toISOString(),
        band: null,
        review_status: "preview",
        review_feedback: null,
        reviewed_at: null,
        payload,
      },
    });
  }
  const { data, error } = await supabase
    .from("ark60_submissions")
    .insert({ student_id: student.id, day_number: day, module: "writing", payload, review_status: "pending" })
    .select("id,student_id,day_number,module,submitted_at,review_status,payload")
    .maybeSingle();
  if (error) {
    if (String(error.code) === "23505") return json({ detail: "You have already submitted this Writing task." }, 409);
    return json({ detail: "Could not submit your Writing response." }, 500);
  }
  await supabase
    .from("ark60_writing_drafts")
    .delete()
    .eq("student_id", student.id)
    .eq("day_number", day);

  if (data?.submitted_at) {
    await supabase
      .from("ark60_writing_visits")
      .update({ left_at: data.submitted_at, last_seen_at: data.submitted_at, exit_reason: "submit" })
      .eq("student_id", student.id)
      .eq("day_number", day)
      .is("left_at", null);
  }

  let ai_result = null;
  try {
    ai_result = data ? await assessArk60Submission(data) : null;
  } catch (e) {
    console.error("Daily Writing AI assessment failed after submit", e);
  }
  return json({ ok: true, submission: data, ai_result });
}
