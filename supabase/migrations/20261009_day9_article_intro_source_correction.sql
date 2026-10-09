-- Day 9 original article verification (Reader's Digest, Fredelle Maynard):
-- The opening deck/tagline is not part of the body. The actual article starts "Over lunch recently".
-- Narrow, safe correction: only remove the confirmed exact opening phrase.
DO $fix_day9_article$
DECLARE changed integer;
BEGIN
 UPDATE public.ark60_articles
 SET sections = jsonb_set(sections,'{0,paragraphs,0}',to_jsonb(substr(sections #>> '{0,paragraphs,0}', 121)), false)
 WHERE day_number=9 AND left(sections #>> '{0,paragraphs,0}',120)='Solutions to many of our most perplexing personal problems can often be found by applying a kind of creative arithmetic ';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed <> 1 THEN RAISE EXCEPTION 'Expected one Day 9 article intro, got %',changed; END IF;
END
$fix_day9_article$;