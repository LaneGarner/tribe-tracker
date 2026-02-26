-- Fix Supabase Security Advisor errors and warnings
-- 3 errors: RLS disabled on enterprise tables
-- 3 warnings: Function search path mutable

-- Enable RLS on enterprise tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Districts: authenticated users can read (children users need access)
CREATE POLICY "Authenticated users can read districts"
  ON public.districts FOR SELECT TO authenticated USING (true);

-- Buildings: authenticated users can read (children users need access)
CREATE POLICY "Authenticated users can read buildings"
  ON public.buildings FOR SELECT TO authenticated USING (true);

-- Feature toggles: authenticated users can read
CREATE POLICY "Authenticated users can read feature toggles"
  ON public.feature_toggles FOR SELECT TO authenticated USING (true);

-- Fix function search paths (prevents search_path injection attacks)
ALTER FUNCTION public.increment_participant_count(UUID) SET search_path = '';
ALTER FUNCTION public.decrement_participant_count(UUID) SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
