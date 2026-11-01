-- Run with service-role database access. All test changes are rolled back.
begin;
do $test$
declare sid uuid; v integer; requirements jsonb;
begin
 select id into sid from public.ark60_students where username='rustam7' and status='active';
 assert sid is not null,'Preview account required';
 delete from public.ark60_study_sessions where student_id=sid;
 v:=public.ark60_record_study_heartbeat(sid,28,'reading',true);
 assert v=0,'First pulse must not add time';
 update public.ark60_study_sessions set last_active_at=clock_timestamp()-interval '20 seconds' where student_id=sid;
 v:=public.ark60_record_study_heartbeat(sid,28,'reading',false);
 assert v=20,'Active interval should count';
 v:=public.ark60_record_study_heartbeat(sid,28,'reading',false);
 assert v=0,'Duplicate pulse must not add time';
 update public.ark60_study_sessions set last_active_at=clock_timestamp()-interval '120 seconds' where student_id=sid;
 v:=public.ark60_record_study_heartbeat(sid,28,'reading',false);
 assert v=0,'Idle gaps must not backfill';
 v:=public.ark60_record_study_heartbeat(sid,28,'listening',false);
 assert v=0,'Changing modules must reset baseline';
 assert (select sum(active_seconds) from public.ark60_study_sessions where student_id=sid)=20,'Multiple modules must not multiply time';
 select required_by_day into requirements from public.ark60_student_dashboard_summary(sid,date '2026-11-02');
 assert not(requirements?'33'),'Unpublished Day 33 must not appear ready';
 assert jsonb_array_length(requirements->'28')=6,'Published day must stay ready';
 assert jsonb_array_length(requirements->'32')=3,'Personal-code mock must stay available';
end $test$;
rollback;
