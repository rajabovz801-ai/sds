create or replace function public.ark60_billing_revoke_grant(p_admin uuid,p_access uuid,p_reason text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare a public.ark60_billing_access;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required'; end if;
 if length(trim(p_reason))<3 then raise exception 'Reason required'; end if;
 select * into a from public.ark60_billing_access where id=p_access for update;
 if not found or a.order_id is not null or a.source_order_id is not null or a.revoked_at is not null then raise exception 'Active manual grant required'; end if;
 update public.ark60_billing_access set revoked_at=now(),revoke_reason=left(p_reason,500) where id=a.id;
 insert into public.ark60_billing_events(student_id,admin_id,action,note) values(a.student_id,p_admin,'manual_revoke',left(p_reason,500));
 return true;
end $$;
revoke all on function public.ark60_billing_revoke_grant(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.ark60_billing_revoke_grant(uuid,uuid,text) to service_role;
