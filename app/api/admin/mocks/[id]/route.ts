import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { mockDraftBridgeScript } from '@/lib/mockDraftBridge';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

async function ensureDraftBridge(testIds: string[]) {
  const supabase = getServiceSupabase();
  const { data: tests, error } = await supabase
    .from('tests')
    .select('id,file_path')
    .in('id', testIds)
    .eq('mock_only', true);
  if (error) throw error;
  if ((tests || []).length !== testIds.length) throw new Error('Mock test fayllari topilmadi.');

  for (const test of tests || []) {
    const { data: file, error: downloadError } = await supabase.storage.from(HTML_TESTS_BUCKET).download(test.file_path);
    if (downloadError || !file) throw downloadError || new Error('Mock HTML yuklanmadi.');
    let html = await file.text();
    if (html.includes('ARK_DRAFT_STATE')) continue;
    const bridge = mockDraftBridgeScript();
    html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${bridge}</body>`) : `${html}${bridge}`;
    const { error: uploadError } = await supabase.storage.from(HTML_TESTS_BUCKET).upload(
      test.file_path,
      new TextEncoder().encode(html),
      { contentType: 'text/html;charset=utf-8', cacheControl: '3600', upsert: true },
    );
    if (uploadError) throw uploadError;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || '');
    if (!['publish', 'close'].includes(action)) {
      return NextResponse.json({ error: 'Mock action noto‘g‘ri.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: mock, error } = await supabase
      .from('mocks')
      .select('id,status,listening_test_id,reading_test_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!mock) return NextResponse.json({ error: 'Mock topilmadi.' }, { status: 404 });

    if (action === 'publish') {
      const testIds = [mock.listening_test_id, mock.reading_test_id].filter(Boolean) as string[];
      if (testIds.length !== 2) return NextResponse.json({ error: 'Listening va Reading testlari to‘liq biriktirilmagan.' }, { status: 409 });

      await ensureDraftBridge(testIds);

      const { error: testsError } = await supabase.from('tests').update({ status: 'published', updated_at: new Date().toISOString() }).in('id', testIds).eq('mock_only', true);
      if (testsError) throw testsError;
      const publishedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from('mocks').update({
        status: 'published',
        dashboard_enabled: true,
        starts_at: publishedAt,
        ends_at: null,
        updated_at: publishedAt,
      }).eq('id', id).select('id,title,status,dashboard_enabled,starts_at,ends_at').single();
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, mock: updated });
    }

    const closedAt = new Date().toISOString();
    const testIds = [mock.listening_test_id, mock.reading_test_id].filter(Boolean) as string[];

    const { data: attemptRows, error: attemptLookupError } = await supabase
      .from('attempts')
      .select('id')
      .eq('mock_id', id)
      .eq('attempt_type', 'mock');
    if (attemptLookupError) throw attemptLookupError;
    const attemptIds = (attemptRows || []).map((row) => String(row.id));

    const { data: updated, error: updateError } = await supabase.from('mocks').update({
      status: 'closed',
      dashboard_enabled: false,
      ends_at: closedAt,
      updated_at: closedAt,
    }).eq('id', id).select('id,title,status,dashboard_enabled,ends_at').single();
    if (updateError) throw updateError;

    if (attemptIds.length) {
      const { error: sessionCloseError } = await supabase
        .from('test_sessions')
        .update({ status: 'expired', updated_at: closedAt })
        .in('mock_attempt_id', attemptIds)
        .eq('status', 'in_progress');
      if (sessionCloseError) throw sessionCloseError;
    }

    const { error: attemptCloseError } = await supabase
      .from('attempts')
      .update({ status: 'abandoned' })
      .eq('mock_id', id)
      .eq('attempt_type', 'mock')
      .eq('status', 'in_progress');
    if (attemptCloseError) throw attemptCloseError;

    if (testIds.length) {
      const { error: testsCloseError } = await supabase
        .from('tests')
        .update({ status: 'draft', updated_at: closedAt })
        .in('id', testIds)
        .eq('mock_only', true);
      if (testsCloseError) throw testsCloseError;
    }

    return NextResponse.json({
      ok: true,
      mock: updated,
      closed: {
        attempts: attemptIds.length,
        mockTests: testIds.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock update server error' }, { status: 500 });
  }
}
