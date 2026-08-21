import { createClient } from '@supabase/supabase-js';

export const HTML_TESTS_BUCKET = 'html-tests';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://svdigxqdivcmljirjwhk.supabase.co';
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hUwidPKyACilx67GyFeocA_v9rWpnBB';

export function getPublicSupabase() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function getServiceSupabase() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not configured');
  }
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
