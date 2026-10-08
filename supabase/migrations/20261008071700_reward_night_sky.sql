-- Add the day-13 scenic collectible without changing claims or coin balances.
ALTER TABLE public.ark60_cosmetics DROP CONSTRAINT IF EXISTS ark60_cosmetics_theme_check;
ALTER TABLE public.ark60_cosmetics ADD CONSTRAINT ark60_cosmetics_theme_check CHECK (theme IN ('dawn','ocean','forest','night-sky'));
