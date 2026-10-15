-- Service-only membership policy shared by Python and Next.js.
create table if not exists public.ark60_billing_settings (
 id boolean primary key default true check(id),
 enforcement_enabled boolean not null default true,
 launch_at timestamptz not null default '2026-10-19T00:00:00+05:00'
);
insert into public.ark60_billing_settings(id) values(true) on conflict do nothing;
alter table public.ark60_billing_settings enable row level security;
revoke all on public.ark60_billing_settings from anon,authenticated;
grant all on public.ark60_billing_settings to service_role;
alter table public.ark60_billing_access add column if not exists source_order_id uuid references public.ark60_billing_orders(id);
alter table public.ark60_billing_access add column if not exists revoked_at timestamptz;
alter table public.ark60_billing_access add column if not exists revoke_reason text;
alter table public.ark60_billing_orders add column if not exists mock_on date;
alter table public.ark60_billing_orders add column if not exists transaction_ref text;
alter table public.ark60_billing_orders drop constraint if exists ark60_billing_orders_status_check;
alter table public.ark60_billing_orders add constraint ark60_billing_orders_status_check check(status in ('pending','approved','rejected','cancelled','revoked'));
create unique index if not exists ark60_billing_unique_bank_ref on public.ark60_billing_orders(lower(trim(transaction_ref))) where transaction_ref is not null and trim(transaction_ref)<>'';
create table if not exists public.ark60_billing_events (
 id bigint generated always as identity primary key, student_id uuid not null references public.ark60_students(id),
 admin_id uuid references public.ark60_admins(id), order_id uuid references public.ark60_billing_orders(id),
 action text not null, note text, created_at timestamptz not null default now()
);
alter table public.ark60_billing_events enable row level security;
revoke all on public.ark60_billing_events from anon,authenticated;
grant all on public.ark60_billing_events to service_role;
grant usage,select on sequence public.ark60_billing_events_id_seq to service_role;

