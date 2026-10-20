# PRO profiles — 20 October 2026

Scope: paid Challenge membership badge, personal profile photos, profile spacing. No shop changes.

- Existing active, non-revoked Challenge / legacy All Access grants receive PRO automatically. Mock-only tickets and trials do not.
- The API decides membership; clients cannot grant it. Profile, sidebar, podium, table and current-rank row share the same identity.
- Photos are cropped with zoom and horizontal/vertical positioning before saving. Server validates actual image bytes, limits decoded pixels, strips metadata and writes a 512px WebP.
- Storage uses server-only writes to `ark60-profile-photos`; rendered avatars are publicly readable like existing profile pictures. Filenames are random and scoped to the authenticated student.
- Expiry hides the uploaded photo without deleting it. Renewal restores it. Applying a reward avatar switches back to the reward collection; uploading activates the personal photo again. Remove deletes the current reference and storage object.
- Additive migration: `20261020080533_pro_profile_photos.sql`. Existing reward fields and billing grants are preserved.

Verification: TypeScript and production build passed; 261 Node tests and 4 Python membership/visibility tests passed. Upload route tests cover auth, non-PRO, origin, invalid bytes, and real Sharp conversion. Database columns and bucket checked after migration. Browser rendering could not be exercised locally: the browser download failed in this environment. An actual signed-in photo upload remains a manual production check.

Rollback: redeploy commit `ebc8b25afdb771f5c65c2e60a5396eea9182f33c`; leave additive columns/bucket in place to preserve uploaded images. No billing reset needed.
