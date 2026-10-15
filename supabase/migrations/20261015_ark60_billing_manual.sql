-- Manual UZCARD/HUMO billing. Telegram receipt is intentionally NOT stored in the app.
-- Existing learning access stays unchanged until an explicit, reviewed cutover.
create extension if not exists pgcrypto;

create table if not exists public.ark60_billing_cards (
 method text primary key check (method in ('uzcard','humo')),
 card_number text not null check (card_number ~ '^[0-9]{16}$'),
 card_holder text not null check (length(trim(card_holder)) between 3 and 100),
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);

create table if not exists public.ark60_billing_orders (
 id uuid primary key default gen_random_uuid(),
 order_code text not null unique,
 student_id uuid not null references public.ark60_students(id) on delete cascade,
 plan_key text not null check (plan_key in ('challenge','mock','all_access')),
 price_uzs integer not null check (price_uzs in (15000,25000,35000)),
 payment_method text not null check (payment_method in ('uzcard','humo')),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references public.ark60_admins(id) on delete set null,
 admin_note text
);
create unique index if not exists ark60_billing_one_pending_per_student
 on public.ark60_billing_orders(student_id) where status = 'pending';
create index if not exists ark60_billing_orders_student_recent
 on public.ark60_billing_orders(student_id,created_at desc);
create index if not exists ark60_billing_orders_status_recent
 on public.ark60_billing_orders(status,created_at desc);

create table if not exists public.ark60_billing_access (
 id uuid primary key default gen_random_uuid(),
 order_id uuid unique references public.ark60_billing_orders(id) on delete set null,
 student_id uuid not null references public.ark60_students(id) on delete cascade,
 plan_key text not null check (plan_key in ('challenge','mock','all_access')),
 starts_at timestamptz not null default now(),
 expires_at timestamptz,
 mock_on date,
 created_at timestamptz not null default now(),
 check ((plan_key = 'challenge' and expires_at is not null and mock_on is null)
   or (plan_key = 'mock' and expires_at is null and mock_on is not null)
   or (plan_key = 'all_access' and expires_at is not null and mock_on is not null))
);
create index if not exists ark60_billing_access_student
 on public.ark60_billing_access(student_id,starts_at desc);

create table if not exists public.ark60_billing_audit (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.ark60_billing_orders(id) on delete cascade,
 admin_id uuid references public.ark60_admins(id) on delete set null,
 decision text not null check (decision in ('approved','rejected')),
 note text,
 created_at timestamptz not null default now()
);

alter table public.ark60_billing_cards enable row level security;
alter table public.ark60_billing_orders enable row level security;
alter table public.ark60_billing_access enable row level security;
alter table public.ark60_billing_audit enable row level security;
-- Service-role access only. Requests are authenticated by application APIs.

create or replace function public.ark60_review_billing_order(
 p_order_id uuid, p_admin_id uuid, p_decision text, p_note text default ''
)
returns public.ark60_billing_orders
language plpgsql security definer
set search_path = public
as $$
declare
 v_order public.ark60_billing_orders;
 v_local date;
 v_mock date;
begin
 if p_decision not in ('approved','rejected') then
   raise exception 'Invalid payment decision';
 end if;
 if not exists(select 1 from public.ark60_admins where id=p_admin_id and role='super_admin' and status='active') then
   raise exception 'Super admin required';
 end if;
 select * into v_order from public.ark60_billing_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if v_order.status <> 'pending' then raise exception 'Order already reviewed'; end if;
 update public.ark60_billing_orders
   set status=p_decision,reviewed_at=now(),reviewed_by=p_admin_id,admin_note=left(p_note,500)
   where id=p_order_id returning * into v_order;
 if p_decision='approved' then
   v_local := (now() at time zone 'Asia/Tashkent')::date;
   v_mock := v_local + ((7 - extract(dow from v_local)::integer) % 7);
   insert into public.ark60_billing_access(order_id,student_id,plan_key,starts_at,expires_at,mock_on)
   values (v_order.id,v_order.student_id,v_order.plan_key,now(),
     case when v_order.plan_key in ('challenge','all_access') then now()+interval '7 days' else null end,
     case when v_order.plan_key in ('mock','all_access') then v_mock else null end);
 end if;
 insert into public.ark60_billing_audit(order_id,admin_id,decision,note)
   values(v_order.id,p_admin_id,p_decision,left(p_note,500));
 return v_order;
end;
$$;
revoke all on function public.ark60_review_billing_order(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ark60_review_billing_order(uuid,uuid,text,text) to service_role;
