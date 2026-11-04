-- ============================================================================
-- Migration: Seerat Quiz (সীরাত কুইজ) Schema, Results, and Multi-Year Support
-- Date: 2026-10-29
-- Supports querying by Year (সাল), Institution (প্রতিষ্ঠান), and Roll (রোল).
-- ============================================================================

-- 1. Table: quiz_results
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year integer NOT NULL DEFAULT 2026,
  roll text NOT NULL,
  name text NOT NULL,
  institution text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('ছেলে', 'মেয়ে')),
  marks numeric(5,2),
  mobile text,
  round2_marks numeric(5,2),
  round2_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_year_inst ON public.quiz_results(year, institution);
CREATE INDEX IF NOT EXISTS idx_quiz_results_year_roll ON public.quiz_results(year, roll);
CREATE INDEX IF NOT EXISTS idx_quiz_results_inst ON public.quiz_results(institution);

-- 2. Table: quiz_settings
CREATE TABLE IF NOT EXISTS public.quiz_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.quiz_settings (key, value) VALUES
  ('round2_enabled', 'false'),
  ('round2_cutoff_boys', '20'),
  ('round2_cutoff_girls', '25'),
  ('round2_max_marks', '30')
ON CONFLICT (key) DO NOTHING;

-- 3. Table: round2_audit
CREATE TABLE IF NOT EXISTS public.round2_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id bigint NOT NULL,
  roll text NOT NULL,
  old_round2_marks numeric,
  new_round2_marks numeric,
  mobile_added text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Row Level Security
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round2_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quiz_results FROM anon, authenticated, public;
REVOKE ALL ON public.quiz_settings FROM anon, authenticated, public;
REVOKE ALL ON public.round2_audit FROM anon, authenticated, public;

-- Anon and authenticated can only see non-sensitive student columns
GRANT SELECT (id, year, roll, name, institution, gender, created_at) ON public.quiz_results TO anon, authenticated;
GRANT SELECT ON public.quiz_settings TO anon, authenticated;

-- Service role has full management
GRANT ALL ON public.quiz_results TO service_role;
GRANT ALL ON public.quiz_settings TO service_role;
GRANT ALL ON public.round2_audit TO service_role;

-- 5. Helper Function: to_en_digits (English digits)
CREATE OR REPLACE FUNCTION public.to_en_digits(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(coalesce(trim(p_text), ''), '০১২৩৪৫৬৭৮৯', '0123456789');
$$;

-- 6. RPC: get_student_result (Protected: only shows marks if qualified)
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
  v_target_year integer := coalesce(p_year, 2026);
  v_cutoff_boys numeric := 20;
  v_cutoff_girls numeric := 25;
  v_boys_val text;
  v_girls_val text;
BEGIN
  v_norm_roll := public.to_en_digits(p_roll);
  IF v_norm_roll = '' THEN
    RETURN;
  END IF;

  SELECT value INTO v_boys_val FROM public.quiz_settings WHERE key = 'round2_cutoff_boys';
  SELECT value INTO v_girls_val FROM public.quiz_settings WHERE key = 'round2_cutoff_girls';
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
    AND (trim(coalesce(p_institution, '')) = '' OR r.institution ILIKE '%' || trim(p_institution) || '%')
  ORDER BY r.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_result(integer, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_result(integer, text, text) TO anon, authenticated, service_role;

-- 7. RPC: get_institution_students
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
  v_target_year integer := coalesce(p_year, 2026);
BEGIN
  RETURN QUERY
  SELECT 
    r.roll,
    r.name,
    r.institution,
    r.year
  FROM public.quiz_results r
  WHERE r.year = v_target_year
    AND r.institution ILIKE '%' || trim(p_institution) || '%'
  ORDER BY 
    CASE WHEN public.to_en_digits(r.roll) ~ '^\d+$' THEN public.to_en_digits(r.roll)::bigint ELSE 999999 END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;

-- 8. RPC: get_quiz_institutions
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

-- 9. RPC: get_quiz_years
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

