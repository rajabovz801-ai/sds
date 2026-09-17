import { createHash, randomBytes, randomInt } from 'node:crypto';
import { hashAccessCode } from './auth/codes';
import { getServiceSupabase } from './supabase/server';

const CODE_TTL_MINUTES = 15;
const PLATFORM_TOKEN_TTL_MINUTES = 10;
const STUDENT_SELECT = 'id,telegram_id,telegram_username,first_name,last_name,status';

export type StudentAccessResult = {
  status: number;
  data: Record<string, any>;
};

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
    .select(STUDENT_SELECT)
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

async function issuePlatformToken(studentId: string) {
  const supabase = getServiceSupabase();
  const now = new Date();
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(now.getTime() + PLATFORM_TOKEN_TTL_MINUTES * 60_000).toISOString();

  await supabase
    .from('ark_english_platform_tokens')
    .update({ used_at: now.toISOString() })
    .eq('student_id', studentId)
    .is('used_at', null);

  const { error } = await supabase.from('ark_english_platform_tokens').insert({
    student_id: studentId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: null,
  });
  if (error) throw error;
  return { platformToken: token, platformExpiresAt: expiresAt };
}

function publicStudent(student: any) {
  return {
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    username: student.telegram_username,
    status: student.status,
  };
}

export async function performStudentAccess(body: any): Promise<StudentAccessResult> {
  const action = String(body?.action || '').trim().toLowerCase();
  const telegramId = String(body?.telegramId || '').replace(/\D/g, '');
  const username = cleanUsername(body?.username);

  if (!/^\d{5,20}$/.test(telegramId)) {
    return { status: 400, data: { error: 'Telegram ID noto‘g‘ri.' } };
  }

  if (action === 'profile') {
    const student = await findStudent(telegramId);
    if (!student) return { status: 200, data: { registered: false } };
    return { status: 200, data: { registered: true, student: publicStudent(student) } };
  }

  if (action === 'register') {
    const firstName = cleanName(body?.firstName, 60);
    const lastName = cleanName(body?.lastName, 80);
    if (firstName.length < 2 || lastName.length < 2) {
      return { status: 400, data: { error: 'Ism va familiya to‘liq kiritilishi kerak.' } };
    }

    const supabase = getServiceSupabase();
    let student = await findStudent(telegramId);

    if (student) {
      if (student.status === 'blocked') {
        return { status: 403, data: { error: 'Profil admin tomonidan bloklangan.', registered: true, blocked: true } };
      }
      const { data, error } = await supabase
        .from('students')
        .update({
          telegram_username: username,
          first_name: firstName,
          last_name: lastName,
          status: 'active',
        })
        .eq('id', student.id)
        .select(STUDENT_SELECT)
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
        .select(STUDENT_SELECT)
        .single();
      if (error) throw error;
      student = data;
    }

    const access = await issueCode(student.id);
    const platform = await issuePlatformToken(student.id);
    return {
      status: 200,
      data: {
        registered: true,
        student: publicStudent(student),
        ...access,
        ...platform,
      },
    };
  }

  if (action === 'code') {
    const student = await findStudent(telegramId);
    if (student?.status === 'blocked') {
      return { status: 403, data: { error: 'Profil admin tomonidan bloklangan.', registered: true, blocked: true } };
    }
    if (!student || student.status !== 'active') {
      return { status: 404, data: { error: 'Avval ro‘yxatdan o‘ting.', registered: false } };
    }
    const access = await issueCode(student.id);
    return { status: 200, data: { registered: true, student: publicStudent(student), ...access } };
  }

  if (action === 'platform') {
    const student = await findStudent(telegramId);
    if (student?.status === 'blocked') {
      return { status: 403, data: { error: 'Profil admin tomonidan bloklangan.', registered: true, blocked: true } };
    }
    if (!student || student.status !== 'active') {
      return { status: 404, data: { error: 'Avval ro‘yxatdan o‘ting.', registered: false } };
    }
    const platform = await issuePlatformToken(student.id);
    return { status: 200, data: { registered: true, student: publicStudent(student), ...platform } };
  }

  return { status: 400, data: { error: 'Noma’lum action.' } };
}
