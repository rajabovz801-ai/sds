-- Article source-integrity repair: remove verified PDF/magazine page headers and image captions only.
-- Preserves sentence wording, section identifiers, glossary vocabulary and student progress.
-- Checked against the six exact strings in public.ark60_articles on 2026-10-09.
DO $article_cleanup$
DECLARE affected integer;
BEGIN
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{0,paragraphs,0}', to_jsonb(replace(sections #>> '{0,paragraphs,0}', 'Illuminating Facts About Fireworks BY Samantha Rideout ILLUSTRATION BY Serge Bloch ', '')), false)
  WHERE day_number=8 AND strpos(sections #>> '{0,paragraphs,0}', 'Illuminating Facts About Fireworks BY Samantha Rideout ILLUSTRATION BY Serge Bloch ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 8, section 1; affected %', affected; END IF;
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{2,paragraphs,0}', to_jsonb(replace(sections #>> '{2,paragraphs,0}', 'Illuminating Facts About Fireworks ', '')), false)
  WHERE day_number=8 AND strpos(sections #>> '{2,paragraphs,0}', 'Illuminating Facts About Fireworks ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 8, section 3; affected %', affected; END IF;
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{1,paragraphs,0}', to_jsonb(replace(sections #>> '{1,paragraphs,0}', 'p Adding Up To Happiness TURN LIMITATIONS INTO OPPORTUNITIES ', '')), false)
  WHERE day_number=9 AND strpos(sections #>> '{1,paragraphs,0}', 'p Adding Up To Happiness TURN LIMITATIONS INTO OPPORTUNITIES ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 9, section 2; affected %', affected; END IF;
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{3,paragraphs,0}', to_jsonb(replace(sections #>> '{3,paragraphs,0}', 'Adding Up To Happiness ', '')), false)
  WHERE day_number=9 AND strpos(sections #>> '{3,paragraphs,0}', 'Adding Up To Happiness ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 9, section 4; affected %', affected; END IF;
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{2,paragraphs,0}', to_jsonb(replace(sections #>> '{2,paragraphs,0}', 'Visitors to Gyeongbokgung dressed in hanbok, traditional Korean clothing Heart & Seoul ', '')), false)
  WHERE day_number=15 AND strpos(sections #>> '{2,paragraphs,0}', 'Visitors to Gyeongbokgung dressed in hanbok, traditional Korean clothing Heart & Seoul ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 15, section 3; affected %', affected; END IF;
  UPDATE public.ark60_articles
  SET sections=jsonb_set(sections, '{1,paragraphs,0}', to_jsonb(replace(sections #>> '{1,paragraphs,0}', '30 | SLEEP BETTER EVERY NIGHT HOURS HOW TO ACCOMMODATE A FURRY FRIEND ', '')), false)
  WHERE day_number=16 AND strpos(sections #>> '{1,paragraphs,0}', '30 | SLEEP BETTER EVERY NIGHT HOURS HOW TO ACCOMMODATE A FURRY FRIEND ')>0;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Article cleanup mismatch for day 16, section 2; affected %', affected; END IF;
END;
$article_cleanup$;