alter table public.students add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-avatars', 'student-avatars', true, 3145728, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();
