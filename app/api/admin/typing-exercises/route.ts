import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ExerciseRow = {
  id: string;
  slug: string;
  title: string;
  prompt_title: string;
  prompt: string;
  content: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
};

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function mapExercise(row: ExerciseRow) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title || ''),
    promptTitle: String(row.prompt_title || 'Writing Task 2'),
    prompt: String(row.prompt || ''),
    content: String(row.content || ''),
    status: row.status === 'draft' ? 'draft' : 'published',
    wordCount: wordCount(String(row.content || '')),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('typing_exercises')
      .select('id,slug,title,prompt_title,prompt,content,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ exercises: ((data || []) as ExerciseRow[]).map(mapExercise) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Typing mashqlari yuklanmadi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const promptTitle = typeof body?.promptTitle === 'string' ? body.promptTitle.trim().slice(0, 80) : 'Writing Task 2';
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 2000) : '';
    const content = typeof body?.content === 'string' ? body.content.trim().slice(0, 20000) : '';
    const status = body?.status === 'draft' ? 'draft' : 'published';

    if (!title) return NextResponse.json({ error: 'Exercise nomini kiriting.' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'Topshiriq savolini kiriting.' }, { status: 400 });
    if (wordCount(content) < 20) return NextResponse.json({ error: 'Typing matni kamida 20 ta so‘z bo‘lishi kerak.' }, { status: 400 });

    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'typing-exercise';
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('typing_exercises')
      .insert({ slug, title, prompt_title: promptTitle || 'Writing Task 2', prompt, content, status, updated_at: now })
      .select('id,slug,title,prompt_title,prompt,content,status,created_at,updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ exercise: mapExercise(data as ExerciseRow) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Typing exercise saqlanmadi.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'Exercise ID topilmadi.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('typing_exercises')
      .delete()
      .eq('id', id)
      .select('id,title')
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Typing exercise topilmadi.' }, { status: 404 });

    return NextResponse.json({ deleted: true, exercise: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Typing exercise o‘chirilmadi.' }, { status: 500 });
  }
}
