'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { supabase } from '@/lib/supabase/client';

function safeNext(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/mock';
  if (value.startsWith('/api/') || value.startsWith('/admin')) return '/mock';
  return value;
}

export function GoogleAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error('Google sessiyasi topilmadi.');

        const response = await fetch('/api/auth/google-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'ARK sessiyasi yaratilmadi.');

        if (!cancelled) {
          router.replace(safeNext(searchParams.get('next')) || payload.next || '/mock');
          router.refresh();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Google login xatosi.');
      }
    }

    finish();
    return () => { cancelled = true; };
  }, [router, searchParams]);

  return (
    <main className="arkEntrySplash">
      <div className="arkCallbackState">
        <span className="arkEntryMark"><ArkLogoIcon /></span>
        {error && (
          <>
            <p>{error}</p>
            <button type="button" onClick={() => router.replace('/login')}>Try again</button>
          </>
        )}
      </div>
    </main>
  );
}
