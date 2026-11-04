-- ============================================================================
-- Fix: get_institution_students - use regex for Bengali text search
-- Date: 2026-11-04
-- PostgreSQL lower() doesn't work well with Bengali (no case distinction).
-- Use ~* (case-insensitive regex) for reliable substring search.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_institution_students(
  p_year integer DEFAULT 2026,
  p_institution text DEFAULT ''
)
RETURNS TABLE (
  roll text,
  name text,
  institution text,
  year integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.roll,
    r.name,
    r.institution,
    r.year
  FROM public.quiz_results r
  WHERE r.year = p_year
    AND (
      trim(coalesce(p_institution, '')) = ''
      OR r.institution ~* trim(p_institution)
    )
  ORDER BY
    CASE WHEN public.to_en_digits(r.roll) ~ '^\d+$' THEN public.to_en_digits(r.roll)::bigint ELSE 999999 END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;