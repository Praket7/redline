ALTER TABLE public.redline_authority_matches_v140 ADD COLUMN IF NOT EXISTS environment_breaks text GENERATED ALWAYS AS (coalesce(results->0->>'environment_breaks','0')) STORED;
REVOKE INSERT,UPDATE,DELETE ON public.redline_authority_matches_v140 FROM anon,authenticated;
