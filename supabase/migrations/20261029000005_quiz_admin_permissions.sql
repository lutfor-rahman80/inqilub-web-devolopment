-- ============================================================================
-- Migration: Add RLS policies & permissions for quiz admin management
-- Allows authenticated staff with 'content.manage' permission to insert,
-- update, and delete quiz results, settings, and audit logs.
-- ============================================================================

GRANT INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quiz_settings TO authenticated;
GRANT INSERT ON public.round2_audit TO authenticated;

-- Quiz Results: content.manage can create, edit, delete
DROP POLICY IF EXISTS "quiz_results_manage_insert" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_insert" ON public.quiz_results
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_permission('content.manage')));

DROP POLICY IF EXISTS "quiz_results_manage_update" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_update" ON public.quiz_results
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_permission('content.manage')))
  WITH CHECK ((SELECT public.has_permission('content.manage')));

DROP POLICY IF EXISTS "quiz_results_manage_delete" ON public.quiz_results;
CREATE POLICY "quiz_results_manage_delete" ON public.quiz_results
  FOR DELETE TO authenticated
  USING ((SELECT public.has_permission('content.manage')));

-- Quiz Settings: content.manage can insert and update settings
DROP POLICY IF EXISTS "quiz_settings_manage_insert" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_insert" ON public.quiz_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_permission('content.manage')));

DROP POLICY IF EXISTS "quiz_settings_manage_update" ON public.quiz_settings;
CREATE POLICY "quiz_settings_manage_update" ON public.quiz_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.has_permission('content.manage')))
  WITH CHECK ((SELECT public.has_permission('content.manage')));

-- Round 2 Audit: content.manage can record audit logs
DROP POLICY IF EXISTS "round2_audit_manage_insert" ON public.round2_audit;
CREATE POLICY "round2_audit_manage_insert" ON public.round2_audit
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_permission('content.manage')));

DROP POLICY IF EXISTS "round2_audit_admin_read" ON public.round2_audit;
CREATE POLICY "round2_audit_admin_read" ON public.round2_audit
  FOR SELECT TO authenticated
  USING ((SELECT public.has_permission('content.manage')));
