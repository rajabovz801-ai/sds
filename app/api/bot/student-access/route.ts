import { randomInt, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashAccessCode } from '@/lib/auth/codes';
import { getServiceSupabase } from '@/lib/supabase/server';

const CODE_TTL_MINUTES = 15;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorized(request: NextRequest) {
  const expected = (process.env.BOT_REGISTRATION_SECRET || '').trim();
  const received = (request.headers.get('x-ark-bot-secret') || '').trim();
  return expected !== '' && received !== '' && safeEqual(expected, received);
}

function cleanName(value: unknown, max = 80) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanUsername(value: unknown) {
  const text = String(value || '').trim().replace(/^@/, '');
  return text === '' ? null : text.slice(0, 64);
}

async function findStudent(telegramId: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('id,telegram_id,telegram_username,first_name,last_name,status')
    .eq('telegram_id', telegramId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function issueCode(studentId: string) {
  const supabase = getServiceSupabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString();

  await supabase
    .from('login_codes')
    .update({ used_at: now.toISOString() })
    .eq('student_id', studentId)
    .is('used_at', null);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = String(randomInt(100000, 1000000));
    const { error } = await supabase.from('login_codes').insert({
      student_id: studentId,
      code_hash: hashAccessCode(code),
      expires_at: expiresAt,
      used_at: null,
    });
    if (!error) return { code, expiresAt, expiresMinutes: CODE_TTL_MINUTES };
  }

  throw new Error('Kirish kodi yaratilmadi. Qayta urinib ko‘ring.');
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized bot request' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action || '').trim().toLowerCase();
    const telegramId = String(body?.telegramId || '').replace(/\D/g, '');
    const username = cleanUsername(body?.username);

    if (!/^\d{5,20}$/.test(telegramId)) {
      return NextResponse.json({ error: 'Telegram ID noto‘g‘ri.' }, { status: 400 });
    }

    if (action === 'profile') {
      const student = await findStudent(telegramId);
      if (!student) return NextResponse.json({ registered: false });
      return NextResponse.json({
        registered: true,
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          username: student.telegram_username,
          status: student.status,
        },
      });
    }

    if (action === 'register') {
      const firstName = cleanName(body?.firstName, 60);
      const lastName = cleanName(body?.lastName, 80);
      if (firstName.length < 2 || lastName.length < 2) {
        return NextResponse.json({ error: 'Ism va familiya to‘liq kiritilishi kerak.' }, { status: 400 });
      }

      const supabase = getServiceSupabase();
      let student = await findStudent(telegramId);

      if (student) {
        const { data, error } = await supabase
          .from('students')
          .update({
            telegram_username: username,
            first_name: firstName,
            last_name: lastName,
            status: 'active',
          })
          .eq('id', student.id)
          .select('id,telegram_username,first_name,last_name,status')
          .single();
        if (error) throw error;
        student = data;
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert({
            telegram_id: telegramId,
            telegram_username: username,
            first_name: firstName,
            last_name: lastName,
            status: 'active',
          })
          .select('id,telegram_username,first_name,last_name,status')
          .single();
        if (error) throw error;
        student = data;
      }

      const access = await issueCode(student.id);
      return NextResponse.json({
        registered: true,
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          username: student.telegram_username,
          status: student.status,
        },
        ...access,
      });
    }

    if (action === 'code') {
      const student = await findStudent(telegramId);
      if (!student || student.status !== 'active') {
        return NextResponse.json({ error: 'Avval ro‘yxatdan o‘ting.', registered: false }, { status: 404 });
      }
      const access = await issueCode(student.id);
      return NextResponse.json({
        registered: true,
        student: {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          username: student.telegram_username,
          status: student.status,
        },
        ...access,
      });
    }

    return NextResponse.json({ error: 'Noma’lum action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bot access server error' },
      { status: 500 },
    );
  }
}
