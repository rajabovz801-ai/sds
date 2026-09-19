alter table public.students
  add column if not exists exam_platform_enabled boolean not null default true;

update public.students s
set exam_platform_enabled = false,
    updated_at = now()
where s.created_at >= timestamptz '2026-09-17 00:00:00+00'
  and exists (
    select 1
    from public.ark_english_students aes
    where aes.student_id = s.id
      and aes.active = true
      and aes.source = 'teddy_bot'
  )
  and not exists (
    select 1
    from public.test_sessions ts
    where ts.student_id = s.id
      and ts.created_at < timestamptz '2026-09-17 00:00:00+00'
  );

create index if not exists idx_students_exam_platform_enabled
  on public.students(status, exam_platform_enabled);
