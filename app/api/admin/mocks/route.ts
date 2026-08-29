import { randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { hashAccessCode } from '@/lib/auth/codes';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

type AssetRef = { bucket: string; path: string; name: string; size?: number };
type MockSkill = 'listening' | 'reading';

type CreateBody = {
  title?: string;
  candidatePrefix?: string;
  listeningHtml?: AssetRef;
  readingHtml?: AssetRef;
  listeningVideo?: AssetRef;
  readingVideo?: AssetRef;
};

function denied(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

function cleanPrefix(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.slice(0, 18) || 'ARK-M01';
}

function validAsset(value: unknown, bucket: string, pattern: RegExp) {
  if (!value || typeof value !== 'object') return false;
  const asset = value as AssetRef;
  return asset.bucket === bucket && pattern.test(String(asset.path || '')) && Boolean(String(asset.name || '').trim());
}

async function assetExists(asset: AssetRef) {
  const supabase = getServiceSupabase();
  const slash = asset.path.lastIndexOf('/');
  const folder = slash >= 0 ? asset.path.slice(0, slash) : '';
  const name = slash >= 0 ? asset.path.slice(slash + 1) : asset.path;
  const { data, error } = await supabase.storage.from(asset.bucket).list(folder, { search: name, limit: 20 });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === name));
}

function makeCodes(count: number) {
  const used = new Set<string>();
  while (used.size < count) used.add(String(randomInt(100000, 1000000)));
  return [...used];
}

function adapterFor(skill: MockSkill) {
  if (skill === 'reading') {
    return `\n<!-- ARK_MOCK_01_ADAPTER -->\n<style>html[data-ark-guided-mock="1"] #resultScreen,html[data-ark-guided-mock="1"] #resultsScreen,html[data-ark-guided-mock="1"] .result-screen{display:none!important}</style>\n<script>(function(){if(new URLSearchParams(location.search).get('mode')!=='mock')return;document.documentElement.setAttribute('data-ark-guided-mock','1');})();</script>\n`;
  }

  return `\n<!-- ARK_MOCK_01_ADAPTER -->\n<style>html[data-ark-guided-mock="1"] #resultOverlay,html[data-ark-guided-mock="1"] #securityLock{display:none!important}html[data-ark-guided-mock="1"] #reviewBtn,html[data-ark-guided-mock="1"] #restartBtn{display:none!important}</style>\n<script>(function(){if(new URLSearchParams(location.search).get('mode')!=='mock')return;document.documentElement.setAttribute('data-ark-guided-mock','1');var sent=false;try{document.exitFullscreen=function(){return Promise.resolve();};}catch(e){}window.addEventListener('message',function(event){if(event.data&&event.data.type==='ARK_PLATFORM_START'){event.stopImmediatePropagation();}},true);function emit(){if(sent||!window.__finalResult)return;var r=window.__finalResult;var submissionId='mock-listening-'+Date.now().toString(36);var payload={submissionId:submissionId,rawScore:Number(r.score)||0,score:Number(r.score)||0,maxScore:40,total:40,correct:Number(r.score)||0,wrong:Number(r.wrong)||0,unanswered:Number(r.empty)||0,details:{submissionId:submissionId,source:'mock-listening-adapter'}};sent=true;window.__ARK_RESULT__=payload;try{window.parent.postMessage({type:'ARK_TEST_RESULT',payload:payload},'*');}catch(e){}}var timer=setInterval(function(){emit();if(sent)clearInterval(timer);},80);document.addEventListener('DOMContentLoaded',function(){var restart=document.getElementById('restartBtn');if(restart)restart.style.display='none';var review=document.getElementById('reviewBtn');if(review)review.style.display='none';var steps=document.querySelectorAll('.premium-steps div p');if(steps&&steps[2])steps[2].textContent='This Full Mock section can only be completed once.';});})();</script>\n`;
}

