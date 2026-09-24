import { getServiceSupabase } from '@/lib/supabase/server';

export type StudentAccountInfo = {
  createdAt: string | null;
  telegramUsername: string | null;
};

export async function getStudentAccountInfo(studentId: string): Promise<StudentAccountInfo> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('created_at,telegram_username')
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw error;

  return {
    createdAt: data?.created_at || null,
    telegramUsername: data?.telegram_username || null,
  };
}
