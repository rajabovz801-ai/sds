'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLoginClient() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Admin login failed.');
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed.');
      setBusy(false);
    }
  }

  return (
    <form className="adminHiddenLogin" onSubmit={submit}>
      <h1>Admin</h1>
      <input
        type="password"
        value={pin}
        onChange={(event) => setPin(event.target.value.slice(0, 128))}
        placeholder="Admin PIN"
        autoComplete="current-password"
        autoFocus
      />
      {error && <p>{error}</p>}
      <button type="submit" disabled={busy || pin.length < 4}>{busy ? 'Opening…' : 'Open admin'}</button>
    </form>
  );
}
