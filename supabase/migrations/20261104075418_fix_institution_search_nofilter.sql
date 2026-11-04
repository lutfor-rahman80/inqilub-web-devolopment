-- ============================================================================
-- Fix: get_institution_students - remove institution filter, filter in frontend
-- Date: 2026-11-04
-- PostgreSQL LIKE/strpos has issues with Bengali Unicode. Return all students
-- for the year and let the frontend filter by institution.
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
  ORDER BY
    CASE WHEN public.to_en_digits(r.roll) ~ '^\d+$' THEN public.to_en_digits(r.roll)::bigint ELSE 999999 END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;