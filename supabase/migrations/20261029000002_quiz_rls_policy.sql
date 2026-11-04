-- ============================================================================
-- Fix: Add RLS SELECT policy for quiz_results so anon users can read data
-- (Required for SECURITY DEFINER RPCs to query the table successfully)
-- ============================================================================

-- Allow public (anon + authenticated) to read quiz_results rows
-- Sensitive columns (marks, mobile) are already restricted via column-level GRANT
DROP POLICY IF EXISTS "quiz_results_public_read" ON public.quiz_results;
CREATE POLICY "quiz_results_public_read"
  ON public.quiz_results
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public to read quiz_settings (needed for cutoff values in get_student_result)
DROP POLICY IF EXISTS "quiz_settings_public_read" ON public.quiz_settings;
CREATE POLICY "quiz_settings_public_read"
  ON public.quiz_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

