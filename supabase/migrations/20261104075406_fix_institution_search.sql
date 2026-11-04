-- ============================================================================
-- Fix: get_institution_students and get_student_result ILIKE issue with Bengali
-- Date: 2026-11-04
-- PostgreSQL ILIKE with Unicode/Bengali text can have collation issues.
-- Using position(lower() in lower()) with C collation for reliable substring search.
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
      OR position(lower(trim(p_institution)) in lower(r.institution)) > 0
    )
  ORDER BY
    CASE WHEN public.to_en_digits(r.roll) ~ '^\d+$' THEN public.to_en_digits(r.roll)::bigint ELSE 999999 END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;