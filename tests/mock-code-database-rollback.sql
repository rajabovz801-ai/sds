begin;
do $$
declare a uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); other uuid:=gen_random_uuid(); first_code uuid; issued jsonb; result jsonb; i int;
begin
 assert to_regprocedure('public.ark60_mock_code_issue(uuid,uuid,integer,text,text)') is not null,'Personal-code issue RPC is missing';
 insert into public.ark60_admins(id,username,display_name,password_hash,role,status) values(a,'qa_'||a::text,'Rollback QA','not-a-login-hash','super_admin','active');
 insert into public.ark60_students(id,first_name,last_name,username,password_hash,target_band,status) values(s,'Rollback','QA','qa_'||s::text,'not-a-login-hash',7,'active'),(other,'Rollback','Other','qa_'||other::text,'not-a-login-hash',7,'active');
 issued:=public.ark60_mock_code_issue(a,s,18,repeat('a',64),'AAAA'); first_code:=(issued->>'id')::uuid;
 result:=public.ark60_mock_code_redeem(other,18,repeat('a',64)); assert result->>'status'='invalid','Wrong account accepted another code';
 result:=public.ark60_mock_code_redeem(s,18,repeat('a',64)); assert result->>'status'='ok','Correct account could not redeem';
 result:=public.ark60_mock_code_redeem(s,18,repeat('a',64)); assert result->>'status'='ok','Redemption is not idempotent';
 issued:=public.ark60_mock_code_issue(a,s,18,repeat('b',64),'BBBB');
 result:=public.ark60_mock_code_redeem(s,18,repeat('a',64)); assert result->>'status'='invalid','Rotated code stayed valid';
 for i in 1..4 loop result:=public.ark60_mock_code_redeem(s,18,repeat('c',64)); end loop;
 assert result->>'status'='locked','Fifth failure did not lock';
 result:=public.ark60_mock_code_redeem(s,18,repeat('b',64)); assert result->>'status'='locked','Correct code bypassed active lockout';
 update public.ark60_mock_code_limits set locked_until=now()-interval '1 second',window_started_at=now()-interval '16 minutes' where student_id=s and day_number=18;
 result:=public.ark60_mock_code_redeem(s,18,repeat('b',64)); assert result->>'status'='ok','Code did not work after lock expired';
 perform public.ark60_mock_code_revoke(a,first_code);
 result:=public.ark60_mock_code_redeem(s,18,repeat('b',64)); assert result->>'status'='invalid','Stale admin revoke left current code valid';
 assert not exists(select 1 from public.ark60_mock_attempts where student_id in(s,other)),'Access tests created mock results';
 assert not has_table_privilege('anon','public.ark60_mock_entry_codes','SELECT'),'Anonymous can read codes';
 assert not has_function_privilege('authenticated','public.ark60_mock_code_issue(uuid,uuid,integer,text,text)','EXECUTE'),'Authenticated can invoke privileged issue';
end $$;
select 'PASS: issue, account binding, idempotence, rotation, five-failure lockout, expiry, revoke, no results, restricted privileges' as verification;
rollback;