async function prepareMockHtml(asset: AssetRef, skill: MockSkill) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(asset.bucket).download(asset.path);
  if (error || !data) throw error || new Error(`${skill} HTML yuklanmadi.`);
  let html = await data.text();
  if (html.includes('ARK_MOCK_01_ADAPTER')) return;
  const adapter = adapterFor(skill);
  html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${adapter}</body>`) : `${html}${adapter}`;
  const bytes = new TextEncoder().encode(html);
  const { error: uploadError } = await supabase.storage.from(asset.bucket).upload(asset.path, bytes, {
    contentType: 'text/html;charset=utf-8',
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) throw uploadError;
}

export async function GET(request: NextRequest) {
  const authDenied = denied(request);
  if (authDenied) return authDenied;

  try {
    const supabase = getServiceSupabase();
    const { data: mocks, error: mockError } = await supabase
      .from('mocks')
      .select('id,title,track,status,reading_test_id,listening_test_id,listening_video_path,reading_video_path,candidate_prefix,dashboard_enabled,starts_at,ends_at,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (mockError) throw mockError;

    const mockIds = (mocks || []).map((item) => item.id);
    const testIds = [...new Set((mocks || []).flatMap((item) => [item.listening_test_id, item.reading_test_id]).filter(Boolean))] as string[];

    const [testsResult, codesResult, attemptsResult, studentsResult] = await Promise.all([
      testIds.length
        ? supabase.from('tests').select('id,title,skill,status,file_name,file_path,duration_minutes,mock_only').in('id', testIds)
        : Promise.resolve({ data: [], error: null }),
      mockIds.length
        ? supabase.from('mock_access_codes').select('id,mock_id,student_id,candidate_id,code_plain,expires_at,used_at,created_at').in('mock_id', mockIds)
        : Promise.resolve({ data: [], error: null }),
      mockIds.length
        ? supabase.from('attempts').select('id,mock_id,student_id,status,started_at,completed_at,overall_score,overall_band').eq('attempt_type', 'mock').in('mock_id', mockIds).order('started_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('students').select('id,first_name,last_name,status').order('first_name').order('last_name'),
    ]);
    if (testsResult.error) throw testsResult.error;
    if (codesResult.error) throw codesResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    if (studentsResult.error) throw studentsResult.error;

    const attempts = attemptsResult.data || [];
    const attemptIds = attempts.map((item) => item.id);
    const { data: results, error: resultsError } = attemptIds.length
      ? await supabase.from('section_results').select('attempt_id,section,raw_score,max_score,band,details,created_at').in('attempt_id', attemptIds)
      : { data: [], error: null };
    if (resultsError) throw resultsError;

    return NextResponse.json({
      mocks: mocks || [],
      tests: testsResult.data || [],
      codes: codesResult.data || [],
      attempts,
      results: results || [],
      students: studentsResult.data || [],
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock admin data server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authDenied = denied(request);
  if (authDenied) return authDenied;

  let createdMockId = '';
  const createdTestIds: string[] = [];
  let assets: AssetRef[] = [];

  try {
    const body = await request.json() as CreateBody;
    const title = String(body.title || 'IELTS FULL MOCK 01').trim().slice(0, 120);
    const candidatePrefix = cleanPrefix(String(body.candidatePrefix || 'ARK-M01'));

    if (!validAsset(body.listeningHtml, HTML_TESTS_BUCKET, /^ielts\/listening\/mock-[^/]+\.html?$/i)
      || !validAsset(body.readingHtml, HTML_TESTS_BUCKET, /^ielts\/reading\/mock-[^/]+\.html?$/i)
      || !validAsset(body.listeningVideo, 'mock-assets', /^instructions\/listening\/[^/]+\.mp4$/i)
      || !validAsset(body.readingVideo, 'mock-assets', /^instructions\/reading\/[^/]+\.mp4$/i)) {
      return NextResponse.json({ error: 'Mock fayllari to‘liq yuklanmagan yoki noto‘g‘ri.' }, { status: 400 });
    }

    assets = [body.listeningHtml!, body.readingHtml!, body.listeningVideo!, body.readingVideo!];
    const checks = await Promise.all(assets.map(assetExists));
    if (checks.some((exists) => !exists)) {
      return NextResponse.json({ error: 'Yuklangan fayllardan biri Storage’da topilmadi. Qayta yuklang.' }, { status: 409 });
    }

    await Promise.all([
      prepareMockHtml(body.listeningHtml!, 'listening'),
      prepareMockHtml(body.readingHtml!, 'reading'),
    ]);

    const supabase = getServiceSupabase();
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id,first_name,last_name')
      .eq('status', 'active')
      .order('first_name')
      .order('last_name')
      .order('id');
    if (studentsError) throw studentsError;
    if (!students?.length) return NextResponse.json({ error: 'Faol o‘quvchilar topilmadi.' }, { status: 409 });

    const listening = await supabase.from('tests').insert({
      title: `${title} · Listening`,
      description: 'Dedicated Listening section for the guided Full Mock flow.',
      track: 'ielts',
      skill: 'listening',
      status: 'draft',
      duration_minutes: 60,
      file_name: body.listeningHtml!.name,
      file_path: body.listeningHtml!.path,
      mock_only: true,
    }).select('id').single();
    if (listening.error || !listening.data) throw listening.error || new Error('Listening test yaratilmadi.');
    createdTestIds.push(listening.data.id);

    const reading = await supabase.from('tests').insert({
      title: `${title} · Reading`,
      description: 'Dedicated Reading section for the guided Full Mock flow.',
      track: 'ielts',
      skill: 'reading',
      status: 'draft',
      duration_minutes: 60,
      file_name: body.readingHtml!.name,
      file_path: body.readingHtml!.path,
      mock_only: true,
    }).select('id').single();
    if (reading.error || !reading.data) throw reading.error || new Error('Reading test yaratilmadi.');
    createdTestIds.push(reading.data.id);

    const { data: mock, error: createMockError } = await supabase.from('mocks').insert({
      title,
      track: 'ielts',
      listening_test_id: listening.data.id,
      reading_test_id: reading.data.id,
      listening_video_path: body.listeningVideo!.path,
      reading_video_path: body.readingVideo!.path,
      candidate_prefix: candidatePrefix,
      dashboard_enabled: false,
      status: 'draft',
    }).select('id,title,status').single();
    if (createMockError || !mock) throw createMockError || new Error('Mock yaratilmadi.');
    createdMockId = mock.id;

    const plainCodes = makeCodes(students.length);
    const accessRows = students.map((student, index) => ({
      student_id: student.id,
      mock_id: mock.id,
      candidate_id: `${candidatePrefix}-${String(index + 1).padStart(3, '0')}`,
      code_plain: plainCodes[index],
      code_hash: hashAccessCode(plainCodes[index]),
      expires_at: null,
      used_at: null,
    }));
    const { error: codesError } = await supabase.from('mock_access_codes').insert(accessRows);
    if (codesError) throw codesError;

    return NextResponse.json({ ok: true, mock, candidates: accessRows.length }, { status: 201 });
  } catch (error) {
    const supabase = getServiceSupabase();
    if (createdMockId) {
      try { await supabase.from('mock_access_codes').delete().eq('mock_id', createdMockId); } catch {}
      try { await supabase.from('mocks').delete().eq('id', createdMockId); } catch {}
    }
    if (createdTestIds.length) {
      try { await supabase.from('tests').delete().in('id', createdTestIds); } catch {}
    }
    if (assets.length) {
      for (const bucket of [...new Set(assets.map((asset) => asset.bucket))]) {
        const paths = assets.filter((asset) => asset.bucket === bucket).map((asset) => asset.path);
        try { await supabase.storage.from(bucket).remove(paths); } catch {}
      }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock setup server error' }, { status: 500 });
  }
}
