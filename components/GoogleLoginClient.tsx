'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.2c0-.74-.07-1.45-.19-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.28Z"/>
      <path fill="#34A853" d="M12 21.7c2.62 0 4.83-.87 6.44-2.22l-3.14-2.44c-.87.58-1.99.93-3.3.93-2.53 0-4.67-1.71-5.44-4.01H3.31v2.52A9.73 9.73 0 0 0 12 21.7Z"/>
      <path fill="#FBBC05" d="M6.56 13.96A5.86 5.86 0 0 1 6.25 12c0-.68.12-1.34.31-1.96V7.52H3.31A9.68 9.68 0 0 0 2.3 12c0 1.61.39 3.14 1.01 4.48l3.25-2.52Z"/>
      <path fill="#EA4335" d="M12 6.03c1.42 0 2.69.49 3.69 1.44l2.82-2.82A9.44 9.44 0 0 0 12 2.3a9.73 9.73 0 0 0-8.69 5.22l3.25 2.52C7.33 7.74 9.47 6.03 12 6.03Z"/>
    </svg>
  );
}

export function GoogleLoginClient({ nextPath = '/mock' }: { nextPath?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    setBusy(true);
    setError('');
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', nextPath);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback.toString(),
          scopes: 'openid email profile',
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Google orqali kirish amalga oshmadi.');
    }
  }

  return (
    <div className="googleLoginBox">
      <button className="googleLoginButton" type="button" onClick={signIn} disabled={busy}>
        <span className="googleLoginMark"><GoogleMark /></span>
        <span>{busy ? 'Google ochilmoqda…' : 'Continue with Google'}</span>
      </button>
      {error && <p className="googleLoginError" role="alert">{error}</p>}
    </div>
  );
}
