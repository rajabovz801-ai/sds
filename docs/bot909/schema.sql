create table if not exists public.cb909_settings (
 id boolean primary key default true check(id), channel_id text, channel_url text,
 start_date date, active boolean not null default false
);
insert into public.cb909_settings(id) values(true) on conflict do nothing;
create table if not exists public.cb909_groups (
 chat_id bigint primary key, title text not null, label text not null default '909', active boolean not null default false
);
create table if not exists public.cb909_users (
 telegram_id bigint primary key, name text, group_id bigint references public.cb909_groups(chat_id),
 step text not null default 'name', state jsonb not null default '{}', menu_id bigint,
 updated_at timestamptz not null default now()
);
create table if not exists public.cb909_materials (
 id uuid primary key default gen_random_uuid(), group_id bigint not null references public.cb909_groups(chat_id),
 day integer not null check(day between 1 and 7), code text not null unique check(code ~ '^\d{4,8}$'),
 pdf_id text not null, answer_key jsonb not null check(jsonb_typeof(answer_key)='array' and jsonb_array_length(answer_key) between 1 and 100),
 retell_text text, retell_photo_id text, published boolean not null default false,
 unique(group_id,day)
);
create table if not exists public.cb909_submissions (
 id uuid primary key default gen_random_uuid(), student_id bigint not null references public.cb909_users(telegram_id),
 material_id uuid not null references public.cb909_materials(id), kind text not null check(kind in ('test','retell')),
 payload jsonb not null, score integer, total integer, submitted_at timestamptz not null default now(),
 unique(student_id,material_id,kind)
);
create table if not exists public.cb909_updates (
 update_id bigint primary key, actor_id bigint not null, status text not null default 'processing', claimed_at timestamptz not null default now()
);
create table if not exists public.cb909_outbox (
 id uuid primary key default gen_random_uuid(), dedupe text not null unique, chat_id bigint not null,
 method text not null, payload jsonb not null, status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 message_id bigint, created_at timestamptz not null default now(), sent_at timestamptz
);
alter table public.cb909_settings enable row level security;
alter table public.cb909_groups enable row level security;
alter table public.cb909_users enable row level security;
alter table public.cb909_materials enable row level security;
alter table public.cb909_submissions enable row level security;
alter table public.cb909_updates enable row level security;
alter table public.cb909_outbox enable row level security;
revoke all on public.cb909_settings,public.cb909_groups,public.cb909_users,public.cb909_materials,public.cb909_submissions,public.cb909_updates,public.cb909_outbox from anon,authenticated;
grant all on public.cb909_settings,public.cb909_groups,public.cb909_users,public.cb909_materials,public.cb909_submissions,public.cb909_updates,public.cb909_outbox to service_role;

create or replace function public.cb909_claim(p_update bigint,p_actor bigint) returns text language plpgsql security invoker set search_path=public as $$
declare r cb909_updates;
begin
 perform pg_advisory_xact_lock(p_actor);
 select * into r from cb909_updates where update_id=p_update;
 if r.status='done' then return 'done'; end if;
 if exists(select 1 from cb909_updates where actor_id=p_actor and status='processing' and claimed_at>now()-interval '90 seconds') then return 'busy';end if;
 insert into cb909_updates(update_id,actor_id) values(p_update,p_actor) on conflict(update_id) do update set status='processing',claimed_at=now();
 return 'claimed';
end $$;
create or replace function public.cb909_submit(p_student bigint,p_material uuid,p_kind text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare m cb909_materials;u cb909_users;s cb909_settings;r cb909_submissions;d integer;n integer;v integer;
begin
 select * into s from cb909_settings where id=true;
 d=((now() at time zone 'Asia/Tashkent')::date-s.start_date)+1;
 if s.active is distinct from true or d is null or d not between 1 and 7 or (now() at time zone 'Asia/Tashkent')::time >= time '21:00' then raise exception 'DEADLINE_CLOSED';end if;
 select * into m from cb909_materials where id=p_material and published=true and day=d;
 select * into u from cb909_users where telegram_id=p_student;
 if m.id is null or u.group_id is distinct from m.group_id then raise exception 'INVALID_MATERIAL';end if;
 if p_kind='test' then
 n=jsonb_array_length(m.answer_key);
 if jsonb_typeof(p_payload->'answers') is distinct from 'array' then raise exception 'INVALID_ANSWERS';end if;
 if jsonb_array_length(p_payload->'answers')<>n or exists(select 1 from jsonb_array_elements_text(p_payload->'answers') a where a !~ '^[ABCD]$' or a is null) then raise exception 'INVALID_ANSWERS';end if;
 select count(*) into v from generate_series(0,n-1) i where p_payload->'answers'->>i=m.answer_key->>i;
 elsif p_kind='retell' then
 if coalesce(p_payload->>'file_id','')='' or coalesce(p_payload->>'kind','') not in ('voice','audio','video','video_note','document') then raise exception 'INVALID_MEDIA';end if;
 else raise exception 'INVALID_KIND';end if;
 insert into cb909_submissions(student_id,material_id,kind,payload,score,total) values(p_student,p_material,p_kind,p_payload,v,n) on conflict(student_id,material_id,kind) do nothing returning * into r;
 if r.id is null then select * into r from cb909_submissions where student_id=p_student and material_id=p_material and kind=p_kind;end if;
 return to_jsonb(r);
end $$;
revoke all on function public.cb909_claim(bigint,bigint),public.cb909_submit(bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.cb909_claim(bigint,bigint),public.cb909_submit(bigint,uuid,text,jsonb) to service_role;
