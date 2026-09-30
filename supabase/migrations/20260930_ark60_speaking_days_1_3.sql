-- ARK IELTS 60-Day Challenge: Full Speaking Days 1-3
-- Applied to production on 2026-09-30. Idempotent and safe to re-run.

create table if not exists public.ark60_speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ark60_students(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 3),
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  part2_preparation_started_at timestamptz,
  part2_preparation_expires_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','reviewed','returned')),
  band numeric(2,1) check (band is null or (band between 0 and 9 and band*2=round(band*2))),
  feedback text,
  reviewed_at timestamptz,
  audio_expired boolean not null default false,
  answer_count integer not null default 0 check (answer_count between 0 and 30),
  total_audio_seconds integer not null default 0 check (total_audio_seconds between 0 and 7200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,day_number)
);
alter table public.ark60_speaking_attempts enable row level security;

create table if not exists public.ark60_speaking_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.ark60_speaking_attempts(id) on delete cascade,
  student_id uuid not null references public.ark60_students(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 3),
  part_number integer not null check (part_number between 1 and 3),
  question_key text not null,
  question_text text not null,
  storage_path text not null,
  mime_type text not null,
  duration_seconds integer not null check (duration_seconds between 1 and 180),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(attempt_id,question_key)
);
alter table public.ark60_speaking_answers enable row level security;

create index if not exists ark60_speaking_attempts_status_idx on public.ark60_speaking_attempts(status,submitted_at desc);
create index if not exists ark60_speaking_attempts_expiry_idx on public.ark60_speaking_attempts(expires_at) where expires_at is not null and audio_expired=false;
create index if not exists ark60_speaking_answers_attempt_idx on public.ark60_speaking_answers(attempt_id,part_number,created_at);
create index if not exists ark60_speaking_answers_expiry_idx on public.ark60_speaking_answers(expires_at) where expires_at is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ark60-speaking-audio','ark60-speaking-audio',false,8388608,array['audio/webm','audio/mp4','audio/ogg','application/octet-stream']::text[])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.ark60_submit_speaking_attempt(p_attempt uuid,p_student uuid,p_day integer,p_expected_keys text[])
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_attempt public.ark60_speaking_attempts%rowtype;
 v_actual text[];v_count integer;v_seconds integer;v_expires timestamptz;v_submission_id uuid;
begin
 select * into v_attempt from public.ark60_speaking_attempts where id=p_attempt and student_id=p_student and day_number=p_day for update;
 if not found then raise exception 'Speaking attempt not found'; end if;
 if v_attempt.status='submitted' then
  select id into v_submission_id from public.ark60_submissions where student_id=p_student and day_number=p_day and module='speaking' limit 1;
  return jsonb_build_object('ok',true,'already_submitted',true,'attempt_id',v_attempt.id,'submission_id',v_submission_id,'submitted_at',v_attempt.submitted_at,'expires_at',v_attempt.expires_at);
 end if;
 select coalesce(array_agg(question_key order by question_key),'{}'::text[]),count(*)::int,coalesce(sum(duration_seconds),0)::int
 into v_actual,v_count,v_seconds from public.ark60_speaking_answers where attempt_id=p_attempt and student_id=p_student;
 if coalesce(v_actual,'{}'::text[])<>(select coalesce(array_agg(x order by x),'{}'::text[]) from unnest(p_expected_keys)x) then
  raise exception 'Complete every Speaking answer before submitting';
 end if;
 v_expires=now()+interval '72 hours';
 update public.ark60_speaking_attempts set status='submitted',submitted_at=now(),expires_at=v_expires,review_status='pending',
 answer_count=v_count,total_audio_seconds=v_seconds,updated_at=now() where id=p_attempt returning * into v_attempt;
 update public.ark60_speaking_answers set expires_at=v_expires where attempt_id=p_attempt;
 insert into public.ark60_submissions(student_id,day_number,module,payload,review_status)
 values(p_student,p_day,'speaking',jsonb_build_object('attempt_id',p_attempt,'answer_count',v_count,'total_audio_seconds',v_seconds,'source','challenge-speaking-v1','expires_at',v_expires),'pending')
 on conflict(student_id,day_number,module) do nothing returning id into v_submission_id;
 if v_submission_id is null then select id into v_submission_id from public.ark60_submissions where student_id=p_student and day_number=p_day and module='speaking' limit 1; end if;
 return jsonb_build_object('ok',true,'already_submitted',false,'attempt_id',p_attempt,'submission_id',v_submission_id,'submitted_at',v_attempt.submitted_at,'expires_at',v_expires,'answer_count',v_count,'total_audio_seconds',v_seconds);
end $$;
revoke all on function public.ark60_submit_speaking_attempt(uuid,uuid,integer,text[]) from public,anon,authenticated;
grant execute on function public.ark60_submit_speaking_attempt(uuid,uuid,integer,text[]) to service_role;

