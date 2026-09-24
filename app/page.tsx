import Link from "next/link";

export default function Home(){
  return <main className="auth-shell">
    <section className="auth-brand">
      <div className="eyebrow">ARK EDUCATION · IELTS</div>
      <h1>60 days.<br/>One target.</h1>
      <p>1 October — 29 November 2026. Daily IELTS practice, Sunday full mocks, real study-time tracking and teacher feedback.</p>
      <div className="auth-metrics"><div><strong>60</strong><span>days</span></div><div><strong>51</strong><span>study days</span></div><div><strong>9</strong><span>full mocks</span></div></div>
    </section>
    <section className="auth-card">
      <div className="brand-mark">A</div>
      <div><p className="muted caps">STUDENT ACCESS</p><h2>Welcome to ARK IELTS</h2><p className="muted">First visit: enter your name, surname and access code. Your personal username will be created automatically.</p></div>
      <form className="auth-form"><label>First name<input placeholder="Zuhriddin"/></label><label>Last name<input placeholder="Rajabov"/></label><label>Access code<input placeholder="••••••"/></label><button type="button" className="primary">Create student profile</button></form>
      <div className="or"><span/>or<span/></div><Link className="secondary" href="/dashboard">Open student preview</Link><Link className="text-link" href="/admin">Admin preview →</Link><small className="muted">Secure account activation will be enabled before student onboarding.</small>
    </section>
  </main>
}