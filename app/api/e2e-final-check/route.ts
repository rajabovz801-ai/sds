import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const PROD = 'https://sds-virid-five.vercel.app';
const TEST_ID = '51f3317b-2952-4688-a99d-e197b14e4fbd';
const CODE = '55361302';
const TOKEN_HASH = '1e2a6689b2639aa657bc967e3a5d52b0a1b9b2c848b2d739ae31e3ef58d745ae';

function tokenOk(value: string) {
  const actual = Buffer.from(createHash('sha256').update(value).digest('hex'));
  const expected = Buffer.from(TOKEN_HASH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!tokenOk(request.nextUrl.searchParams.get('token') || '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const login = await fetch(`${PROD}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: CODE }),
    cache: 'no-store',
  });
  const loginBody = await login.json().catch(() => null);
  const setCookie = login.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  if (!login.ok || !cookie) {
    return NextResponse.json({ step: 'login', status: login.status, body: loginBody }, { status: 500 });
  }

  const me = await fetch(`${PROD}/api/auth/me`, { headers: { cookie }, cache: 'no-store' });
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

  const submissionId = `e2e-final-${Date.now()}`;
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

  const dashboard = await fetch(`${PROD}/api/dashboard`, { headers: { cookie }, cache: 'no-store' });
  const dashboardBody = await dashboard.json().catch(() => null);

  return NextResponse.json({
    login: { status: login.status, ok: login.ok },
    me: { status: me.status, ok: me.ok, studentId: meBody?.student?.id || null },
    start: { status: start.status, ok: start.ok, sessionId: startBody.sessionId, resumed: startBody.resumed },
    submit: { status: submit.status, ok: submit.ok, body: submitBody },
    dashboard: { status: dashboard.status, ok: dashboard.ok, hasBody: Boolean(dashboardBody) },
    submissionId,
  });
}
