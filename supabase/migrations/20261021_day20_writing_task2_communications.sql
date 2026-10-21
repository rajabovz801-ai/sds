-- Replace Day 20 Writing Task 2 prompt only; retain existing students' submissions, timing and minimum word count.
-- New task provided by the user on 2026-10-21 as an image.
update public.ark60_content
set payload = jsonb_set(
  jsonb_set(
    jsonb_set(payload, '{prompt}', to_jsonb('Some people believe that the increasing use of computers and mobile phones for communications has had a negative effect on young people''s reading and writing skills.

To what extent do you agree or disagree?'::text), true),
    '{source_file}', to_jsonb('User-provided Day 20 Writing Task 2 image'::text), true
  ),
  '{source_page}', '1'::jsonb, true
), updated_at=now()
where day_number=20 and module='writing' and status='published'
  and payload->>'task_type'='task2';
