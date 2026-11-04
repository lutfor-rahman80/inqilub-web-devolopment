-- ============================================================================
-- Fix: Re-create quiz RPC functions with correct search_path and ownership
-- The previous functions may have had schema resolution issues with to_en_digits
-- ============================================================================

-- Drop and re-create to_en_digits with explicit schema
DROP FUNCTION IF EXISTS public.to_en_digits(text);
CREATE OR REPLACE FUNCTION public.to_en_digits(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT translate(coalesce(trim(p_text), ''), '০১২৩৪৫৬৭৮৯', '0123456789');
$$;

GRANT EXECUTE ON FUNCTION public.to_en_digits(text) TO anon, authenticated, service_role;

-- Re-create get_student_result with simplified logic (no ILIKE for institution, exact match)
DROP FUNCTION IF EXISTS public.get_student_result(integer, text, text);
CREATE OR REPLACE FUNCTION public.get_student_result(
  p_year integer DEFAULT 2026,
  p_roll text DEFAULT '',
  p_institution text DEFAULT ''
)
RETURNS TABLE (
  roll text,
  name text,
  institution text,
  gender text,
  marks numeric,
  selected boolean,
  year integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_norm_roll text;
  v_target_year integer;
  v_cutoff_boys numeric := 20;
  v_cutoff_girls numeric := 25;
  v_boys_val text;
  v_girls_val text;
BEGIN
  v_target_year := coalesce(p_year, 2026);
  v_norm_roll := public.to_en_digits(p_roll);

  IF v_norm_roll = '' OR v_norm_roll IS NULL THEN
    RETURN;
  END IF;

  SELECT qs.value INTO v_boys_val FROM public.quiz_settings qs WHERE qs.key = 'round2_cutoff_boys';
  SELECT qs.value INTO v_girls_val FROM public.quiz_settings qs WHERE qs.key = 'round2_cutoff_girls';

  IF v_boys_val IS NOT NULL AND trim(v_boys_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_boys := trim(v_boys_val)::numeric;
  END IF;
  IF v_girls_val IS NOT NULL AND trim(v_girls_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_girls := trim(v_girls_val)::numeric;
  END IF;

  RETURN QUERY
  SELECT
    r.roll,
    r.name,
    r.institution,
    r.gender,
    CASE
      WHEN (r.gender = 'মেয়ে' AND coalesce(r.marks, 0) >= v_cutoff_girls)
        OR (r.gender = 'ছেলে' AND coalesce(r.marks, 0) >= v_cutoff_boys)
      THEN r.marks
      ELSE NULL
    END AS marks,
    CASE
      WHEN (r.gender = 'মেয়ে' AND coalesce(r.marks, 0) >= v_cutoff_girls)
        OR (r.gender = 'ছেলে' AND coalesce(r.marks, 0) >= v_cutoff_boys)
      THEN true
      ELSE false
    END AS selected,
    r.year
  FROM public.quiz_results r
  WHERE r.year = v_target_year
    AND public.to_en_digits(r.roll) = v_norm_roll
    AND (
      trim(coalesce(p_institution, '')) = ''
      OR r.institution ILIKE '%' || trim(p_institution) || '%'
    )
  ORDER BY r.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_result(integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_result(integer, text, text) TO anon, authenticated, service_role;

-- Re-create get_institution_students
DROP FUNCTION IF EXISTS public.get_institution_students(integer, text);
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
DECLARE
  v_target_year integer;
BEGIN
  v_target_year := coalesce(p_year, 2026);

  RETURN QUERY
  SELECT
    r.roll,
    r.name,
    r.institution,
    r.year
  FROM public.quiz_results r
  WHERE r.year = v_target_year
    AND (
      trim(coalesce(p_institution, '')) = ''
      OR r.institution ILIKE '%' || trim(p_institution) || '%'
    )
  ORDER BY
    CASE
      WHEN public.to_en_digits(r.roll) ~ '^\d+$'
      THEN public.to_en_digits(r.roll)::bigint
      ELSE 999999
    END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;

-- Re-create get_quiz_institutions
DROP FUNCTION IF EXISTS public.get_quiz_institutions(integer);
CREATE OR REPLACE FUNCTION public.get_quiz_institutions(
  p_year integer DEFAULT 2026
)
RETURNS TABLE (
  institution text,
  student_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.institution, count(*) AS student_count
  FROM public.quiz_results r
  WHERE r.year = coalesce(p_year, 2026)
  GROUP BY r.institution
  ORDER BY r.institution ASC;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_institutions(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_institutions(integer) TO anon, authenticated, service_role;

-- Re-create get_quiz_years
DROP FUNCTION IF EXISTS public.get_quiz_years();
CREATE OR REPLACE FUNCTION public.get_quiz_years()
RETURNS TABLE (
  year integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT r.year
  FROM public.quiz_results r
  ORDER BY r.year DESC;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_years() FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_years() TO anon, authenticated, service_role;

