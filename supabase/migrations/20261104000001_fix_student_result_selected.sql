-- ============================================================================
-- Fix: get_student_result should always return qualification status in 'selected'
-- Date: 2026-11-04
-- The 'selected' field must indicate whether the student qualified (based on cut-off)
-- regardless of whether round 2 is enabled. The 'marks' field should be returned
-- for qualified students (selected = true) regardless of round 2 status.
-- ============================================================================

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
  v_cutoff_boys numeric := 20;
  v_cutoff_girls numeric := 25;
  v_boys_val text;
  v_girls_val text;
  v_round2_enabled text;
  v_round2_on boolean := false;
BEGIN
  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RETURN;
  END IF;

  v_norm_roll := public.to_en_digits(p_roll);
  IF v_norm_roll = '' THEN
    RETURN;
  END IF;

  SELECT qs.value INTO v_round2_enabled
  FROM public.quiz_settings qs
  WHERE qs.year = p_year AND qs.key = 'round2_enabled';
  v_round2_on := lower(trim(coalesce(v_round2_enabled, 'false'))) IN ('true', '1', 'yes');

  SELECT qs.value INTO v_boys_val
  FROM public.quiz_settings qs
  WHERE qs.year = p_year AND qs.key = 'round2_cutoff_boys';
  SELECT qs.value INTO v_girls_val
  FROM public.quiz_settings qs
  WHERE qs.year = p_year AND qs.key = 'round2_cutoff_girls';

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
  WHERE r.year = p_year
    AND public.to_en_digits(r.roll) = v_norm_roll
    AND (trim(coalesce(p_institution, '')) = '' OR r.institution ILIKE '%' || trim(p_institution) || '%')
  ORDER BY r.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_result(integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_result(integer, text, text) TO anon, authenticated, service_role;