create or replace function public.ark60_mock_code_revoke(p_admin uuid,p_code uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare target public.ark60_mock_entry_codes;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required' using errcode='42501';end if;
 select * into target from public.ark60_mock_entry_codes where id=p_code;
 if target.id is null then raise exception 'Code not found' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(target.student_id::text||':'||target.day_number::text,7718));
 -- Revoke this student's current access even if an admin tab still holds a rotated code ID.
 update public.ark60_mock_entry_codes set revoked_at=now(),revoked_by=p_admin where student_id=target.student_id and day_number=target.day_number and revoked_at is null;
end $$;
