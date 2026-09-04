import { NextResponse } from 'next/server';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getServiceSupabase } from '@/lib/supabase/server';

const AVATAR_BUCKET = 'student-avatars';
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const session = await getActiveServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const avatar = formData.get('avatar');
  if (!(avatar instanceof File)) {
    return NextResponse.json({ error: 'Profil rasmi topilmadi.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(avatar.type)) {
    return NextResponse.json({ error: 'Faqat JPG, PNG yoki WEBP rasm yuklash mumkin.' }, { status: 400 });
  }
  if (avatar.size <= 0 || avatar.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: 'Profil rasmi 3 MB dan kichik bo‘lishi kerak.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const objectPath = `${session.studentId}/avatar`;
  const bytes = new Uint8Array(await avatar.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, bytes, {
      contentType: avatar.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Avatar upload failed', uploadError);
    return NextResponse.json({ error: 'Rasmni yuklab bo‘lmadi. Qayta urinib ko‘ring.' }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase
    .from('students')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', session.studentId);

  if (updateError) {
    console.error('Avatar profile update failed', updateError);
    return NextResponse.json({ error: 'Profilni yangilab bo‘lmadi.' }, { status: 500 });
  }

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const session = await getActiveServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceSupabase();
  const objectPath = `${session.studentId}/avatar`;
  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([objectPath]);
  if (removeError) console.warn('Avatar storage cleanup failed', removeError);

  const { error: updateError } = await supabase
    .from('students')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', session.studentId);

  if (updateError) {
    console.error('Avatar profile clear failed', updateError);
    return NextResponse.json({ error: 'Profil rasmini olib tashlab bo‘lmadi.' }, { status: 500 });
  }

  return NextResponse.json({ avatarUrl: null });
}
