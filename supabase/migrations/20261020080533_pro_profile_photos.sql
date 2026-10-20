begin;
alter table public.ark60_cosmetics add column if not exists photo_url text;
alter table public.ark60_cosmetics add column if not exists photo_enabled boolean not null default true;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ark60-profile-photos','ark60-profile-photos',true,524288,array['image/webp'])
on conflict(id) do nothing;
-- Existing cosmetics RLS remains server-only. Storage writes use the server service role;
-- no anon/authenticated upload policies are created. Only processed avatar images are public.
commit;
