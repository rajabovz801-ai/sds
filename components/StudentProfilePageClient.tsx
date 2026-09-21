'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CalendarCheckIcon,
  GlobeIcon,
  HelpCircleIcon,
  LogOutIcon,
  TargetIcon,
  UserIcon,
} from '@/components/UiIcons';
import type { StudentSummary } from '@/lib/auth/server-session';
import type { StudentAccountInfo } from '@/lib/studentAccount';

type Props = {
  student: StudentSummary;
  account: StudentAccountInfo;
  targetBand: number | null;
};

function createdLabel(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function StudentProfilePageClient({ student, account, targetBand }: Props) {
  const router = useRouter();
  const [language, setLanguage] = useState<'EN' | 'UZ'>('EN');
  const [theme, setTheme] = useState<'Light' | 'Dark' | 'System'>('System');
  const [notifications, setNotifications] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
      router.refresh();
    }
  }

  return (
    <div className="accountPage">
      <header className="accountPageHeader">
        <span className="routeRedEyebrow">ACCOUNT</span>
        <h1>My profile</h1>
        <p>Manage your profile & account settings</p>
      </header>

      <div className="accountGrid">
        <div className="accountMainColumn">
          <section className="accountCard">
            <header><span><UserIcon /></span><h2>Profile</h2></header>
            <div className="accountRows">
              <div>
                <span>Name</span>
                <strong>{student.firstName} {student.lastName}</strong>
              </div>
              <div>
                <span>Account</span>
                <strong>{account.telegramUsername ? `@${account.telegramUsername}` : 'Student account'}</strong>
                <small>Used for your ARK Education access</small>
              </div>
              <div>
                <span>Target Band</span>
                <strong>{targetBand === null ? 'Not set' : targetBand.toFixed(1)}</strong>
                <b>›</b>
              </div>
              <div>
                <span>Daily Study Time</span>
                <strong>1 hour</strong>
                <b>›</b>
              </div>
              <div>
                <span>Exam Date</span>
                <strong>Not set</strong>
                <b>›</b>
              </div>
            </div>
          </section>

          <section className="accountCard">
            <header><span><HelpCircleIcon /></span><h2>Support</h2></header>
            <div className="accountActionRows">
              <button type="button">
                <span><HelpCircleIcon /></span>
                <div><strong>Help Center</strong><small>Support and platform guidance</small></div>
                <b>›</b>
              </button>
              <button type="button">
                <span><CalendarCheckIcon /></span>
                <div><strong>Updates</strong><small>Platform changes and new features</small></div>
                <b>›</b>
              </button>
            </div>
          </section>

          <section className="accountCard">
            <header><span><GlobeIcon /></span><h2>Legal</h2></header>
            <div className="accountActionRows legal">
              <button type="button"><div><strong>Privacy Policy</strong></div><b>›</b></button>
              <button type="button"><div><strong>Terms of Service</strong></div><b>›</b></button>
            </div>
          </section>
        </div>

        <aside className="accountSideColumn">
          <section className="accountCard preferencesCard">
            <header><span><TargetIcon /></span><h2>Preferences</h2></header>

            <div className="preferenceBlock">
              <span>Language</span>
              <div className="segmentedControl">
                {(['EN', 'UZ'] as const).map((item) => (
                  <button key={item} type="button" className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="preferenceBlock">
              <span>Theme</span>
              <div className="segmentedControl three">
                {(['Light', 'Dark', 'System'] as const).map((item) => (
                  <button key={item} type="button" className={theme === item ? 'active' : ''} onClick={() => setTheme(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="notificationRow">
              <strong>Push notifications</strong>
              <button
                type="button"
                aria-label="Toggle push notifications"
                className={notifications ? 'toggleOn' : 'toggleOff'}
                onClick={() => setNotifications((value) => !value)}
              >
                <i />
              </button>
            </div>
          </section>

          <button className="profileLogout" type="button" onClick={logout} disabled={loggingOut}>
            <LogOutIcon />
            <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
          </button>

          <p className="accountCreated">Account created {createdLabel(account.createdAt)}</p>
        </aside>
      </div>
    </div>
  );
}