create or replace function public.ark60_billing_snapshot(p_student uuid,p_at timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s public.ark60_billing_settings; u public.ark60_students; v_until timestamptz; v_dates jsonb; v_scheduled timestamptz; v_trial boolean; v_done int; v_summary record;
begin
 select * into s from public.ark60_billing_settings where id=true;
 select * into u from public.ark60_students where id=p_student;
 if not found then raise exception 'Student not found'; end if;
 select max(expires_at) into v_until from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=p_at and expires_at>p_at;
 select coalesce(jsonb_agg(distinct mock_on),'[]'::jsonb) into v_dates from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=p_at and mock_on>=(p_at at time zone 'Asia/Tashkent')::date;
 select min(starts_at) into v_scheduled from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at>p_at;
 v_trial:=u.created_at>=s.launch_at;
 select * into v_summary from public.ark60_student_dashboard_summary(p_student,(p_at at time zone 'Asia/Tashkent')::date);
 select count(*)::int into v_done from generate_series(1,2) d where jsonb_array_length(coalesce(v_summary.required_by_day->d::text,'[]'::jsonb))>0 and not exists(
   select 1 from jsonb_array_elements_text(v_summary.required_by_day->d::text) required(module) where not exists(
     select 1 from jsonb_array_elements(coalesce(v_summary.completed,'[]'::jsonb)) c where (c->>'day_number')::int=d and c->>'module'=required.module));
 return jsonb_build_object('enforced',s.enforcement_enabled and p_at>=s.launch_at,'launch_at',s.launch_at,'trial_eligible',v_trial,'trial_completed',v_done,'challenge_until',v_until,'mock_dates',v_dates,'scheduled_start',v_scheduled,
 'pending',exists(select 1 from public.ark60_billing_orders where student_id=p_student and status='pending'),
 'had_paid',exists(select 1 from public.ark60_billing_access where student_id=p_student));
end $$;

create or replace function public.ark60_billing_can_study(p_student uuid,p_day int,p_module text default '',p_resume boolean default false,p_at timestamptz default now()) returns boolean
language plpgsql security invoker set search_path=public as $$
declare m jsonb; d date; v_username text; v_start timestamptz;
begin
 if p_day<1 or p_day>60 then return false; end if;
 select username into v_username from public.ark60_students where id=p_student and status='active';
 if not found then return false; end if;
 if lower(v_username)='rustam7' then return true; end if;
 d:='2026-10-01'::date+(p_day-1);
 if d>(p_at at time zone 'Asia/Tashkent')::date then return false; end if;
 m:=public.ark60_billing_snapshot(p_student,p_at);
 if not (m->>'enforced')::boolean then return true; end if;
 if extract(dow from d)=0 then
   if (m->'mock_dates') ? d::text then return true; end if;
 else
   if nullif(m->>'challenge_until','')::timestamptz>p_at or ((m->>'trial_eligible')::boolean and p_day in(1,2)) then return true; end if;
 end if;
 -- Only an already persisted, bounded attempt may finish after natural expiry.
 -- A revoked membership never qualifies for this grace period.
 if not p_resume then return false; end if;
 if p_module='reading' then
   select max(r.started_at) into v_start from public.ark60_reading_starts r join public.ark60_reading_passages p on p.id=r.passage_id where r.student_id=p_student and p.day_number=p_day and r.started_at>p_at-interval '90 minutes';
 elsif p_module='listening' then
   select max(started_at) into v_start from public.ark60_listening_attempts where student_id=p_student and day_number=p_day and status='in_progress' and started_at>p_at-interval '90 minutes';
 elsif p_module='speaking' then
   select max(created_at) into v_start from public.ark60_speaking_attempts where student_id=p_student and day_number=p_day and status='in_progress' and created_at>p_at-interval '60 minutes';
 elsif p_module='mock' then
   select max(started_at) into v_start from public.ark60_mock_attempts where student_id=p_student and day_number=p_day and stage in('listening','reading','writing') and started_at>p_at-interval '4 hours';
 elsif p_module='writing' then
   select min(entered_at) into v_start from public.ark60_writing_visits where student_id=p_student and day_number=p_day and entered_at>p_at-interval '90 minutes';
 end if;
 if v_start is null then return false; end if;
 return exists(select 1 from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=v_start and
   ((extract(dow from d)<>0 and expires_at>v_start) or (extract(dow from d)=0 and mock_on=d)));
end $$;

-- Replace the old immediate-activation review. Student lock serializes renewals.
create or replace function public.ark60_review_billing_order(p_order_id uuid,p_admin_id uuid,p_decision text,p_note text default '') returns public.ark60_billing_orders
language plpgsql security invoker set search_path=public as $$
declare o public.ark60_billing_orders; v_start timestamptz; v_launch timestamptz; v_mock date; v_local date;
begin
 if p_decision not in('approved','rejected') then raise exception 'Invalid decision'; end if;
 if not exists(select 1 from public.ark60_admins where id=p_admin_id and role='super_admin' and status='active') then raise exception 'Super admin required'; end if;
 select * into o from public.ark60_billing_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status<>'pending' then raise exception 'Order already reviewed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.student_id::text,0));
 select launch_at into v_launch from public.ark60_billing_settings where id=true;
 v_start:=greatest(now(),v_launch);
 if p_decision='approved' then
   if o.plan_key in('challenge','all_access') then
     select greatest(v_start,coalesce(max(expires_at),v_start)) into v_start from public.ark60_billing_access where student_id=o.student_id and revoked_at is null and expires_at>v_start;
   end if;
   v_local:=(greatest(now(),v_launch) at time zone 'Asia/Tashkent')::date;
   v_mock:=coalesce(o.mock_on,v_local+((7-extract(dow from v_local)::int)%7));
   if o.plan_key in('mock','all_access') and (extract(dow from v_mock)<>0 or v_mock<v_local or v_mock>'2026-11-29'::date) then raise exception 'Invalid mock date'; end if;
   if o.plan_key in('mock','all_access') and exists(select 1 from public.ark60_billing_access where student_id=o.student_id and revoked_at is null and mock_on=v_mock) then raise exception 'Mock ticket already exists'; end if;
   -- MOCK ticket can start immediately while renewed Challenge time is stacked.
   if o.plan_key='all_access' and v_start>greatest(now(),v_launch) then
     insert into public.ark60_billing_access(source_order_id,student_id,plan_key,starts_at,mock_on) values(o.id,o.student_id,'mock',greatest(now(),v_launch),v_mock);
     insert into public.ark60_billing_access(order_id,student_id,plan_key,starts_at,expires_at) values(o.id,o.student_id,'challenge',v_start,v_start+interval '7 days');
   else
     insert into public.ark60_billing_access(order_id,student_id,plan_key,starts_at,expires_at,mock_on) values(o.id,o.student_id,o.plan_key,v_start,
       case when o.plan_key in('challenge','all_access') then v_start+interval '7 days' end,
       case when o.plan_key in('mock','all_access') then v_mock end);
   end if;
 end if;
 update public.ark60_billing_orders set status=p_decision,reviewed_at=now(),reviewed_by=p_admin_id,admin_note=left(p_note,500),mock_on=case when o.plan_key in('mock','all_access') then v_mock end where id=o.id returning * into o;
 insert into public.ark60_billing_audit(order_id,admin_id,decision,note) values(o.id,p_admin_id,p_decision,left(p_note,500));
 insert into public.ark60_billing_events(student_id,admin_id,order_id,action,note) values(o.student_id,p_admin_id,o.id,p_decision,left(p_note,500));
 return o;
end $$;
revoke all on function public.ark60_billing_snapshot(uuid,timestamptz),public.ark60_billing_can_study(uuid,int,text,boolean,timestamptz),public.ark60_review_billing_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ark60_billing_snapshot(uuid,timestamptz),public.ark60_billing_can_study(uuid,int,text,boolean,timestamptz),public.ark60_review_billing_order(uuid,uuid,text,text) to service_role;

create or replace function public.ark60_billing_cancel(p_student uuid,p_order uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
declare o public.ark60_billing_orders;
begin
 select * into o from public.ark60_billing_orders where id=p_order and student_id=p_student for update;
 if not found or o.status<>'pending' then raise exception 'Order cannot be cancelled'; end if;
 update public.ark60_billing_orders set status='cancelled',reviewed_at=now(),admin_note='O‘quvchi bekor qildi' where id=o.id;
 insert into public.ark60_billing_events(student_id,order_id,action) values(p_student,o.id,'cancelled');
 return true;
end $$;
create or replace function public.ark60_billing_revoke(p_admin uuid,p_order uuid,p_reason text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare o public.ark60_billing_orders;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required'; end if;
 if length(trim(p_reason))<3 then raise exception 'Reason required'; end if;
 select * into o from public.ark60_billing_orders where id=p_order for update;
 if not found or o.status<>'approved' then raise exception 'Approved order required'; end if;
 update public.ark60_billing_access set revoked_at=now(),revoke_reason=left(p_reason,500) where (order_id=o.id or source_order_id=o.id) and revoked_at is null;
 update public.ark60_billing_orders set status='revoked',admin_note=left(p_reason,500) where id=o.id;
 insert into public.ark60_billing_events(student_id,admin_id,order_id,action,note) values(o.student_id,p_admin,o.id,'revoked',left(p_reason,500));
 return true;
end $$;
create or replace function public.ark60_billing_grant(p_admin uuid,p_student uuid,p_plan text,p_start timestamptz,p_days int,p_mock date,p_note text) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required'; end if;
 if length(trim(p_note))<3 or p_plan not in('challenge','mock','all_access') or p_days not between 1 and 60 or p_start is null then raise exception 'Invalid grant'; end if;
 if p_plan in('mock','all_access') and (p_mock is null or extract(dow from p_mock)<>0 or p_mock<(now() at time zone 'Asia/Tashkent')::date or p_mock>'2026-11-29'::date) then raise exception 'Invalid mock date'; end if;
 insert into public.ark60_billing_access(student_id,plan_key,starts_at,expires_at,mock_on) values(p_student,p_plan,p_start,
   case when p_plan in('challenge','all_access') then p_start+make_interval(days=>p_days) end,
   case when p_plan in('mock','all_access') then p_mock end);
 insert into public.ark60_billing_events(student_id,admin_id,action,note) values(p_student,p_admin,'manual_grant',left(p_note,500));
 return true;
end $$;
create or replace function public.ark60_billing_totals() returns jsonb
language sql security invoker set search_path=public as $$
 select jsonb_build_object('pending',count(*) filter(where status='pending'),'approved',count(*) filter(where status='approved'),'rejected',count(*) filter(where status='rejected'),'cancelled',count(*) filter(where status='cancelled'),'revoked',count(*) filter(where status='revoked'),
 'approved_uzs',coalesce(sum(price_uzs) filter(where status='approved'),0),
 'pending_uzs',coalesce(sum(price_uzs) filter(where status='pending'),0),
 'active_students',(select count(distinct student_id) from public.ark60_billing_access where revoked_at is null and starts_at<=now() and (expires_at>now() or mock_on>=(now() at time zone 'Asia/Tashkent')::date))) from public.ark60_billing_orders;
$$;
revoke all on function public.ark60_billing_cancel(uuid,uuid),public.ark60_billing_revoke(uuid,uuid,text),public.ark60_billing_grant(uuid,uuid,text,timestamptz,int,date,text),public.ark60_billing_totals() from public,anon,authenticated;
grant execute on function public.ark60_billing_cancel(uuid,uuid),public.ark60_billing_revoke(uuid,uuid,text),public.ark60_billing_grant(uuid,uuid,text,timestamptz,int,date,text),public.ark60_billing_totals() to service_role;

create or replace function public.ark60_billing_review_v2(p_order uuid,p_admin uuid,p_decision text,p_note text,p_mock date default null,p_bank_ref text default null) returns public.ark60_billing_orders
language plpgsql security invoker set search_path=public as $$
declare o public.ark60_billing_orders;
begin
 if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active') then raise exception 'Super admin required'; end if;
 select * into o from public.ark60_billing_orders where id=p_order for update;
 if not found or o.status<>'pending' then raise exception 'Order already reviewed'; end if;
 update public.ark60_billing_orders set mock_on=coalesce(p_mock,mock_on),transaction_ref=nullif(trim(left(p_bank_ref,100)),'') where id=p_order;
 return public.ark60_review_billing_order(p_order,p_admin,p_decision,p_note);
end $$;
revoke all on function public.ark60_billing_review_v2(uuid,uuid,text,text,date,text) from public,anon,authenticated;
grant execute on function public.ark60_billing_review_v2(uuid,uuid,text,text,date,text) to service_role;
