'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlameIcon, LogOutIcon, TrashIcon, UploadCloudIcon, UserIcon, ZapIcon } from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import styles from './StudentProfileMenu.module.css';

type Props = {
  student: StudentSummary;
  totalPts: number;
  streakDays: number;
  previewMode?: boolean;
};

function getInitials(student: StudentSummary) {
  return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR';
}

export function StudentProfileMenu({ student, totalPts, streakDays, previewMode = false }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(student.avatarUrl || null);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const initials = getInitials(student);

  useEffect(() => setAvatarUrl(student.avatarUrl || null), [student.avatarUrl]);

  useEffect(() => {
    const onAvatarUpdated = (event: Event) => {
      const next = (event as CustomEvent<{ avatarUrl?: string | null }>).detail?.avatarUrl;
      if (typeof next === 'string' || next === null) setAvatarUrl(next ?? null);
    };
    window.addEventListener('ark:avatar-updated', onAvatarUpdated);
    return () => window.removeEventListener('ark:avatar-updated', onAvatarUpdated);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function uploadAvatar(file: File) {
    if (previewMode || busy) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Faqat JPG, PNG yoki WEBP rasm tanlang.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Rasm 3 MB dan kichik bo‘lishi kerak.');
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const payload = await response.json() as { avatarUrl?: string; error?: string };
      if (!response.ok || !payload.avatarUrl) throw new Error(payload.error || 'Rasm yuklanmadi.');
      setAvatarUrl(payload.avatarUrl);
      window.dispatchEvent(new CustomEvent('ark:avatar-updated', { detail: { avatarUrl: payload.avatarUrl } }));
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Rasmni yuklab bo‘lmadi.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeAvatar() {
    if (previewMode || busy || !avatarUrl) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/profile/avatar', { method: 'DELETE' });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Rasm olib tashlanmadi.');
      setAvatarUrl(null);
      window.dispatchEvent(new CustomEvent('ark:avatar-updated', { detail: { avatarUrl: null } }));
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Rasmni olib tashlab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (previewMode || loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
      router.refresh();
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Profil menyusini ochish"
      >
        <span className={styles.avatarSmall}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </span>
        <span className={styles.triggerCopy}>
          <small>{previewMode ? 'ADMIN PREVIEW' : 'STUDENT'}</small>
          <strong>{student.firstName} {student.lastName}</strong>
        </span>
        <span className={styles.triggerIcon}><UserIcon /></span>
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Student profili">
          <div className={styles.panelHead}>
            <span className={styles.avatarLarge}>
              {avatarUrl ? <img src={avatarUrl} alt="Profil rasmi" /> : initials}
            </span>
            <div>
              <small>{previewMode ? 'ADMIN PREVIEW' : 'ARK STUDENT'}</small>
              <strong>{student.firstName} {student.lastName}</strong>
              <span>Shaxsiy profil</span>
            </div>
          </div>

          <div className={styles.stats}>
            <div><span><ZapIcon /></span><small>Total PTS</small><strong>{totalPts}</strong></div>
            <div><span><FlameIcon /></span><small>Streak</small><strong>{streakDays} kun</strong></div>
          </div>

          {!previewMode && (
            <div className={styles.avatarActions}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                <UploadCloudIcon />
                <span>{busy ? 'Yuklanmoqda...' : avatarUrl ? 'Rasmni almashtirish' : 'Profil rasmi tanlash'}</span>
              </button>
              {avatarUrl && (
                <button type="button" className={styles.remove} onClick={removeAvatar} disabled={busy} aria-label="Profil rasmini olib tashlash">
                  <TrashIcon />
                </button>
              )}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.rule} />
          {!previewMode ? (
            <button type="button" className={styles.logout} onClick={logout} disabled={loggingOut}>
              <LogOutIcon /><span>{loggingOut ? 'Chiqilmoqda...' : 'Log out'}</span>
            </button>
          ) : (
            <div className={styles.previewNote}><UserIcon /> Profil o‘zgarishlari preview rejimida o‘chiq.</div>
          )}
        </div>
      )}
    </div>
  );
}
