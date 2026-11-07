alter table public.ark60_mock_entry_codes drop constraint ark60_mock_entry_codes_day_number_check, add constraint ark60_mock_entry_codes_day_number_check check (day_number in (18,25,32,39));
alter table public.ark60_mock_code_limits drop constraint ark60_mock_code_limits_day_number_check, add constraint ark60_mock_code_limits_day_number_check check (day_number in (18,25,32,39));
do $migration$
declare
  issue_definition text := pg_get_functiondef('public.ark60_mock_code_issue(uuid,uuid,integer,text,text)'::regprocedure);
  redeem_definition text := pg_get_functiondef('public.ark60_mock_code_redeem(uuid,integer,text)'::regprocedure);
begin
  if strpos(issue_definition, 'p_day NOT IN (18,25,32)') = 0
     or strpos(issue_definition, 'p_day=32') = 0
     or strpos(redeem_definition, 'p_day NOT IN (18,25,32)') = 0 then
    raise exception 'Unexpected mock code function definitions';
  end if;
  execute replace(replace(issue_definition, 'p_day NOT IN (18,25,32)', 'p_day NOT IN (18,25,32,39)'), 'p_day=32', 'p_day in (32,39)');
  execute replace(redeem_definition, 'p_day NOT IN (18,25,32)', 'p_day NOT IN (18,25,32,39)');
end
$migration$;