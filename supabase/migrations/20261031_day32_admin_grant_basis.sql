-- Day 32 codes may be granted independent of billing; earlier paid-code records are unchanged.
BEGIN;
ALTER TABLE public.ark60_mock_entry_codes ADD COLUMN IF NOT EXISTS grant_basis text NOT NULL DEFAULT 'payment';
ALTER TABLE public.ark60_mock_entry_codes DROP CONSTRAINT IF EXISTS ark60_mock_entry_codes_grant_basis_check;
ALTER TABLE public.ark60_mock_entry_codes ADD CONSTRAINT ark60_mock_entry_codes_grant_basis_check CHECK (grant_basis IN ('payment','admin'));
-- Legacy paid_confirmed_at remains non-null for compatibility; grant_basis disambiguates admin-only Day 32 codes.
CREATE OR REPLACE FUNCTION public.ark60_mock_code_issue(p_admin uuid,p_student uuid,p_day integer,p_hash text,p_hint text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare code_id uuid;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required' using errcode='42501';end if;
 if p_day NOT IN (18,25,32) or p_hash !~ '^[0-9a-f]{64}$' or length(p_hint)<>4 or not exists(select 1 from public.ark60_students where id=p_student and status='active') then raise exception 'Invalid code details' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||':'||p_day::text,7718));
 update public.ark60_mock_entry_codes set revoked_at=now(),revoked_by=p_admin where student_id=p_student and day_number=p_day and revoked_at is null;
 insert into public.ark60_mock_entry_codes(student_id,day_number,code_hash,code_hint,issued_by,grant_basis) values(p_student,p_day,p_hash,p_hint,p_admin,case when p_day=32 then 'admin' else 'payment' end) returning id into code_id;
 insert into public.ark60_mock_code_limits(student_id,day_number) values(p_student,p_day) on conflict(student_id,day_number) do update set failed_count=0,locked_until=null,window_started_at=now();
 return jsonb_build_object('id',code_id);
end $$;
COMMIT;
