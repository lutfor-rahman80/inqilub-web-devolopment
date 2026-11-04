-- ============================================================================
-- Migration: Seerat Quiz Admin & Protected RPC Functions
-- Adds verify_admin, admin_list_results, admin_set_cutoffs, add_result,
-- update_result, admin_get_mobile, and admin_set_round2.
-- ============================================================================

-- 1. Ensure default admin password exists in quiz_settings (change 'admin123' if desired)
INSERT INTO public.quiz_settings (key, value)
VALUES ('admin_password', 'admin123')
ON CONFLICT (key) DO NOTHING;

-- 2. RPC: verify_admin (Verifies admin password)
CREATE OR REPLACE FUNCTION public.verify_admin(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stored_pw text;
BEGIN
  SELECT value INTO v_stored_pw
  FROM public.quiz_settings
  WHERE key = 'admin_password';

  IF v_stored_pw IS NOT NULL AND trim(p_password) = trim(v_stored_pw) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin(text) TO anon, authenticated, service_role;

-- 3. RPC: admin_list_results and admin_list_results_v2
CREATE OR REPLACE FUNCTION public.admin_list_results(
  p_password text,
  p_with_mobile boolean DEFAULT false
)
RETURNS TABLE (
  id bigint,
  year integer,
  roll text,
  name text,
  institution text,
  gender text,
  marks numeric,
  mobile text,
  round2_marks numeric,
  round2_updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.year,
    r.roll,
    r.name,
    r.institution,
    r.gender,
    r.marks,
    CASE WHEN p_with_mobile THEN r.mobile ELSE NULL END AS mobile,
    r.round2_marks,
    r.round2_updated_at,
    r.created_at
  FROM public.quiz_results r
  ORDER BY 
    CASE 
      WHEN public.to_en_digits(r.roll) ~ '^\d+$' 
      THEN public.to_en_digits(r.roll)::bigint 
      ELSE 999999 
    END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_results(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_results(text, boolean) TO anon, authenticated, service_role;

-- Alias for v2
CREATE OR REPLACE FUNCTION public.admin_list_results_v2(
  p_password text,
  p_with_mobile boolean DEFAULT false
)
RETURNS TABLE (
  id bigint,
  year integer,
  roll text,
  name text,
  institution text,
  gender text,
  marks numeric,
  mobile text,
  round2_marks numeric,
  round2_updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.admin_list_results(p_password, p_with_mobile);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_results_v2(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_results_v2(text, boolean) TO anon, authenticated, service_role;

-- 4. RPC: admin_get_mobile
CREATE OR REPLACE FUNCTION public.admin_get_mobile(
  p_password text,
  p_id bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mobile text;
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  SELECT mobile INTO v_mobile
  FROM public.quiz_results
  WHERE id = p_id;

  RETURN v_mobile;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_mobile(text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_mobile(text, bigint) TO anon, authenticated, service_role;

-- 5. RPC: admin_set_cutoffs
CREATE OR REPLACE FUNCTION public.admin_set_cutoffs(
  p_password text,
  p_boys numeric,
  p_girls numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  INSERT INTO public.quiz_settings (key, value, updated_at)
  VALUES ('round2_cutoff_boys', p_boys::text, now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.quiz_settings (key, value, updated_at)
  VALUES ('round2_cutoff_girls', p_girls::text, now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_cutoffs(text, numeric, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_cutoffs(text, numeric, numeric) TO anon, authenticated, service_role;

-- 6. RPC: add_result
CREATE OR REPLACE FUNCTION public.add_result(
  p_password text,
  p_roll text,
  p_name text,
  p_institution text,
  p_marks numeric,
  p_mobile text DEFAULT NULL,
  p_gender text DEFAULT 'ছেলে'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_id bigint;
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  INSERT INTO public.quiz_results (
    year, roll, name, institution, gender, marks, mobile
  ) VALUES (
    2026, trim(p_roll), trim(p_name), trim(p_institution), trim(p_gender), p_marks, trim(p_mobile)
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_result(text, text, text, text, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.add_result(text, text, text, text, numeric, text, text) TO anon, authenticated, service_role;

-- 7. RPC: update_result
CREATE OR REPLACE FUNCTION public.update_result(
  p_id bigint,
  p_password text,
  p_roll text,
  p_name text,
  p_institution text,
  p_marks numeric,
  p_mobile text DEFAULT NULL,
  p_gender text DEFAULT 'ছেলে'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  UPDATE public.quiz_results
  SET 
    roll = trim(p_roll),
    name = trim(p_name),
    institution = trim(p_institution),
    gender = trim(p_gender),
    marks = p_marks,
    mobile = trim(p_mobile)
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.update_result(bigint, text, text, text, text, numeric, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_result(bigint, text, text, text, text, numeric, text, text) TO anon, authenticated, service_role;

-- 8. RPC: admin_set_round2
CREATE OR REPLACE FUNCTION public.admin_set_round2(
  p_password text,
  p_roll text,
  p_round2_marks numeric,
  p_mobile text DEFAULT NULL,
  p_overwrite boolean DEFAULT false
)
RETURNS TABLE (
  id bigint,
  roll text,
  name text,
  round2_marks numeric,
  total_marks numeric,
  mobile text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_r2_enabled text;
  v_target_id bigint;
  v_old_r2 numeric;
  v_current_mobile text;
  v_new_mobile text;
  v_count integer;
  v_gender text;
  v_r1_marks numeric;
  v_cutoff_boys numeric := 20;
  v_cutoff_girls numeric := 25;
  v_boys_val text;
  v_girls_val text;
BEGIN
  IF NOT public.verify_admin(p_password) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  -- 1. Check if round2 is enabled
  SELECT value INTO v_r2_enabled FROM public.quiz_settings WHERE key = 'round2_enabled';
  IF v_r2_enabled IS NULL OR lower(trim(v_r2_enabled)) NOT IN ('true', '1', 'yes') THEN
    RAISE EXCEPTION 'round2_disabled';
  END IF;

  -- 2. Find student
  SELECT count(*) INTO v_count
  FROM public.quiz_results
  WHERE year = 2026 AND public.to_en_digits(roll) = public.to_en_digits(p_roll);

  IF v_count = 0 THEN
    RAISE EXCEPTION 'student_not_found';
  ELSIF v_count > 1 THEN
    RAISE EXCEPTION 'ambiguous_roll';
  END IF;

  SELECT r.id, r.gender, r.marks, r.round2_marks, r.mobile
  INTO v_target_id, v_gender, v_r1_marks, v_old_r2, v_current_mobile
  FROM public.quiz_results r
  WHERE r.year = 2026 AND public.to_en_digits(r.roll) = public.to_en_digits(p_roll);

  -- 3. Qualification check
  SELECT value INTO v_boys_val FROM public.quiz_settings WHERE key = 'round2_cutoff_boys';
  SELECT value INTO v_girls_val FROM public.quiz_settings WHERE key = 'round2_cutoff_girls';
  IF v_boys_val IS NOT NULL AND trim(v_boys_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_boys := trim(v_boys_val)::numeric;
  END IF;
  IF v_girls_val IS NOT NULL AND trim(v_girls_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_girls := trim(v_girls_val)::numeric;
  END IF;

  IF NOT (
    (v_gender = 'মেয়ে' AND coalesce(v_r1_marks, 0) >= v_cutoff_girls)
    OR (v_gender = 'ছেলে' AND coalesce(v_r1_marks, 0) >= v_cutoff_boys)
  ) THEN
    RAISE EXCEPTION 'student_not_qualified';
  END IF;

  -- 4. Overwrite check
  IF v_old_r2 IS NOT NULL AND NOT p_overwrite THEN
    RAISE EXCEPTION 'round2_exists';
  END IF;

  -- 5. Mobile update
  v_new_mobile := v_current_mobile;
  IF p_mobile IS NOT NULL AND trim(p_mobile) <> '' THEN
    IF v_new_mobile IS NULL OR trim(v_new_mobile) = '' THEN
      v_new_mobile := trim(p_mobile);
    ELSIF position(trim(p_mobile) in v_new_mobile) = 0 THEN
      v_new_mobile := v_new_mobile || ', ' || trim(p_mobile);
    END IF;
  END IF;

  -- 6. Update student
  UPDATE public.quiz_results
  SET 
    round2_marks = p_round2_marks,
    round2_updated_at = now(),
    mobile = v_new_mobile
  WHERE id = v_target_id;

  -- 7. Audit log
  INSERT INTO public.round2_audit (
    student_id, roll, old_round2_marks, new_round2_marks, mobile_added
  ) VALUES (
    v_target_id, p_roll, v_old_r2, p_round2_marks, p_mobile
  );

  RETURN QUERY
  SELECT 
    r.id,
    r.roll,
    r.name,
    r.round2_marks,
    (coalesce(r.marks, 0) + coalesce(r.round2_marks, 0)) AS total_marks,
    r.mobile
  FROM public.quiz_results r
  WHERE r.id = v_target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_round2(text, text, numeric, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_round2(text, text, numeric, text, boolean) TO anon, authenticated, service_role;

