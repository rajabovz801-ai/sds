-- ARK IELTS 60-Day Challenge: Day 07 Speaking
-- Published for 7 October 2026. Idempotent and safe to re-run.

insert into public.ark60_content(day_number,module,title,status,payload,published_at,updated_at)
values (
  7,
  'speaking',
  'Full Speaking · Day 07',
  'published',
  jsonb_build_object(
    'version','speaking-day-7-v1',
    'part1',jsonb_build_object(
      'topic','TOPIC 10. WEBSITES',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p1_q1','text','What kinds of websites do you often visit?'),
        jsonb_build_object('key','p1_q2','text','What kinds of websites are popular in your country?'),
        jsonb_build_object('key','p1_q3','text','What is your favourite website?'),
        jsonb_build_object('key','p1_q4','text','Are there any changes to the websites you often visit?')
      )
    ),
    'part2',jsonb_build_object(
      'topic','TOPIC 9. FOOD FOR SPECIAL OCCASIONS',
      'key','p2_main',
      'prompt','Describe a type of food that people eat at special events.',
      'bullets',jsonb_build_array(
        'what the food is',
        'why people eat it at special events',
        'how people prepare this food',
        'why you like this food so much'
      ),
      'preparation_seconds',60,
      'max_answer_seconds',120
    ),
    'part3',jsonb_build_object(
      'topic','TOPIC 9. FOOD',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p3_q1','text','What food do you eat on special occasions?'),
        jsonb_build_object('key','p3_q2','text','Is food now better than in the past?'),
        jsonb_build_object('key','p3_q3','text','Are there any differences between the food people eat today and the food people ate in the past?')
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