import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { CEFR_SPEAKING_AUDIO_BUCKET } from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data: recording, error: findError } = await supabase
      .from('cefr_speaking_recordings')
      .select('id,audio_path')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!recording) return NextResponse.json({ error: 'Recording topilmadi.' }, { status: 404 });

    if (recording.audio_path) {
      const { error: storageError } = await supabase.storage
        .from(CEFR_SPEAKING_AUDIO_BUCKET)
        .remove([recording.audio_path]);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabase
      .from('cefr_speaking_recordings')
      .delete()
      .eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Recording o‘chirilmadi.' }, { status: 500 });
  }
}
