ALTER TABLE public.ark60_mock_entry_codes DROP CONSTRAINT ark60_mock_entry_codes_day_number_check, ADD CONSTRAINT ark60_mock_entry_codes_day_number_check CHECK (day_number IN (18,25,32,39,46));
DO $$
DECLARE f record; body text; changed integer := 0;
BEGIN
 FOR f IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('ark60_mock_code_issue','ark60_mock_code_redeem') LOOP
  body := pg_get_functiondef(f.oid);
  IF strpos(body,'NOT IN (18,25,32,39)')=0 THEN RAISE EXCEPTION 'Unexpected mock RPC definition'; END IF;
  EXECUTE replace(replace(body,'NOT IN (18,25,32,39)','NOT IN (18,25,32,39,46)'),'p_day in (32,39)','p_day in (32,39,46)');
  changed := changed+1;
 END LOOP;
 IF changed<>2 THEN RAISE EXCEPTION 'Expected two mock RPCs'; END IF;
END $$;