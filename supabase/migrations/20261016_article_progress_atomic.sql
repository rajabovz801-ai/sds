-- Ordinal progress is independent of original print page numbers.
-- Serialize updates to preserve visited sections across tabs; never remove completion.
create or replace function public.ark60_article_save_progress(p_student uuid,p_article uuid,p_page int,p_visited int[] default '{}',p_finish boolean default false) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare a public.ark60_articles; r public.ark60_article_progress; n int; seen int[]; done timestamptz;
begin
 if not exists(select 1 from ark60_students where id=p_student and status='active') then raise exception 'Student unavailable';end if;
 select * into a from ark60_articles where id=p_article and status='published';
 if not found then raise exception 'Article unavailable';end if;
 n:=jsonb_array_length(a.sections);
 if n<1 or p_page is null or p_page<1 or p_page>n then raise exception 'Invalid section';end if;
 if exists(select 1 from unnest(p_visited) v where v is null or v<1 or v>n) then raise exception 'Invalid visited section';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_student::text||p_article::text,0));
 select * into r from ark60_article_progress where student_id=p_student and article_id=p_article;
 select coalesce(array_agg(distinct x order by x),'{}'::int[]) into seen from (
 select case when v between 1 and n then v else (select s.ordinality::int from jsonb_array_elements(a.sections) with ordinality s(item,ordinality) where (s.item->>'page')::int=v limit 1) end x
 from unnest(coalesce(r.visited_pages,'{}')||coalesce(p_visited,'{}')) v
 ) positions where x between 1 and n;
 done:=r.completed_at;
 if p_finish then
  if exists(select 1 from generate_series(1,n) v where not(v=any(seen))) then raise exception 'Read the entire article before completing';end if;
  done:=coalesce(done,now());
 end if;
 insert into ark60_article_progress(student_id,article_id,last_page,visited_pages,completed_at,updated_at)
 values(p_student,p_article,p_page,seen,done,now()) on conflict(student_id,article_id) do update
 set last_page=excluded.last_page,visited_pages=excluded.visited_pages,completed_at=excluded.completed_at,updated_at=excluded.updated_at returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.ark60_article_save_progress(uuid,uuid,int,int[],boolean) from public,anon,authenticated;
grant execute on function public.ark60_article_save_progress(uuid,uuid,int,int[],boolean) to service_role;
