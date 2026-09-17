create extension if not exists pgcrypto;

create table if not exists public.telegram_registration_sessions (
  telegram_id bigint primary key,
  step text not null check (step in ('first_name','last_name','confirm')),
  first_name text,
  last_name text,
  updated_at timestamptz not null default now()
);

alter table public.telegram_registration_sessions enable row level security;
revoke all on public.telegram_registration_sessions from anon, authenticated;

create or replace function public.consume_ark_english_platform_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token public.ark_english_platform_tokens%rowtype;
  v_student public.students%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 20 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select *
    into v_token
  from public.ark_english_platform_tokens
  where token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'expired_or_used');
  end if;

  update public.ark_english_platform_tokens
  set used_at = now()
  where id = v_token.id;

  select * into v_student
  from public.students
  where id = v_token.student_id
    and status = 'active'
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'student_unavailable');
  end if;

  update public.students
  set last_login_at = now(), updated_at = now()
  where id = v_student.id;

  return jsonb_build_object(
    'ok', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'firstName', v_student.first_name,
      'lastName', v_student.last_name,
      'username', v_student.telegram_username,
      'status', v_student.status,
      'avatarUrl', v_student.avatar_url
    )
  );
end;
$$;

revoke all on function public.consume_ark_english_platform_token(text) from public;
grant execute on function public.consume_ark_english_platform_token(text) to anon, authenticated;
