-- Prevent object shadowing through a mutable function search_path.
alter function public.set_updated_at() set search_path = '';
