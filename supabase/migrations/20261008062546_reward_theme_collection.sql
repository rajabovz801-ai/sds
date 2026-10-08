-- Extend reward progress without changing historical coins or claim dates.
BEGIN;
ALTER TABLE public.ark60_daily_rewards DROP CONSTRAINT IF EXISTS ark60_daily_rewards_streak_day_check;
ALTER TABLE public.ark60_daily_rewards ADD CONSTRAINT ark60_daily_rewards_streak_day_check CHECK (streak_day BETWEEN 1 AND 60);
ALTER TABLE public.ark60_daily_rewards DROP CONSTRAINT IF EXISTS ark60_daily_rewards_amount_check;
ALTER TABLE public.ark60_daily_rewards ADD CONSTRAINT ark60_daily_rewards_amount_check CHECK (amount BETWEEN 0 AND 7);
CREATE TABLE IF NOT EXISTS public.ark60_cosmetics (
 student_id uuid PRIMARY KEY REFERENCES public.ark60_students(id) ON DELETE CASCADE,
 theme text CHECK (theme IN ('dawn','ocean','forest')),
 avatar text CHECK (avatar IN ('boy','girl','girl-hijab')),
 badge text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ark60_cosmetics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ark60_cosmetics FROM anon, authenticated;
GRANT ALL ON public.ark60_cosmetics TO service_role;
CREATE OR REPLACE FUNCTION public.ark60_reward_center_v2(p_student uuid, p_today date)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$
WITH progress AS (SELECT count(*)::int n FROM public.ark60_daily_rewards WHERE student_id=p_student),
t AS (SELECT amount FROM public.ark60_daily_rewards WHERE student_id=p_student AND reward_date=p_today),
b AS (SELECT coalesce(sum(amount),0) coins FROM public.ark60_coin_events WHERE student_id=p_student),
h AS (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY created_at DESC),'[]'::jsonb) events FROM
 (SELECT id,day_number,module,kind,amount,created_at FROM public.ark60_coin_events WHERE student_id=p_student ORDER BY created_at DESC LIMIT 60) e)
SELECT jsonb_build_object('balance',b.coins,'claimed_today',EXISTS(SELECT 1 FROM t),
 'today_amount',coalesce((SELECT amount FROM t),0),'streak_day',progress.n,'claimed_days',progress.n,
 'next_day',least(60,progress.n+1),'history',h.events) FROM progress,b,h;
$$;
CREATE OR REPLACE FUNCTION public.ark60_claim_daily_reward_v2(p_student uuid, p_today date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE n integer; v_amount integer; v_day integer; existing integer;
BEGIN
 IF p_today < date '2026-10-01' OR p_today > date '2026-11-29' THEN
  RAISE EXCEPTION 'Daily rewards are available during the 60-day challenge';
 END IF;
 -- Serialize concurrent claims for this student before checking today's unique claim.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_student::text,0));
 SELECT amount INTO existing FROM public.ark60_daily_rewards WHERE student_id=p_student AND reward_date=p_today;
 IF FOUND THEN RETURN public.ark60_reward_center_v2(p_student,p_today) || jsonb_build_object('ok',true,'claimed',false,'already_claimed',true); END IF;
 SELECT count(*)::int+1 INTO n FROM public.ark60_daily_rewards WHERE student_id=p_student;
 n:=least(60,n);
 v_amount:=CASE WHEN n<=7 THEN n WHEN n IN (8,10,11,13,14,21,28,35,42,49,56,60) THEN 0 WHEN n%2=0 THEN 5 ELSE 3 END;
 INSERT INTO public.ark60_daily_rewards(student_id,reward_date,streak_day,amount) VALUES(p_student,p_today,n,v_amount);
 IF v_amount>0 THEN
  v_day:=greatest(1,least(60,(p_today-date '2026-10-01')+1));
  INSERT INTO public.ark60_coin_events(student_id,day_number,module,kind,amount) VALUES(p_student,v_day,'daily','daily_bonus',v_amount)
  ON CONFLICT(student_id,day_number,module,kind) DO NOTHING;
 END IF;
 RETURN public.ark60_reward_center_v2(p_student,p_today) || jsonb_build_object('ok',true,'claimed',true,'already_claimed',false,'amount',v_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.ark60_reward_center_v2(uuid,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ark60_claim_daily_reward_v2(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ark60_reward_center_v2(uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.ark60_claim_daily_reward_v2(uuid,date) TO service_role;
COMMIT;
