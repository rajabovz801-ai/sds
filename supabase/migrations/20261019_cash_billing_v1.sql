-- Verified cash collections for the existing billing system.
-- No student grants are created by this migration.
alter table public.ark60_billing_orders
  drop constraint if exists ark60_billing_orders_payment_method_check;
alter table public.ark60_billing_orders
  add constraint ark60_billing_orders_payment_method_check
  check (payment_method in ('uzcard','humo','cash'));
alter table public.ark60_billing_orders
  add column if not exists cash_request_id uuid;
create unique index if not exists ark60_billing_cash_request_uq
  on public.ark60_billing_orders (cash_request_id)
  where cash_request_id is not null;

create or replace function public.ark60_billing_record_cash(
  p_admin uuid, p_student uuid, p_plan text, p_request_id uuid,
  p_mock date default null, p_note text default ''
)
returns table (order_id uuid, order_code text, plan_key text, price_uzs integer,
  starts_at timestamptz, expires_at timestamptz, mock_on date)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_order public.ark60_billing_orders;
  v_start timestamptz;
  v_launch timestamptz;
  v_mock date;
  v_today date;
  v_price integer;
begin
  if not exists(select 1 from public.ark60_admins where id=p_admin and role='super_admin' and status='active')
    then raise exception 'Super admin required'; end if;
  if not exists(select 1 from public.ark60_students where id=p_student and status='active')
    then raise exception 'Active student required'; end if;
  if p_plan not in ('challenge','mock') or p_request_id is null
     or length(btrim(coalesce(p_note,''))) < 3 or length(p_note)>500
    then raise exception 'Invalid cash receipt data'; end if;
  -- Serialize all paid grants per student; a second tap with the same request ID
  -- returns the existing receipt instead of charging twice.
  perform pg_advisory_xact_lock(hashtextextended(p_student::text, 0));
  select * into v_order from public.ark60_billing_orders where cash_request_id=p_request_id;
  if found then
    if v_order.student_id<>p_student or v_order.plan_key<>p_plan or v_order.payment_method<>'cash'
      then raise exception 'Receipt ID belongs to another payment'; end if;
    return query select o.id,o.order_code,o.plan_key,o.price_uzs,a.starts_at,a.expires_at,a.mock_on
      from public.ark60_billing_orders o join public.ark60_billing_access a on a.order_id=o.id
      where o.id=v_order.id;
    return;
  end if;
  -- Do not silently convert or lose an existing UZCARD/HUMO payment claim.
  if exists(select 1 from public.ark60_billing_orders
            where student_id=p_student and status='pending'
              and plan_key in (p_plan,'all_access'))
    then raise exception 'Pending payment exists; review or cancel it before recording cash'; end if;
  select launch_at into v_launch from public.ark60_billing_settings where id=true;
  v_start:=greatest(now(),coalesce(v_launch,now()));
  v_today:=(now() at time zone 'Asia/Tashkent')::date;
  v_price:=case when p_plan='challenge' then 15000 else 25000 end;
  if p_plan='challenge' then
    if p_mock is not null then raise exception 'Mock is billed separately'; end if;
    -- A renewal starts at the end of an existing subscription, not concurrently.
    select greatest(v_start,coalesce(max(expires_at),v_start)) into v_start
      from public.ark60_billing_access
      where student_id=p_student and revoked_at is null and expires_at>v_start;
  else
    v_mock:=p_mock;
    if v_mock is null or extract(dow from v_mock)<>0
       or v_mock<v_today or v_mock>'2026-11-29'::date
      then raise exception 'Select a valid Sunday MOCK date'; end if;
    if exists(select 1 from public.ark60_billing_access
              where student_id=p_student and revoked_at is null and mock_on=v_mock)
      then raise exception 'MOCK payment already exists for this Sunday'; end if;
  end if;
  insert into public.ark60_billing_orders
    (order_code,student_id,plan_key,price_uzs,payment_method,status,created_at,
     reviewed_at,reviewed_by,admin_note,mock_on,cash_request_id)
  values
    ('CASH-'||to_char(now() at time zone 'Asia/Tashkent','YYYYMMDD')||'-'||
      upper(left(replace(gen_random_uuid()::text,'-',''),12)),
      p_student,p_plan,v_price,'cash','approved',now(),now(),p_admin,
      left(btrim(p_note),500),v_mock,p_request_id)
  returning * into v_order;
  insert into public.ark60_billing_access
    (order_id,student_id,plan_key,starts_at,expires_at,mock_on)
  values (v_order.id,p_student,p_plan,v_start,
    case when p_plan='challenge' then v_start+interval '7 days' end,v_mock);
  insert into public.ark60_billing_audit(order_id,admin_id,decision,note)
    values(v_order.id,p_admin,'approved',left('Cash: '||p_note,500));
  insert into public.ark60_billing_events(student_id,admin_id,order_id,action,note)
    values(p_student,p_admin,v_order.id,'cash_approved',left(p_note,500));
  return query select o.id,o.order_code,o.plan_key,o.price_uzs,a.starts_at,a.expires_at,a.mock_on
    from public.ark60_billing_orders o join public.ark60_billing_access a on a.order_id=o.id
    where o.id=v_order.id;
end
$function$;

revoke all on function public.ark60_billing_record_cash(uuid,uuid,text,uuid,date,text)
  from public,anon,authenticated;
grant execute on function public.ark60_billing_record_cash(uuid,uuid,text,uuid,date,text)
  to service_role;

create or replace function public.ark60_billing_totals()
returns jsonb language sql set search_path to 'public' as $function$
 select jsonb_build_object(
   'pending',count(*) filter(where status='pending'),
   'approved',count(*) filter(where status='approved'),
   'rejected',count(*) filter(where status='rejected'),
   'cancelled',count(*) filter(where status='cancelled'),
   'revoked',count(*) filter(where status='revoked'),
   'approved_uzs',coalesce(sum(price_uzs) filter(where status='approved'),0),
   'cash_uzs',coalesce(sum(price_uzs) filter(where status='approved' and payment_method='cash'),0),
   'bank_uzs',coalesce(sum(price_uzs) filter(where status='approved' and payment_method in ('uzcard','humo')),0),
   'cash_count',count(*) filter(where status='approved' and payment_method='cash'),
   'pending_uzs',coalesce(sum(price_uzs) filter(where status='pending'),0),
   'active_students',(
     select count(distinct student_id) from public.ark60_billing_access
     where revoked_at is null and starts_at<=now()
       and (expires_at>now() or mock_on>=(now() at time zone 'Asia/Tashkent')::date)
   )
 ) from public.ark60_billing_orders;
$function$;
