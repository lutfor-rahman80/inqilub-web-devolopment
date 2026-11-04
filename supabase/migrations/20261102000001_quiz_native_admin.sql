-- ============================================================================
-- Migration: Seerat Quiz native admin
-- Date: 2026-11-02
--
-- Replaces the password based admin flow (public/quiz/index.html) with the
-- authenticated Next.js admin page at /admin/quiz.
--
--  * removes the plaintext admin password and every anon-executable admin RPC
--  * narrows the public column grants so marks/mobiles are not readable by anon
--  * gates staff reads behind has_permission() (which also enforces MFA)
--  * adds permission checked RPCs for saving results, cutoffs, the round-2
--    feature flag, round-2 marks and mobile-number reveal
--
-- The public student page keeps using get_student_result / get_quiz_* and the
-- safe quiz_results columns (roll, name, institution), which stay readable.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Remove the password based admin API
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_results_v2(text, boolean);
DROP FUNCTION IF EXISTS public.admin_list_results(text, boolean);
DROP FUNCTION IF EXISTS public.admin_get_mobile(text, bigint);
DROP FUNCTION IF EXISTS public.admin_set_cutoffs(text, numeric, numeric);
DROP FUNCTION IF EXISTS public.add_result(text, text, text, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.update_result(bigint, text, text, text, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.admin_set_round2(text, text, numeric, text, boolean);
DROP FUNCTION IF EXISTS public.verify_admin(text);

DELETE FROM public.quiz_settings WHERE key = 'admin_password';

-- Keep the defaults that the student page and the admin UI expect.
INSERT INTO public.quiz_settings (key, value) VALUES
  ('round2_enabled', 'false'),
  ('round2_cutoff_boys', '20'),
  ('round2_cutoff_girls', '25'),
  ('round2_max_marks', '30')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Grants
--    anon: only the columns the public student page actually selects.
--    authenticated: full rows, gated again by RLS + has_permission().
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.quiz_results FROM anon, authenticated, public;
REVOKE ALL ON public.quiz_settings FROM anon, authenticated, public;
REVOKE ALL ON public.round2_audit FROM anon, authenticated, public;

GRANT SELECT (id, year, roll, name, institution, gender, created_at)
  ON public.quiz_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;

-- quiz_settings no longer contains a secret; the student page reads key/value.
GRANT SELECT (key, value) ON public.quiz_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_settings TO authenticated;

GRANT SELECT, INSERT ON public.round2_audit TO authenticated;

GRANT ALL ON public.quiz_results TO service_role;
GRANT ALL ON public.quiz_settings TO service_role;
GRANT ALL ON public.round2_audit TO service_role;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "quiz_results_public_read" ON public.quiz_results;
DROP POLICY IF EXISTS "quiz_results_anon_read" ON public.quiz_results;
CREATE POLICY "quiz_results_anon_read" ON public.quiz_results
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "quiz_results_staff_read" ON public.quiz_results;
CREATE POLICY "quiz_results_staff_read" ON public.quiz_results
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_settings_public_read" ON public.quiz_settings;
DROP POLICY IF EXISTS "quiz_settings_anon_read" ON public.quiz_settings;
CREATE POLICY "quiz_settings_anon_read" ON public.quiz_settings
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "quiz_settings_staff_read" ON public.quiz_settings;
CREATE POLICY "quiz_settings_staff_read" ON public.quiz_settings
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

-- Write policies from 20261029000006 already allow quiz.manage/content.manage.
-- Re-create them here so this migration is self-contained and keeps the same
-- permission pair (including the MFA rule inside has_permission).
DROP POLICY IF EXISTS "quiz_results_manage_insert" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_insert" ON public.quiz_results
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_results_manage_update" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_update" ON public.quiz_results
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  )
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_results_manage_delete" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_delete" ON public.quiz_results
  FOR DELETE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_settings_manage_insert" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_insert" ON public.quiz_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_settings_manage_update" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_update" ON public.quiz_settings
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  )
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "round2_audit_manage_insert" ON public.round2_audit;
CREATE POLICY "round2_audit_manage_insert" ON public.round2_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "round2_audit_admin_read" ON public.round2_audit;
CREATE POLICY "round2_audit_admin_read" ON public.round2_audit
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

