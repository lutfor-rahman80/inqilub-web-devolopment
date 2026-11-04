-- ============================================================================
-- Migration: Add 'quiz.manage' Permission and 'quiz_admin' Role
-- Allows dedicated Quiz Admins to manage Seerat Quiz results and settings
-- ============================================================================

-- 1. Insert new permission
INSERT INTO public.permissions (key, name_bn, description, sort_order)
VALUES (
  'quiz.manage',
  'সীরাত কুইজ ব্যবস্থাপনা',
  'সীরাত কুইজের ফলাফল এন্ট্রি, কাট-অফ নম্বর ও ২য় রাউন্ড পরিচালনা',
  85
)
ON CONFLICT (key) DO UPDATE
SET name_bn = EXCLUDED.name_bn,
    description = EXCLUDED.description;

-- 2. Insert predefined Quiz Admin role
INSERT INTO public.roles (key, name_bn, description, is_system)
VALUES (
  'quiz_admin',
  'সীরাত কুইজ অ্যাডমিন',
  'শুধুমাত্র সীরাত কুইজের ফলাফল এন্ট্রি, কাট-অফ ও ২য় রাউন্ড ব্যবস্থাপনার অনুমতিপ্রাপ্ত অ্যাডমিন।',
  false
)
ON CONFLICT (key) DO UPDATE
SET name_bn = EXCLUDED.name_bn,
    description = EXCLUDED.description;

-- 3. Link role with quiz.manage permission
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'quiz.manage'
FROM public.roles r
WHERE r.key = 'quiz_admin'
ON CONFLICT DO NOTHING;

-- Also grant to content_manager role if it exists
INSERT INTO public.role_permissions (role_id, permission)
SELECT r.id, 'quiz.manage'
FROM public.roles r
WHERE r.key = 'content_manager'
ON CONFLICT DO NOTHING;

-- 4. Update RLS policies on quiz tables to allow both 'quiz.manage' and 'content.manage'
DROP POLICY IF EXISTS "quiz_results_manage_insert" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_insert" ON public.quiz_results
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_results_manage_update" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_update" ON public.quiz_results
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  )
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_results_manage_delete" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_delete" ON public.quiz_results
  FOR DELETE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_settings_manage_insert" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_insert" ON public.quiz_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "quiz_settings_manage_update" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_update" ON public.quiz_settings
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  )
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "round2_audit_manage_insert" ON public.round2_audit;
CREATE POLICY "round2_audit_manage_insert" ON public.round2_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

DROP POLICY IF EXISTS "round2_audit_admin_read" ON public.round2_audit;
CREATE POLICY "round2_audit_admin_read" ON public.round2_audit
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_permission('quiz.manage')) OR 
    (SELECT public.has_permission('content.manage'))
  );

