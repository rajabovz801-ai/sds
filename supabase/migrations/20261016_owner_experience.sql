-- Isolated owner-only sandbox. Never writes production coins, attempts or entitlements.
create table if not exists public.ark60_experience_catalog (
 id text primary key, category text not null check(category in ('theme','avatar','frame','cover','title','companion')), price integer not null check(price>0)
);
insert into public.ark60_experience_catalog(id,category,price) values
 ('forest','theme',150),('library','theme',180),('aurora','theme',200),
 ('fox','avatar',80),('owl-avatar','avatar',80),('silver','frame',50),('gold','frame',90),('emerald','frame',70),
 ('forest-cover','cover',90),('library-cover','cover',100),('explorer','title',60),('night-scholar','title',70),('owl','companion',120),('fox-buddy','companion',120)
 on conflict(id) do nothing;
create table if not exists public.ark60_experience_state (
 student_id uuid primary key references public.ark60_students(id) on delete cascade,
 wallet integer not null default 1200 check(wallet>=0),
 owned jsonb not null default '[]', equipped jsonb not null default '{}',
 reduced_motion boolean not null default false, done jsonb not null default '[]', reviews jsonb not null default '{}',
 quest integer not null default 0 check(quest between 0 and 6), quest_claimed boolean not null default false,
 history jsonb not null default '[]', updated_at timestamptz not null default now()
);
alter table public.ark60_experience_catalog enable row level security;
alter table public.ark60_experience_state enable row level security;
revoke all on public.ark60_experience_catalog,public.ark60_experience_state from public,anon,authenticated;
grant select on public.ark60_experience_catalog to service_role;
grant all on public.ark60_experience_state to service_role;
create or replace function public.ark60_experience_action(p_student uuid,p_action text default 'snapshot',p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare s public.ark60_experience_state%rowtype; item public.ark60_experience_catalog%rowtype; k text; n integer; earned integer:=0; label text:=''; correct boolean; prior boolean; stamp timestamptz:=now();
begin
 if not exists(select 1 from public.ark60_students where id=p_student and lower(username)='rustam7' and status='active') then raise exception 'EXPERIENCE_FORBIDDEN' using errcode='42501'; end if;
 if p_action not in ('snapshot','buy','equip','clear','motion','refill','reset','task','review','quest','claim_quest') then raise exception 'EXPERIENCE_INVALID_ACTION'; end if;
 insert into public.ark60_experience_state(student_id) values(p_student) on conflict do nothing;
 select * into s from public.ark60_experience_state where student_id=p_student for update;
 if p_action in ('buy','equip') then
  select * into item from public.ark60_experience_catalog where id=p_data->>'id';
  if not found then raise exception 'EXPERIENCE_INVALID_ITEM'; end if;
  if p_action='buy' and not s.owned ? item.id then
   if s.wallet<item.price then raise exception 'EXPERIENCE_INSUFFICIENT_COINS'; end if;
   s.wallet:=s.wallet-item.price;s.owned:=s.owned||jsonb_build_array(item.id);earned:=-item.price;label:='Xarid: '||item.id;
  end if;
  if p_action='equip' then
   if not s.owned ? item.id then raise exception 'EXPERIENCE_NOT_OWNED';end if;
   s.equipped:=s.equipped||jsonb_build_object(item.category,item.id);
  end if;
 elsif p_action='clear' then
  k:=p_data->>'category';if k not in ('theme','avatar','frame','cover','title','companion') or k is null then raise exception 'EXPERIENCE_INVALID_CATEGORY';end if;
  s.equipped:=s.equipped-k;
 elsif p_action='motion' then
  if jsonb_typeof(p_data->'enabled')<>'boolean' or p_data->'enabled' is null then raise exception 'EXPERIENCE_INVALID_SETTING';end if;
  s.reduced_motion:=(p_data->>'enabled')::boolean;
 elsif p_action='refill' then s.wallet:=1200;label:='Sinov balansini tiklash';
 elsif p_action='reset' then
  if p_data->>'confirm'<>'RESET' or p_data->>'confirm' is null then raise exception 'EXPERIENCE_CONFIRM_REQUIRED';end if;
  s.wallet:=1200;s.owned:='[]';s.equipped:='{}';s.done:='[]';s.reviews:='{}';s.quest:=0;s.quest_claimed:=false;s.history:='[]';label:='Sinov muhiti qayta boshlandi';
 elsif p_action='task' then
  k:=p_data->>'id';if k not in ('listening','reading','vocabulary') or k is null then raise exception 'EXPERIENCE_INVALID_TASK';end if;
  if not s.done ? k then s.done:=s.done||jsonb_build_array(k);earned:=10;s.wallet:=s.wallet+earned;label:='Vazifa: '||k;end if;
 elsif p_action='review' then
  k:=p_data->>'id';if k not in ('transport','library-hours','reliable','accessible','implement','sustain','significant') or k is null then raise exception 'EXPERIENCE_INVALID_REVIEW';end if;
  correct:=case k when 'transport' then p_data->>'answer'='1' when 'library-hours' then p_data->>'answer'='0' else lower(trim(regexp_replace(coalesce(p_data->>'answer',''),'[.!?]+$','','g')))=k end;
  prior:=coalesce((s.reviews->k->>'rewarded')::boolean,false);
  s.reviews:=s.reviews||jsonb_build_object(k,jsonb_build_object('correct',correct,'rewarded',prior or correct,'due_at',stamp+case when correct then interval '1 day' else interval '5 minutes' end));
  if correct and not prior then earned:=5;s.wallet:=s.wallet+earned;label:='Takrorlash: '||k;end if;
 elsif p_action='quest' then s.quest:=least(6,s.quest+1);
 elsif p_action='claim_quest' then
  if s.quest<6 then raise exception 'EXPERIENCE_QUEST_INCOMPLETE';end if;
  if not s.quest_claimed then s.quest_claimed:=true;earned:=40;s.wallet:=s.wallet+earned;label:='Haftalik vazifa mukofoti';end if;
 end if;
 if label<>'' then s.history:=(jsonb_build_array(jsonb_build_object('label',label,'amount',earned,'at',stamp))||s.history);select coalesce(jsonb_agg(value),'[]') into s.history from (select value from jsonb_array_elements(s.history) limit 40) h;end if;
 update public.ark60_experience_state set wallet=s.wallet,owned=s.owned,equipped=s.equipped,reduced_motion=s.reduced_motion,done=s.done,reviews=s.reviews,quest=s.quest,quest_claimed=s.quest_claimed,history=s.history,updated_at=stamp where student_id=p_student;
 return to_jsonb(s)-'student_id'-'updated_at';
end $$;
revoke all on function public.ark60_experience_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.ark60_experience_action(uuid,text,jsonb) to service_role;
