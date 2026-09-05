# Production reliability audit — 2026-09-05

## Verified before changes

- Current production deployment was READY.
- Production runtime traffic reviewed during the audit returned successful responses; no new error/warning logs were present in the latest 24-hour window.
- Historical speaking and homework-report errors were older than the current production deployment, so no risky integration rewrite was applied without fresh evidence.

## Safe fixes staged

1. Harden global response headers without changing page structure or exam behavior:
   - `X-Frame-Options: SAMEORIGIN`
   - `X-Permitted-Cross-Domain-Policies: none`
   - `Strict-Transport-Security: max-age=31536000`
2. Prevent internal student-login exception details from being returned to clients. Full errors remain in server logs.

## Deliberately not changed

- Speaking delivery architecture and cross-project forwarding: current production has no fresh failure evidence. Rewriting it now would carry more regression risk than benefit.
- Global CSP: not enabled because the current admin/runtime uses inline and framework-managed scripts/styles; a strict CSP requires a dedicated compatibility pass.
- Dependency versions: no lockfile is committed. Versions were not changed during this safety-focused pass because doing so could alter the runtime dependency graph.

## Verification

- Vercel preview build completed successfully.
- Next.js production compilation and TypeScript checks passed.
- 44/44 static pages generated successfully on the preview build.
- Preview root returned HTTP 200 and the new security headers were present.
