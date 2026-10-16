begin;
do $$
declare u uuid:=gen_random_uuid(); a uuid; r jsonb;
begin
 insert into ark60_students(id,first_name,last_name,username,password_hash,target_band,status)
 values(u,'Article','Regression','arttest_'||replace(u::text,'-',''),'disabled-test-hash',7,'active');
 select id into a from ark60_articles where day_number=1;
 if a is null then raise exception 'Published Day 1 article fixture required';end if;
 insert into ark60_article_progress(student_id,article_id,last_page,visited_pages) values(u,a,2,array[1,2]);
 r:=ark60_article_save_progress(u,a,3,array[3],false);
 if r->'visited_pages'<>'[1,2,3]'::jsonb then raise exception 'Visited section merge failed';end if;
 r:=ark60_article_save_progress(u,a,1,'{}',false);
 if (r->>'last_page')::int<>1 then raise exception 'Backward bookmark failed';end if;
 begin
  perform ark60_article_save_progress(u,a,1,'{}',true);
  raise exception 'Premature completion allowed';
 exception when others then if sqlerrm='Premature completion allowed' then raise;end if;end;
 r:=ark60_article_save_progress(u,a,5,array[4,5],true);
 if r->>'completed_at' is null then raise exception 'Completion missing';end if;
 r:=ark60_article_save_progress(u,a,2,array[2],false);
 if r->>'completed_at' is null then raise exception 'Earned completion lost';end if;
 begin
  perform ark60_article_save_progress(u,a,6,array[6],false);
  raise exception 'Invalid section allowed';
 exception when others then if sqlerrm='Invalid section allowed' then raise;end if;end;
 if has_function_privilege('anon','ark60_article_save_progress(uuid,uuid,int,int[],boolean)','execute') or
 has_function_privilege('authenticated','ark60_article_save_progress(uuid,uuid,int,int[],boolean)','execute') then raise exception 'Public RPC privilege leak';end if;
end $$;
rollback;
select 'PASS: visit union, backward bookmark, completion guards and privileges; all synthetic records rolled back' result;
