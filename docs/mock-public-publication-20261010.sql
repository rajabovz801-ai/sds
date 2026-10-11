BEGIN;
DO $$
BEGIN
 IF (SELECT count(*) FROM ark60_content WHERE day_number=11 AND id IN ('48a01e27-329f-48a0-97de-0f24084bfd47','4a5629bf-9f2c-4176-88fb-23317fadf93e') AND module IN ('listening','writing'))<>2 THEN RAISE EXCEPTION 'Day11 content scope mismatch'; END IF;
 IF (SELECT count(*) FROM ark60_reading_passages WHERE day_number=11 AND id IN ('16a7f9d2-9c62-47bc-998b-350f3aa713e1','0d2c94fb-9859-4bbe-8e33-633240c2dfd7','75fa9dd1-989c-4552-9b08-5219e6cb8614') AND ordinal IN (1,2,3))<>3 THEN RAISE EXCEPTION 'Day11 passage scope mismatch'; END IF;
END $$;
UPDATE ark60_content SET status='published',published_at=coalesce(published_at,now()),updated_at=now() WHERE day_number=11 AND id IN ('48a01e27-329f-48a0-97de-0f24084bfd47','4a5629bf-9f2c-4176-88fb-23317fadf93e') AND module IN ('listening','writing') AND status='draft';
UPDATE ark60_reading_passages SET status='published' WHERE day_number=11 AND id IN ('16a7f9d2-9c62-47bc-998b-350f3aa713e1','0d2c94fb-9859-4bbe-8e33-633240c2dfd7','75fa9dd1-989c-4552-9b08-5219e6cb8614') AND ordinal IN (1,2,3) AND status='draft';
COMMIT;
SELECT jsonb_build_object('content',(SELECT jsonb_agg(jsonb_build_object('module',module,'status',status)) FROM ark60_content WHERE day_number=11),'reading',(SELECT jsonb_agg(jsonb_build_object('ordinal',ordinal,'status',status,'questions',jsonb_array_length(questions),'keys',jsonb_array_length(answer_key))) FROM ark60_reading_passages WHERE day_number=11),'attempts',(SELECT count(*) FROM ark60_mock_attempts WHERE day_number=11)) AS publication;
