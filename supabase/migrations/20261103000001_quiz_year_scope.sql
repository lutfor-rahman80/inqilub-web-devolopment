-- ============================================================================
-- Migration: Seerat Quiz year scope
-- Date: 2026-11-03
--
--  * every quiz year is an explicit row in public.quiz_years, so an empty
--    year can be created before its first result exists
--  * quiz_settings becomes per-year: primary key (year, key)
--  * all admin RPCs require a valid year and enforce it again in the data
--    layer (updates/deletes cannot move or touch a row from another year)
--  * the public RPCs return data for the requested year only and hide the
--    round-2 selection until round 2 is enabled for that year
--  * the obsolete "round2_max_marks" setting is removed
--  * writes get an audit entry with year, actor and old/new values (mobile
--    and name stay private, as before)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Years
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_years (
  year integer PRIMARY KEY CHECK (year BETWEEN 2000 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.quiz_years (year)
SELECT DISTINCT year FROM public.quiz_results
ON CONFLICT (year) DO NOTHING;

-- The current data is the 2026 edition.
INSERT INTO public.quiz_years (year) VALUES (2026)
ON CONFLICT (year) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Per-year settings
-- ----------------------------------------------------------------------------
ALTER TABLE public.quiz_settings ADD COLUMN IF NOT EXISTS year integer;
UPDATE public.quiz_settings SET year = 2026 WHERE year IS NULL;
ALTER TABLE public.quiz_settings ALTER COLUMN year SET DEFAULT 2026;
ALTER TABLE public.quiz_settings ALTER COLUMN year SET NOT NULL;

INSERT INTO public.quiz_years (year)
SELECT DISTINCT year FROM public.quiz_settings
ON CONFLICT (year) DO NOTHING;

ALTER TABLE public.quiz_settings DROP CONSTRAINT IF EXISTS quiz_settings_pkey;
ALTER TABLE public.quiz_settings ADD CONSTRAINT quiz_settings_pkey PRIMARY KEY (year, key);

ALTER TABLE public.quiz_settings DROP CONSTRAINT IF EXISTS quiz_settings_year_fkey;
ALTER TABLE public.quiz_settings
  ADD CONSTRAINT quiz_settings_year_fkey
  FOREIGN KEY (year) REFERENCES public.quiz_years(year) ON DELETE CASCADE;

-- The max-marks field is gone from the admin UI; it was only used to cap
-- round-2 marks, so the cap and its stored setting are removed too.
DELETE FROM public.quiz_settings WHERE key = 'round2_max_marks';

-- Give every known year the defaults it needs. Existing values are kept.
INSERT INTO public.quiz_settings (year, key, value, updated_at)
SELECT y.year, d.key, d.value, now()
FROM public.quiz_years y
CROSS JOIN (
  VALUES
    ('round2_enabled', 'false'),
    ('round2_cutoff_boys', '20'),
    ('round2_cutoff_girls', '25')
) AS d(key, value)
ON CONFLICT (year, key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Round-2 audit gets the year and the acting user
-- ----------------------------------------------------------------------------
ALTER TABLE public.round2_audit ADD COLUMN IF NOT EXISTS year integer;
UPDATE public.round2_audit SET year = 2026 WHERE year IS NULL;
ALTER TABLE public.round2_audit ADD COLUMN IF NOT EXISTS changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 4. Grants and RLS
--    The public pages use SECURITY DEFINER RPCs only, so anon no longer needs
--    direct table access (and therefore cannot page through another year).
-- ----------------------------------------------------------------------------
ALTER TABLE public.quiz_years ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.quiz_results FROM anon, authenticated, public;
REVOKE ALL ON public.quiz_settings FROM anon, authenticated, public;
REVOKE ALL ON public.quiz_years FROM anon, authenticated, public;
REVOKE ALL ON public.round2_audit FROM anon, authenticated, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_settings TO authenticated;
GRANT SELECT ON public.quiz_years TO authenticated;
GRANT SELECT, INSERT ON public.round2_audit TO authenticated;

GRANT ALL ON public.quiz_results TO service_role;
GRANT ALL ON public.quiz_settings TO service_role;
GRANT ALL ON public.quiz_years TO service_role;
GRANT ALL ON public.round2_audit TO service_role;

DROP POLICY IF EXISTS "quiz_years_staff_read" ON public.quiz_years;
CREATE POLICY "quiz_years_staff_read" ON public.quiz_years
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

-- Keep the staff management policies from the native admin migration, but
-- re-create them here so this migration is self-contained.
DROP POLICY IF EXISTS "quiz_results_staff_read" ON public.quiz_results;
CREATE POLICY "quiz_results_staff_read" ON public.quiz_results
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  );

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

DROP POLICY IF EXISTS "quiz_settings_staff_read" ON public.quiz_settings;
CREATE POLICY "quiz_settings_staff_read" ON public.quiz_settings
  FOR SELECT TO authenticated
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
-- 5. Audit triggers for quiz data
--    One entry per changed row, with the year, the actor and old/new values.
--    Name and mobile are personal data and are never copied into the log.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.audit_quiz_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor   uuid := (select auth.uid());
  v_name    text;
  v_old     jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new     jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_private text[] := array['name', 'mobile'];
  v_skip    text[] := array['created_at', 'updated_at', 'round2_updated_at'];
  v_changed text[] := '{}';
  v_values  jsonb := '{}'::jsonb;
  v_old_values jsonb := '{}'::jsonb;
  v_new_values jsonb := '{}'::jsonb;
  v_entity_id text;
  v_year    integer;
  k         text;
BEGIN
  if v_actor is not null then
    select full_name into v_name from public.staff_profiles where id = v_actor;
  end if;

  for k in select jsonb_object_keys(v_row) loop
    continue when k = any(v_skip);
    if tg_op = 'UPDATE' and (v_old -> k) is not distinct from (v_new -> k) then
      continue;
    end if;
    v_changed := v_changed || k;
    if not (k = any(v_private)) then
      if v_new is not null then
        v_values := v_values || jsonb_build_object(k, v_new -> k);
        v_new_values := v_new_values || jsonb_build_object(k, v_new -> k);
      end if;
      if v_old is not null then
        v_old_values := v_old_values || jsonb_build_object(k, v_old -> k);
      end if;
    end if;
  end loop;

  if tg_op = 'UPDATE' and cardinality(v_changed) = 0 then
    return new;
  end if;

  if (v_row ->> 'year') ~ '^\d+$' then
    v_year := (v_row ->> 'year')::integer;
  end if;

  if tg_table_name = 'quiz_settings' then
    v_entity_id := coalesce(v_row ->> 'year', '') || ':' || coalesce(v_row ->> 'key', '');
  else
    v_entity_id := coalesce(v_row ->> 'id', v_row ->> 'year');
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, details)
  values (
    v_actor,
    v_name,
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object(
      'changed', to_jsonb(v_changed),
      'values', v_values,
      'old_values', v_old_values,
      'new_values', v_new_values,
      'year', v_year
    )
  );
  return coalesce(new, old);
end;
$$;

REVOKE ALL ON FUNCTION private.audit_quiz_change() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_results_audit ON public.quiz_results;
CREATE TRIGGER quiz_results_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_results
  FOR EACH ROW EXECUTE FUNCTION private.audit_quiz_change();

DROP TRIGGER IF EXISTS quiz_settings_audit ON public.quiz_settings;
CREATE TRIGGER quiz_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_settings
  FOR EACH ROW EXECUTE FUNCTION private.audit_quiz_change();

DROP TRIGGER IF EXISTS quiz_years_audit ON public.quiz_years;
CREATE TRIGGER quiz_years_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.quiz_years
  FOR EACH ROW EXECUTE FUNCTION private.audit_quiz_change();

-- ----------------------------------------------------------------------------
-- 6. Public RPCs (year validated, scoped, no admin data)
-- ----------------------------------------------------------------------------
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
      WHEN v_round2_on AND (
        (r.gender = 'মেয়ে' AND coalesce(r.marks, 0) >= v_cutoff_girls)
        OR (r.gender = 'ছেলে' AND coalesce(r.marks, 0) >= v_cutoff_boys)
      ) THEN r.marks
      ELSE NULL
    END AS marks,
    CASE
      WHEN NOT v_round2_on THEN NULL
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
    AND r.institution ILIKE '%' || trim(p_institution) || '%'
  ORDER BY
    CASE WHEN public.to_en_digits(r.roll) ~ '^\d+$' THEN public.to_en_digits(r.roll)::bigint ELSE 999999 END ASC,
    r.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_students(integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_institution_students(integer, text) TO anon, authenticated, service_role;

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
  WHERE r.year = p_year
    AND EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year)
  GROUP BY r.institution
  ORDER BY r.institution ASC;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_institutions(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_institutions(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_quiz_years()
RETURNS TABLE (
  year integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT y.year
  FROM public.quiz_years y
  ORDER BY y.year DESC;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_years() FROM public;
GRANT EXECUTE ON FUNCTION public.get_quiz_years() TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Admin RPC: add a year (no code change needed for a new edition)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_admin_add_year(p_year integer)
RETURNS integer
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

  IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
    RAISE EXCEPTION 'INVALID_YEAR';
  END IF;

  IF EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'YEAR_EXISTS';
  END IF;

  INSERT INTO public.quiz_years (year) VALUES (p_year);

  INSERT INTO public.quiz_settings (year, key, value, updated_at)
  VALUES
    (p_year, 'round2_enabled', 'false', now()),
    (p_year, 'round2_cutoff_boys', '20', now()),
    (p_year, 'round2_cutoff_girls', '25', now())
  ON CONFLICT (year, key) DO NOTHING;

  RETURN p_year;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_add_year(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_add_year(integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. Admin RPC: add or update one result (within the selected year only)
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
  v_existing_year integer;
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

  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'INVALID_YEAR';
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

  IF p_id IS NOT NULL THEN
    SELECT r.year INTO v_existing_year
    FROM public.quiz_results r
    WHERE r.id = p_id;
    IF v_existing_year IS NULL THEN
      RAISE EXCEPTION 'STUDENT_NOT_FOUND';
    END IF;
    IF v_existing_year <> p_year THEN
      RAISE EXCEPTION 'YEAR_MISMATCH';
    END IF;
  END IF;

  SELECT count(*) INTO v_dupes
  FROM public.quiz_results r
  WHERE r.year = p_year
    AND public.to_en_digits(r.roll) = v_roll
    AND (p_id IS NULL OR r.id <> p_id);
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'DUPLICATE_ROLL';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.quiz_results AS r (year, roll, name, institution, gender, marks, mobile)
    VALUES (p_year, v_roll, v_name, v_institution, v_gender, p_marks, nullif(v_mobile, ''))
    RETURNING r.id INTO v_id;
  ELSE
    v_id := NULL;
    UPDATE public.quiz_results r
    SET roll = v_roll,
        name = v_name,
        institution = v_institution,
        gender = v_gender,
        marks = p_marks,
        mobile = nullif(v_mobile, '')
    WHERE r.id = p_id AND r.year = p_year
    RETURNING r.id INTO v_id;
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
  WHERE r.id = v_id AND r.year = p_year;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_save_result(bigint, text, text, text, text, numeric, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_save_result(bigint, text, text, text, text, numeric, text, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. Admin RPC: per-year cutoffs (max-marks argument removed)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.quiz_admin_set_cutoffs(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.quiz_admin_set_cutoffs(
  p_year integer,
  p_boys numeric,
  p_girls numeric
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

  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'INVALID_YEAR';
  END IF;

  IF p_boys IS NULL OR p_girls IS NULL OR p_boys < 0 OR p_girls < 0 OR p_boys > 1000 OR p_girls > 1000 THEN
    RAISE EXCEPTION 'INVALID_CUTOFF';
  END IF;

  INSERT INTO public.quiz_settings (year, key, value, updated_at)
  VALUES (p_year, 'round2_cutoff_boys', p_boys::text, now())
  ON CONFLICT (year, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO public.quiz_settings (year, key, value, updated_at)
  VALUES (p_year, 'round2_cutoff_girls', p_girls::text, now())
  ON CONFLICT (year, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_set_cutoffs(integer, numeric, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_cutoffs(integer, numeric, numeric) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. Admin RPC: per-year round-2 feature flag
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.quiz_admin_set_round2_enabled(boolean);

CREATE OR REPLACE FUNCTION public.quiz_admin_set_round2_enabled(
  p_year integer,
  p_enabled boolean
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

  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'INVALID_YEAR';
  END IF;

  INSERT INTO public.quiz_settings (year, key, value, updated_at)
  VALUES (p_year, 'round2_enabled', CASE WHEN p_enabled THEN 'true' ELSE 'false' END, now())
  ON CONFLICT (year, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_set_round2_enabled(integer, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_round2_enabled(integer, boolean) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 11. Admin RPC: round-2 entry (per-year qualification, no max-marks cap)
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
  v_boys_val text;
  v_girls_val text;
BEGIN
  IF NOT (
    (SELECT public.has_permission('quiz.manage'))
    OR (SELECT public.has_permission('content.manage'))
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'INVALID_YEAR';
  END IF;

  SELECT value INTO v_r2_enabled
  FROM public.quiz_settings
  WHERE year = p_year AND key = 'round2_enabled';
  IF v_r2_enabled IS NULL OR lower(trim(v_r2_enabled)) NOT IN ('true', '1', 'yes') THEN
    RAISE EXCEPTION 'ROUND2_DISABLED';
  END IF;

  IF v_roll = '' THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.quiz_results r
  WHERE r.year = p_year AND public.to_en_digits(r.roll) = v_roll;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  ELSIF v_count > 1 THEN
    RAISE EXCEPTION 'AMBIGUOUS_ROLL';
  END IF;

  SELECT r.id, r.gender, r.marks, r.round2_marks, r.mobile
  INTO v_target_id, v_gender, v_r1_marks, v_old_r2, v_current_mobile
  FROM public.quiz_results r
  WHERE r.year = p_year AND public.to_en_digits(r.roll) = v_roll;

  SELECT value INTO v_boys_val
  FROM public.quiz_settings
  WHERE year = p_year AND key = 'round2_cutoff_boys';
  SELECT value INTO v_girls_val
  FROM public.quiz_settings
  WHERE year = p_year AND key = 'round2_cutoff_girls';

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
    RAISE EXCEPTION 'STUDENT_NOT_QUALIFIED';
  END IF;

  IF p_round2_marks IS NULL OR p_round2_marks < 0 THEN
    RAISE EXCEPTION 'INVALID_MARKS';
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

  UPDATE public.quiz_results r
  SET round2_marks = p_round2_marks,
      round2_updated_at = now(),
      mobile = v_new_mobile
  WHERE r.id = v_target_id AND r.year = p_year;

  INSERT INTO public.round2_audit (
    student_id, year, roll, old_round2_marks, new_round2_marks, mobile_added, changed_by
  ) VALUES (
    v_target_id, p_year, v_roll, v_old_r2, p_round2_marks,
    nullif(trim(coalesce(p_mobile, '')), ''), (select auth.uid())
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
  WHERE r.id = v_target_id AND r.year = p_year;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_set_round2(text, numeric, text, boolean, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_set_round2(text, numeric, text, boolean, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 12. Admin RPC: reveal mobile numbers for one year only
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

  IF p_year IS NULL OR NOT EXISTS (SELECT 1 FROM public.quiz_years y WHERE y.year = p_year) THEN
    RAISE EXCEPTION 'INVALID_YEAR';
  END IF;

  RETURN QUERY
  SELECT r.id, r.mobile
  FROM public.quiz_results r
  WHERE r.year = p_year
    AND (p_id IS NULL OR r.id = p_id)
  ORDER BY r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.quiz_admin_mobiles(bigint, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quiz_admin_mobiles(bigint, integer) TO authenticated, service_role;
