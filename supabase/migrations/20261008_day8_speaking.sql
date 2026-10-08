-- ARK IELTS 60-Day Challenge: Day 08 Speaking
-- Published for 8 October 2026. Idempotent and safe to re-run.

insert into public.ark60_content(day_number,module,title,status,payload,published_at,updated_at)
values (
  8,
  'speaking',
  'Full Speaking · Day 08',
  'published',
  jsonb_build_object(
    'version','speaking-day-8-v1',
    'part1',jsonb_build_object(
      'topic','TOPIC 11. WATCHES',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p1_q1','text','Do you like to wear watches?'),
        jsonb_build_object('key','p1_q2','text','Do you think a watch is important for you?'),
        jsonb_build_object('key','p1_q3','text','Have you ever received a watch as a gift?'),
        jsonb_build_object('key','p1_q4','text','Why do people like expensive watches?')
      )
    ),
    'part2',jsonb_build_object(
      'topic','TOPIC 10. LIVE SPORTS EVENT YOU WATCHED',
      'key','p2_main',
      'prompt','Describe a time when you watched a live sports event and liked it.',
      'bullets',jsonb_build_array(
        'what the sports event was',
        'where and when the sports event took place',
        'why you watched it live',
        'why you liked it live'
      ),
      'preparation_seconds',60,
      'max_answer_seconds',120
    ),
    'part3',jsonb_build_object(
      'topic','TOPIC 10. SPORTS EVENTS, COMPETITION',
      'questions',jsonb_build_array(
        jsonb_build_object('key','p3_q1','text','What is the difference between watching sports events at home and at the stadium?'),
        jsonb_build_object('key','p3_q2','text','What are the advantages of watching sports events online?'),
        jsonb_build_object('key','p3_q3','text','Why does somebody dislike to watch the Olympic Games?')
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