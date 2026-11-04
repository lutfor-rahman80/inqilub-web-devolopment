-- ============================================================================
-- Fix: Grant full SELECT on quiz_results to anon/authenticated
-- Marks are filtered/hidden at the RPC level (get_student_result only returns
-- marks when student is selected/qualified). Column-level GRANT was too
-- restrictive and prevented SECURITY DEFINER RPCs from functioning properly.
-- ============================================================================

-- Give anon/authenticated full SELECT (marks filtering is done in RPC)
REVOKE SELECT ON public.quiz_results FROM anon, authenticated;
GRANT SELECT ON public.quiz_results TO anon, authenticated;

-- Ensure service_role retains full access
GRANT ALL ON public.quiz_results TO service_role;
GRANT ALL ON public.quiz_settings TO service_role;
GRANT ALL ON public.round2_audit TO service_role;