insert into public.ark60_content(day_number,module,title,status,payload,published_at,updated_at) values
(1,'speaking','Full Speaking · Day 01','published',jsonb_build_object(
 'version','speaking-days-1-3-v1',
 'part1',jsonb_build_object('topic','TOPIC 5. SOCIAL MEDIA','questions',jsonb_build_array(
  jsonb_build_object('key','p1_q1','text','Do you think you spend too much time on social media?'),
  jsonb_build_object('key','p1_q2','text','What do people often do on social media?'))),
 'part2',jsonb_build_object('topic','TOPIC 4. GETTING UP EARLY','key','p2_main','prompt','Describe an occasion when you got up extremely early.','bullets',jsonb_build_array(
  'when this happened','what you needed to do on that day','who you were with','how you felt about getting up early on that day'),'preparation_seconds',60,'max_answer_seconds',120),
 'part3',jsonb_build_object('topic','TOPIC 4. GETTING UP EARLY','questions',jsonb_build_array(
  jsonb_build_object('key','p3_q1','text','Why do people get up early?'),
  jsonb_build_object('key','p3_q2','text','Are there any situations when it''s not good to arrive early?'),
  jsonb_build_object('key','p3_q3','text','Is it good to arrive early in any situation?'),
  jsonb_build_object('key','p3_q4','text','Why do some people stay up late at night?'),
  jsonb_build_object('key','p3_q5','text','Is it easy to get up early?')))),now(),now()),
(2,'speaking','Full Speaking · Day 02','published',jsonb_build_object(
 'version','speaking-days-1-3-v1',
 'part1',jsonb_build_object('topic','TOPIC 6. DREAMS AND AMBITIONS','questions',jsonb_build_array(
  jsonb_build_object('key','p1_q1','text','What was your dream when you were a child?'),
  jsonb_build_object('key','p1_q2','text','Are you the kind of person who sticks to dreams?'),
  jsonb_build_object('key','p1_q3','text','Do you think you are an ambitious person?'),
  jsonb_build_object('key','p1_q4','text','Are you an ambitious person?'),
  jsonb_build_object('key','p1_q5','text','What is your dream job?'))),
 'part2',jsonb_build_object('topic','TOPIC 5. NEW LAW','key','p2_main','prompt','Describe a new law you would like to introduce in your country.','bullets',jsonb_build_array(
  'what law it is, what changes it brings','whether it will be popular','how you came up with the new law','how you feel about it'),'preparation_seconds',60,'max_answer_seconds',120),
 'part3',jsonb_build_object('topic','TOPIC 5. RULES AND LAWS','questions',jsonb_build_array(
  jsonb_build_object('key','p3_q1','text','Do people in your country usually obey the law?'),
  jsonb_build_object('key','p3_q2','text','What are some rules that exist in schools or workplaces in your country?'),
  jsonb_build_object('key','p3_q3','text','What kind of behaviour is considered good behaviour?'),
  jsonb_build_object('key','p3_q4','text','How can parents teach children to obey rules?'),
  jsonb_build_object('key','p3_q5','text','What are the benefits of obeying rules?'),
  jsonb_build_object('key','p3_q6','text','Do you think children can learn about the law outside of school?')))),now(),now()),
(3,'speaking','Full Speaking · Day 03','published',jsonb_build_object(
 'version','speaking-days-1-3-v1',
 'part1',jsonb_build_object('topic','TOPIC 7. MIRRORS','questions',jsonb_build_array(
  jsonb_build_object('key','p1_q1','text','Would you use mirrors to decorate your room?'),
  jsonb_build_object('key','p1_q2','text','Do you usually take a mirror with you?'),
  jsonb_build_object('key','p1_q3','text','How often do you use a mirror?'),
  jsonb_build_object('key','p1_q4','text','Do you like looking at yourself in a mirror?'),
  jsonb_build_object('key','p1_q5','text','Have you ever bought a mirror?'),
  jsonb_build_object('key','p1_q6','text','Do you use a mirror before buying clothing?'),
  jsonb_build_object('key','p1_q7','text','What functions does a mirror have?'),
  jsonb_build_object('key','p1_q8','text','Do you think a mirror is a good decoration?'))),
 'part2',jsonb_build_object('topic','TOPIC 6. PERSON WHO LOVES TO GROW PLANTS','key','p2_main','prompt','Describe a person you know who loves to grow plants (vegetables, fruits, flowers).','bullets',jsonb_build_array(
  'who this person is','what this person grows','where this person grows them','why this person loves to grow plants'),'preparation_seconds',60,'max_answer_seconds',120),
 'part3',jsonb_build_object('topic','TOPIC 6. GROWING PLANTS','questions',jsonb_build_array(
  jsonb_build_object('key','p3_q1','text','Do people in your country like to grow plants?'),
  jsonb_build_object('key','p3_q2','text','What are the advantages of growing plants at home?'),
  jsonb_build_object('key','p3_q3','text','Do people like to grow vegetables in your country?'),
  jsonb_build_object('key','p3_q4','text','What are the advantages of growing vegetables at home?'),
  jsonb_build_object('key','p3_q5','text','How do people feel when they eat vegetables that they grew on their own?')))),now(),now())
on conflict(day_number,module) do update set title=excluded.title,status='published',payload=excluded.payload,published_at=coalesce(public.ark60_content.published_at,now()),updated_at=now();
