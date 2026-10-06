-- ARK IELTS 60-Day Challenge: Day 06 Speaking
-- Published for 6 October 2026. Idempotent and safe to re-run.

-- Day 01-03 initially used a narrow day-number check. Keep fresh installs
-- consistent with production so Speaking works across the full 60-day challenge.
alter table if exists public.ark60_speaking_attempts
  drop constraint if exists ark60_speaking_attempts_day_number_check;
alter table if exists public.ark60_speaking_attempts
  add constraint ark60_speaking_attempts_day_number_check
  check (day_number between 1 and 60);

alter table if exists public.ark60_speaking_answers
  drop constraint if exists ark60_speaking_answers_day_number_check;
alter table if exists public.ark60_speaking_answers
  add constraint ark60_speaking_answers_day_number_check
  check (day_number between 1 and 60);

insert into public.ark60_content(day_number,module,title,status,payload,published_at,updated_at)
values (
  6,
  'speaking',
  'Full Speaking · Day 06',
  'published',
  jsonb_build_object(
    'version','speaking-day-6-v1',
    'part1',jsonb_build_object(
      'topic','TOPIC 9. TIDINESS',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p1_q1','text','Would you say you are a tidy person?'),
        jsonb_build_object('key','p1_q2','text','Do you like to keep things tidy?'),
        jsonb_build_object('key','p1_q3','text','How do you keep things tidy?'),
        jsonb_build_object('key','p1_q4','text','Do you think it is possible for people to be tidy all the time?'),
        jsonb_build_object('key','p1_q5','text','Did you use to keep your room tidy as a child?')
      )
    ),
    'part2',jsonb_build_object(
      'topic','TOPIC 8. PLAN YOU HAD TO CHANGE',
      'key','p2_main',
      'prompt','Describe a plan you had to change.',
      'bullets',jsonb_build_array(
        'what the plan was',
        'why you had to change it',
        'what the new plan was',
        'how you felt about the change'
      ),
      'preparation_seconds',60,
      'max_answer_seconds',120
    ),
    'part3',jsonb_build_object(
      'topic','TOPIC 8. PLANNING',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p3_q1','text','Do old people often change plans?'),
        jsonb_build_object('key','p3_q2','text','Do young people like to change plans?'),
        jsonb_build_object('key','p3_q3','text','What are the common reasons when people need to change plans?'),
        jsonb_build_object('key','p3_q4','text','How would you tell your friends if you had to change your plans?'),
        jsonb_build_object('key','p3_q5','text','How does technology help people make plans?'),
        jsonb_build_object('key','p3_q6','text','Why do parents still make plans for their children nowadays?')
      )
    )
  ),
  now(),
  now()
)
on conflict(day_number,module) do update
set title=excluded.title,
    status='published',
    payload=excluded.payload,
    published_at=coalesce(public.ark60_content.published_at,now()),
    updated_at=now();
