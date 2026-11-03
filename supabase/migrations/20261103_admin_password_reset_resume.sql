-- Preserve the last lesson across logins and devices, independently from online presence.
ALTER TABLE public.ark60_presence
 ADD COLUMN IF NOT EXISTS resume_area text,
 ADD COLUMN IF NOT EXISTS resume_day integer,
 ADD COLUMN IF NOT EXISTS resume_at timestamptz;

-- Audit only who initiated the reset, never the temporary password or its hash.
CREATE TABLE IF NOT EXISTS public.ark60_password_reset_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.ark60_students(id),
 admin_id uuid NOT NULL REFERENCES public.ark60_admins(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ark60_password_reset_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ark60_password_reset_events FROM anon, authenticated;
