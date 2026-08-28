import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const TOKEN_HASH = 'e6214fc2f70c4dcdc177b64aea173600811f5c4d6c22b29412c816f353faafbb';
const PROD = 'https://sds-virid-five.vercel.app';
const TEST_ID = '51f3317b-2952-4688-a99d-e197b14e4fbd';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function tokenOk(value: string) {
  const a = Buffer.from(sha256(value));
  const b = Buffer.from(TOKEN_HASH);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const code = request.nextUrl.searchParams.get('code') || '';
  if (!tokenOk(token) || !/^\d{4,8}$/.test(code)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const login = await fetch(`${PROD}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });
  const loginBody = await login.json().catch(() => null);
  const setCookie = login.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  if (!login.ok || !cookie) {
    return NextResponse.json({ step: 'login', status: login.status, body: loginBody }, { status: 500 });
  }

  const me = await fetch(`${PROD}/api/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  });
  const meBody = await me.json().catch(() => null);

  const start = await fetch(`${PROD}/api/tests/${TEST_ID}/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ mode: 'practice' }),
    cache: 'no-store',
  });
  const startBody = await start.json().catch(() => null) as { sessionId?: string; resumed?: boolean } | null;
  if (!start.ok || !startBody?.sessionId) {
    return NextResponse.json({ step: 'start', meStatus: me.status, status: start.status, body: startBody }, { status: 500 });
  }

  const submissionId = `e2e-${Date.now()}`;
  const submit = await fetch(`${PROD}/api/tests/${TEST_ID}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      testSessionId: startBody.sessionId,
      correct: 0,
      wrong: 0,
      unanswered: 40,
      rawScore: 0,
      maxScore: 40,
      band: 0,
      durationSeconds: 1,
      details: { submissionId, e2e: true, note: 'TEMP E2E TEST - IGNORE' },
    }),
    cache: 'no-store',
  });
  const submitBody = await submit.json().catch(() => null);

  const dashboard = await fetch(`${PROD}/api/dashboard`, {
    headers: { cookie },
    cache: 'no-store',
  });
  const dashboardBody = await dashboard.json().catch(() => null);

  return NextResponse.json({
    login: { status: login.status, ok: login.ok, next: loginBody?.next },
    me: { status: me.status, ok: me.ok, student: meBody?.student ? { id: meBody.student.id, firstName: meBody.student.firstName, lastName: meBody.student.lastName } : null },
    start: { status: start.status, ok: start.ok, sessionId: startBody.sessionId, resumed: startBody.resumed },
    submit: { status: submit.status, ok: submit.ok, body: submitBody },
    dashboard: { status: dashboard.status, ok: dashboard.ok, hasBody: Boolean(dashboardBody) },
    submissionId,
  });
}