-- ----------------------------------------------------------------------------
-- 4. Admin RPC: add or update one result
--    p_id NULL = insert, otherwise update that row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_admin_save_result(
  p_id bigint DEFAULT NULL,
  p_roll text DEFAULT '',
  p_name text DEFAULT '',
  p_institution text DEFAULT '',
  p_gender text DEFAULT 'ছেলে',
  p_marks numeric DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_year integer DEFAULT 2026
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
  total_marks numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id bigint;
  v_year integer := coalesce(p_year, 2026);
  v_roll text := public.to_en_digits(p_roll);
  v_name text := trim(coalesce(p_name, ''));
  v_institution text := trim(coalesce(p_institution, ''));
  v_gender text := trim(coalesce(p_gender, ''));
  v_mobile text := trim(coalesce(p_mobile, ''));
  v_dupes integer;
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF v_roll = '' OR v_name = '' OR v_institution = '' THEN
    RAISE EXCEPTION 'MISSING_FIELDS';
  END IF;
  IF v_gender NOT IN ('ছেলে', 'মেয়ে') THEN
    RAISE EXCEPTION 'INVALID_GENDER';
  END IF;
  IF p_marks IS NULL OR p_marks < 0 THEN
    RAISE EXCEPTION 'INVALID_MARKS';
  END IF;
  IF v_mobile <> '' AND EXISTS (
    SELECT 1
    FROM regexp_split_to_table(v_mobile, '[,/;[:space:]]+') AS m
    WHERE m <> '' AND m !~ '^01[0-9]{9}$'
  ) THEN
    RAISE EXCEPTION 'INVALID_MOBILE';
  END IF;

  SELECT count(*) INTO v_dupes
  FROM public.quiz_results r
  WHERE r.year = v_year
    AND public.to_en_digits(r.roll) = v_roll
    AND (p_id IS NULL OR r.id <> p_id);
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_ROLL';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quiz_results (year, roll, name, institution, gender, marks, mobile)
    VALUES (v_year, v_roll, v_name, v_institution, v_gender, p_marks, nullif(v_mobile, ''))
    RETURNING id INTO v_id;
  ELSE
    v_id := NULL;
    UPDATE public.quiz_results
    SET roll = v_roll,
        name = v_name,
        institution = v_institution,
        gender = v_gender,
        marks = p_marks,
        mobile = nullif(v_mobile, '')
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'STUDENT_NOT_FOUND';
    END IF;
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
    r.mobile,
    r.round2_marks,
    r.round2_updated_at,
    CASE
      WHEN r.round2_marks IS NOT NULL THEN coalesce(r.marks, 0) + r.round2_marks
      ELSE NULL
    END AS total_marks,
    r.created_at
  FROM public.quiz_results r
  WHERE r.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_save_result(bigint, text, text, text, text, numeric, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_save_result(bigint, text, text, text, text, numeric, text, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Admin RPC: cutoffs and feature flag
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_admin_set_cutoffs(
  p_boys numeric,
  p_girls numeric,
  p_max_marks numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF p_boys IS NULL OR p_girls IS NULL OR p_boys < 0 OR p_girls < 0 THEN
    RAISE EXCEPTION 'INVALID_CUTOFF';
  END IF;
  IF p_max_marks IS NOT NULL AND p_max_marks <= 0 THEN
    RAISE EXCEPTION 'INVALID_CUTOFF';
  END IF;

  INSERT INTO public.quiz_settings (key, value, updated_at)
  VALUES ('round2_cutoff_boys', p_boys::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.quiz_settings (key, value, updated_at)
  VALUES ('round2_cutoff_girls', p_girls::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  IF p_max_marks IS NOT NULL THEN
    INSERT INTO public.quiz_settings (key, value, updated_at)
    VALUES ('round2_max_marks', p_max_marks::text, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_set_cutoffs(numeric, numeric, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_cutoffs(numeric, numeric, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.quiz_admin_set_round2_enabled(p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.quiz_settings (key, value, updated_at)
  VALUES ('round2_enabled', CASE WHEN p_enabled THEN 'true' ELSE 'false' END, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_set_round2_enabled(boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_round2_enabled(boolean) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Admin RPC: round-2 entry (qualification, overwrite check, audit log)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_admin_set_round2(
  p_roll text,
  p_round2_marks numeric,
  p_mobile text DEFAULT NULL,
  p_overwrite boolean DEFAULT false,
  p_year integer DEFAULT 2026
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
  v_year integer := coalesce(p_year, 2026);
  v_roll text := public.to_en_digits(p_roll);
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
  v_max_marks numeric := 30;
  v_boys_val text;
  v_girls_val text;
  v_max_val text;
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  SELECT value INTO v_r2_enabled FROM public.quiz_settings WHERE key = 'round2_enabled';
  IF v_r2_enabled IS NULL OR lower(trim(v_r2_enabled)) NOT IN ('true', '1', 'yes') THEN
    RAISE EXCEPTION 'ROUND2_DISABLED';
  END IF;

  IF v_roll = '' THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.quiz_results r
  WHERE r.year = v_year AND public.to_en_digits(r.roll) = v_roll;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  ELSIF v_count > 1 THEN
    RAISE EXCEPTION 'AMBIGUOUS_ROLL';
  END IF;

  SELECT r.id, r.gender, r.marks, r.round2_marks, r.mobile
  INTO v_target_id, v_gender, v_r1_marks, v_old_r2, v_current_mobile
  FROM public.quiz_results r
  WHERE r.year = v_year AND public.to_en_digits(r.roll) = v_roll;

  SELECT value INTO v_boys_val FROM public.quiz_settings WHERE key = 'round2_cutoff_boys';
  SELECT value INTO v_girls_val FROM public.quiz_settings WHERE key = 'round2_cutoff_girls';
  SELECT value INTO v_max_val FROM public.quiz_settings WHERE key = 'round2_max_marks';
  IF v_boys_val IS NOT NULL AND trim(v_boys_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_boys := trim(v_boys_val)::numeric;
  END IF;
  IF v_girls_val IS NOT NULL AND trim(v_girls_val) ~ '^\d+(\.\d+)?$' THEN
    v_cutoff_girls := trim(v_girls_val)::numeric;
  END IF;
  IF v_max_val IS NOT NULL AND trim(v_max_val) ~ '^\d+(\.\d+)?$' AND trim(v_max_val)::numeric > 0 THEN
    v_max_marks := trim(v_max_val)::numeric;
  END IF;

  IF NOT (
    (v_gender = 'মেয়ে' AND coalesce(v_r1_marks, 0) >= v_cutoff_girls)
    OR (v_gender = 'ছেলে' AND coalesce(v_r1_marks, 0) >= v_cutoff_boys)
  ) THEN
    RAISE EXCEPTION 'STUDENT_NOT_QUALIFIED';
  END IF;

  IF p_round2_marks IS NULL OR p_round2_marks < 0 THEN
    RAISE EXCEPTION 'INVALID_MARKS';
  END IF;
  IF p_round2_marks > v_max_marks THEN
    RAISE EXCEPTION 'ROUND2_MARKS_EXCEEDED';
  END IF;

  IF v_old_r2 IS NOT NULL AND NOT coalesce(p_overwrite, false) THEN
    RAISE EXCEPTION 'ROUND2_EXISTS';
  END IF;

  v_new_mobile := v_current_mobile;
  IF p_mobile IS NOT NULL AND trim(p_mobile) <> '' THEN
    IF trim(p_mobile) !~ '^01[3-9][0-9]{8}$' THEN
      RAISE EXCEPTION 'INVALID_MOBILE';
    END IF;
    IF v_new_mobile IS NULL OR trim(v_new_mobile) = '' THEN
      v_new_mobile := trim(p_mobile);
    ELSIF position(trim(p_mobile) in v_new_mobile) = 0 THEN
      v_new_mobile := v_new_mobile || ', ' || trim(p_mobile);
    END IF;
  END IF;

  UPDATE public.quiz_results
  SET round2_marks = p_round2_marks,
      round2_updated_at = now(),
      mobile = v_new_mobile
  WHERE id = v_target_id;

  INSERT INTO public.round2_audit (
    student_id, roll, old_round2_marks, new_round2_marks, mobile_added
  ) VALUES (
    v_target_id, v_roll, v_old_r2, p_round2_marks, nullif(trim(coalesce(p_mobile, '')), '')
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

REVOKE ALL ON FUNCTION public.quiz_admin_set_round2(text, numeric, text, boolean, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_round2(text, numeric, text, boolean, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Admin RPC: reveal mobile numbers (all, or one row when p_id is given)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_admin_mobiles(
  p_id bigint DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  mobile text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.mobile
  FROM public.quiz_results r
  WHERE (p_year IS NULL OR r.year = p_year)
    AND (p_id IS NULL OR r.id = p_id)
  ORDER BY r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_mobiles(bigint, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_mobiles(bigint, integer) TO authenticated, service_role;
