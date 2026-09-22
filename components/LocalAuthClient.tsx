'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'signup' | 'signin' | 'complete';

export function LocalAuthClient({ nextPath = '/mock' }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setCode('');
    setConfirm('');
    setError('');
    setShowCode(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (mode === 'signup' && code !== confirm) {
      setError('The two codes do not match.');
      return;
    }
    setBusy(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/local-register' : '/api/auth/local-login';
      const body = mode === 'signup'
        ? { firstName, lastName, passcode: code, confirmPasscode: confirm }
        : { loginId, passcode: code };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Please try again.');
      if (mode === 'signup') {
        setCreatedId(payload.loginId);
        setMode('complete');
        setCode('');
        setConfirm('');
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'complete') {
    return (
      <div className="arkLocalComplete">
        <span className="arkLocalSuccessIcon" aria-hidden="true">✓</span>
        <h2>Account created</h2>
        <p>Your Student ID is ready. Keep it somewhere safe — you will use it with your code to sign in.</p>
        <div className="arkLocalIdCard">
          <span>YOUR STUDENT ID</span>
          <strong>{createdId}</strong>
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(createdId); setCopied(true); }
            catch { setError('Select and copy your Student ID manually.'); }
          }}>{copied ? 'Copied!' : 'Copy ID'}</button>
        </div>
        {error && <p className="arkLocalError" role="alert">{error}</p>}
        <button type="button" className="arkLocalPrimary" onClick={() => { router.replace(nextPath); router.refresh(); }}>
          Open Dashboard <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  const signup = mode === 'signup';
  return (
    <>
      <div className="arkAuthTabs" role="group" aria-label="Account access">
        <button type="button" className={signup ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button>
        <button type="button" className={!signup ? 'active' : ''} onClick={() => switchMode('signin')}>Sign in</button>
      </div>
      <h1>{signup ? 'Create Account' : 'Welcome Back'}</h1>
      <p className="googleAuthCopy">{signup
        ? 'Enter your name and create a private code.'
        : 'Enter your Student ID and private code.'}</p>
      <form className="arkLocalForm" onSubmit={submit}>
        {signup ? (
          <div className="arkLocalNameGrid">
            <label>First name
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" placeholder="Your name" maxLength={60} required disabled={busy}/>
            </label>
            <label>Last name
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" placeholder="Your surname" maxLength={60} required disabled={busy}/>
            </label>
          </div>
        ) : (
          <label>Student ID
            <input value={loginId} onChange={(event) => setLoginId(event.target.value.toUpperCase())} placeholder="ARK-XXXX-XXXXXX" autoComplete="username" spellCheck={false} maxLength={15} required disabled={busy}/>
          </label>
        )}
        <label>{signup ? 'Create code' : 'Your code'}
          <span className="arkLocalSecret">
            <input
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder="At least 8 characters"
              minLength={8}
              maxLength={128}
              required
              disabled={busy}
            />
            <button type="button" onClick={() => setShowCode((shown) => !shown)} aria-label={showCode ? 'Hide code' : 'Show code'}>{showCode ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        {signup && <label>Confirm code
          <input
            type={showCode ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="Repeat your code"
            minLength={8}
            maxLength={128}
            required
            disabled={busy}
          />
        </label>}
        {signup && <p className="arkLocalHint">Use at least 8 characters with letters and numbers. Your code is kept private.</p>}
        {error && <p className="arkLocalError" role="alert">{error}</p>}
        <button type="submit" className="arkLocalPrimary" disabled={busy || (signup && (!firstName || !lastName || !confirm)) || !code}>
          {busy ? 'Please wait…' : signup ? 'Create Account' : 'Sign In'}
        </button>
      </form>
      <p className="arkLocalSwitch">
        {signup ? 'Already have an account?' : 'New to ARK IELTS?'}{' '}
        <button type="button" onClick={() => switchMode(signup ? 'signin' : 'signup')}>{signup ? 'Sign in' : 'Create account'}</button>
      </p>
    </>
  );
}
