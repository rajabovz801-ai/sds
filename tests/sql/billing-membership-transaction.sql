begin;
do $$
declare old_id uuid:=gen_random_uuid();new_id uuid:=gen_random_uuid();admin_id uuid;oid uuid;oid2 uuid;oid3 uuid;pid uuid;pid2 uuid;m jsonb;r public.ark60_billing_orders;
begin
 select id into admin_id from public.ark60_admins where role='super_admin' and status='active' limit 1;
 if admin_id is null then raise exception 'Test requires existing active super admin';end if;
 insert into public.ark60_students(id,first_name,last_name,username,password_hash,target_band,status,created_at) values
 (old_id,'Billing','OldTest','billtest_'||replace(old_id::text,'-',''),'disabled-test-hash',7,'active','2026-10-01T00:00:00Z'),
 (new_id,'Billing','NewTest','billtest_'||replace(new_id::text,'-',''),'disabled-test-hash',7,'active','2026-10-19T01:00:00+05:00');
 if not public.ark60_billing_can_study(old_id,15,'',false,'2026-10-15T21:00:00+05:00') then raise exception 'Prelaunch regression';end if;
 if public.ark60_billing_can_study(old_id,1,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Legacy free access leaked';end if;
 if not public.ark60_billing_can_study(new_id,1,'',false,'2026-10-19T12:00:00+05:00') or not public.ark60_billing_can_study(new_id,2,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Trial unavailable';end if;
 if public.ark60_billing_can_study(new_id,3,'',false,'2026-10-19T12:00:00+05:00') or public.ark60_billing_can_study(new_id,18,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Trial leaked paid content';end if;
 insert into public.ark60_billing_orders(student_id,order_code,plan_key,price_uzs,payment_method) values(old_id,'TEST-'||gen_random_uuid(),'challenge',15000,'uzcard') returning id into oid;
 if public.ark60_billing_can_study(old_id,19,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Pending grants access';end if;
 perform public.ark60_billing_review_v2(oid,admin_id,'approved','Transaction test',null,'TEST-'||oid);
 if not public.ark60_billing_can_study(old_id,19,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Approval did not open challenge';end if;
 if public.ark60_billing_can_study(old_id,25,'',false,'2026-10-25T12:00:00+05:00') then raise exception 'Challenge opened mock';end if;
 if public.ark60_billing_can_study(old_id,20,'',false,'2026-10-19T12:00:00+05:00') then raise exception 'Future day leaked';end if;
 if public.ark60_billing_can_study(old_id,19,'',false,'2026-10-26T00:00:00+05:00') then raise exception 'Expiry boundary is inclusive';end if;
 begin perform public.ark60_review_billing_order(oid,admin_id,'approved','Duplicate');raise exception 'Double approval succeeded';exception when others then if sqlerrm='Double approval succeeded' then raise;end if;end;
 insert into public.ark60_billing_orders(student_id,order_code,plan_key,price_uzs,payment_method) values(old_id,'TEST-'||gen_random_uuid(),'all_access',35000,'uzcard') returning id into oid2;
 perform public.ark60_billing_review_v2(oid2,admin_id,'approved','Renewal test','2026-10-25',null);
 m:=public.ark60_billing_snapshot(old_id,'2026-10-26T12:00:00+05:00');
 if m->>'challenge_until' is null then raise exception 'Renewal lost remaining time';end if;
 if not public.ark60_billing_can_study(old_id,25,'',false,'2026-10-25T12:00:00+05:00') then raise exception 'All Access mock unavailable';end if;
 perform public.ark60_billing_revoke(admin_id,oid2,'Revoke renewal and ticket');
 if public.ark60_billing_can_study(old_id,25,'',false,'2026-10-25T12:00:00+05:00') then raise exception 'Revocation orphaned ticket';end if;
 insert into public.ark60_billing_orders(student_id,order_code,plan_key,price_uzs,payment_method) values(old_id,'TEST-'||gen_random_uuid(),'mock',25000,'uzcard') returning id into oid3;
 perform public.ark60_billing_cancel(old_id,oid3);
 begin perform public.ark60_review_billing_order(oid3,admin_id,'approved','Cancelled');raise exception 'Cancelled order approved';exception when others then if sqlerrm='Cancelled order approved' then raise;end if;end;
 select id into pid from public.ark60_reading_passages where day_number=1 and status='published' order by ordinal limit 1;
 select id into pid2 from public.ark60_reading_passages where day_number=1 and status='published' and id<>pid limit 1;
 if pid is null or pid2 is null then raise exception 'Reading fixtures unavailable';end if;
 insert into public.ark60_reading_starts(student_id,passage_id,started_at) values(old_id,pid,'2026-10-25T23:50:00+05:00');
 if not public.ark60_billing_can_resume_reading(old_id,pid,'2026-10-26T00:10:00+05:00') then raise exception 'Exact started passage cannot resume';end if;
 if public.ark60_billing_can_resume_reading(old_id,pid2,'2026-10-26T00:10:00+05:00') then raise exception 'Unstarted passage inherited grace';end if;
 if public.ark60_billing_can_resume_reading(old_id,pid,'2026-10-26T02:10:00+05:00') then raise exception 'Reading grace unbounded';end if;
 insert into public.ark60_reading_attempts(student_id,passage_id,day_number,ordinal,answers,score,total,elapsed_seconds) values(old_id,pid,1,1,'{}',0,1,100);
 if public.ark60_billing_can_resume_reading(old_id,pid,'2026-10-26T00:10:00+05:00') then raise exception 'Completed passage inherited grace';end if;
 if has_function_privilege('anon','public.ark60_billing_snapshot(uuid,timestamptz)','execute') or has_function_privilege('authenticated','public.ark60_billing_review_v2(uuid,uuid,text,text,date,text)','execute') then raise exception 'Public RPC privilege leak';end if;
end $$;
rollback;
select 'PASS: prelaunch, trial, legacy lock, pending, challenge/mock isolation, future lock, expiry, duplicate approval, renewal, revocation, cancellation, RPC grants; all test data rolled back' as result;
