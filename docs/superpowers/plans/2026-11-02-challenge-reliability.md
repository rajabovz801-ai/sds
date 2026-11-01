# Challenge Reliability Implementation Plan

Goal: apply the approved audit fixes and correct study time without changing Writing assessment or expired Speaking records.
Architecture: small existing-component changes; server-authoritative atomic heartbeat RPC and publication-aware dashboard RPC.
Tech Stack: Next.js, React, Python, Postgres.
Spec: docs/superpowers/specs/2026-11-02-challenge-reliability-design.md

## Global constraints
Preserve stored results, coins, subscription gates, mock entry codes and audio retention. Missing teaching materials remain unpublished. No changes to Writing assessment.

## Review focus
- Concurrent tabs must not multiply time.
- Hidden time and resume gaps must not count.
- Audio playback and sustained reading must count.
- Private mock materials must retain code access.
- Network errors must preserve attempts and allow retry.

## Tasks
- [x] 1. Write/run regression tests for valid dates, selected mock URLs, empty Reading, bounded Listening retry and study activity. Confirm failures.
- [x] 2. Implement targeted UI/API fixes and atomic heartbeat RPC; verify regressions.
- [x] 3. Replace planned daily requirements with published materials while preserving uploaded personal-code mocks; transaction-test RPCs.
- [ ] 4. Review diff, build deployment, verify live empty states and audio; confirm no Writing assessment or Speaking cleanup changes.
