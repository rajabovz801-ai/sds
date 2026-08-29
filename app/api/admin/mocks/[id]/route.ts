import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

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

      const { error: testsError } = await supabase.from('tests').update({ status: 'published', updated_at: new Date().toISOString() }).in('id', testIds).eq('mock_only', true);
      if (testsError) throw testsError;
      const { data: updated, error: updateError } = await supabase.from('mocks').update({
        status: 'published',
        dashboard_enabled: true,
        starts_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('id,title,status,dashboard_enabled,starts_at').single();
      if (updateError) throw updateError;
      return NextResponse.json({ ok: true, mock: updated });
    }

    const { data: updated, error: updateError } = await supabase.from('mocks').update({
      status: 'closed',
      dashboard_enabled: false,
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id,title,status,dashboard_enabled,ends_at').single();
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, mock: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock update server error' }, { status: 500 });
  }
}
