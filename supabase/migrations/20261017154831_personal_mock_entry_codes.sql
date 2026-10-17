create table public.ark60_mock_entry_codes (
 id uuid primary key default gen_random_uuid(),
 day_number integer not null check(day_number=18),
 student_id uuid not null references public.ark60_students(id),
 code_hash text not null check(code_hash ~ '^[0-9a-f]{64}$'),
 code_hint text not null check(length(code_hint)=4),
 paid_confirmed_at timestamptz not null default now(),
 issued_by uuid not null references public.ark60_admins(id),
 issued_at timestamptz not null default now(),
 redeemed_at timestamptz,
 revoked_at timestamptz,
 revoked_by uuid references public.ark60_admins(id)
);
create unique index ark60_mock_entry_codes_one_active on public.ark60_mock_entry_codes(student_id,day_number) where revoked_at is null;
create index ark60_mock_entry_codes_day on public.ark60_mock_entry_codes(day_number,issued_at desc);
create table public.ark60_mock_code_limits (
 student_id uuid not null references public.ark60_students(id),
 day_number integer not null check(day_number=18),
 failed_count integer not null default 0,
 window_started_at timestamptz not null default now(),
 locked_until timestamptz,
 primary key(student_id,day_number)
);
alter table public.ark60_mock_entry_codes enable row level security;
alter table public.ark60_mock_code_limits enable row level security;
revoke all on public.ark60_mock_entry_codes,public.ark60_mock_code_limits from public,anon,authenticated;
grant all on public.ark60_mock_entry_codes,public.ark60_mock_code_limits to service_role;

create function public.ark60_mock_code_issue(p_admin uuid,p_student uuid,p_day integer,p_hash text,p_hint text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare code_id uuid;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required' using errcode='42501';end if;
 if p_day<>18 or p_hash !~ '^[0-9a-f]{64}$' or length(p_hint)<>4 or not exists(select 1 from public.ark60_students where id=p_student and status='active') then raise exception 'Invalid code details' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||':'||p_day::text,7718));
 update public.ark60_mock_entry_codes set revoked_at=now(),revoked_by=p_admin where student_id=p_student and day_number=p_day and revoked_at is null;
 insert into public.ark60_mock_entry_codes(student_id,day_number,code_hash,code_hint,issued_by) values(p_student,p_day,p_hash,p_hint,p_admin) returning id into code_id;
 insert into public.ark60_mock_code_limits(student_id,day_number) values(p_student,p_day) on conflict(student_id,day_number) do update set failed_count=0,locked_until=null,window_started_at=now();
 return jsonb_build_object('id',code_id);
end $$;

create function public.ark60_mock_code_redeem(p_student uuid,p_day integer,p_hash text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare limits public.ark60_mock_code_limits; target public.ark60_mock_entry_codes; failures integer;
begin
 if p_day<>18 or not exists(select 1 from public.ark60_students where id=p_student and status='active') then return jsonb_build_object('status','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||':'||p_day::text,7718));
 insert into public.ark60_mock_code_limits(student_id,day_number) values(p_student,p_day) on conflict do nothing;
 select * into limits from public.ark60_mock_code_limits where student_id=p_student and day_number=p_day for update;
 if limits.locked_until>now() then return jsonb_build_object('status','locked','retry_at',limits.locked_until);end if;
 if limits.window_started_at<=now()-interval '15 minutes' or limits.locked_until is not null then
  update public.ark60_mock_code_limits set failed_count=0,locked_until=null,window_started_at=now() where student_id=p_student and day_number=p_day;
  limits.failed_count:=0;
 end if;
 select * into target from public.ark60_mock_entry_codes where student_id=p_student and day_number=p_day and revoked_at is null for update;
 if target.id is not null and target.code_hash=p_hash then
  update public.ark60_mock_entry_codes set redeemed_at=coalesce(redeemed_at,now()) where id=target.id;
  update public.ark60_mock_code_limits set failed_count=0,locked_until=null,window_started_at=now() where student_id=p_student and day_number=p_day;
  return jsonb_build_object('status','ok');
 end if;
 failures:=limits.failed_count+1;
 update public.ark60_mock_code_limits set failed_count=failures,locked_until=case when failures>=5 then now()+interval '15 minutes' else null end where student_id=p_student and day_number=p_day returning * into limits;
 return jsonb_build_object('status',case when failures>=5 then 'locked' else 'invalid' end,'retry_at',limits.locked_until);
end $$;

create function public.ark60_mock_code_revoke(p_admin uuid,p_code uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare target public.ark60_mock_entry_codes;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required' using errcode='42501';end if;
 select * into target from public.ark60_mock_entry_codes where id=p_code;
 if target.id is null then raise exception 'Code not found' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(target.student_id::text||':'||target.day_number::text,7718));
 update public.ark60_mock_entry_codes set revoked_at=coalesce(revoked_at,now()),revoked_by=coalesce(revoked_by,p_admin) where id=p_code;
end $$;
revoke all on function public.ark60_mock_code_issue(uuid,uuid,integer,text,text),public.ark60_mock_code_redeem(uuid,integer,text),public.ark60_mock_code_revoke(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ark60_mock_code_issue(uuid,uuid,integer,text,text),public.ark60_mock_code_redeem(uuid,integer,text),public.ark60_mock_code_revoke(uuid,uuid) to service_role;
