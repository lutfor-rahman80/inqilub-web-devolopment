-- =====================================================================
-- Defense in depth: Supabase grants ALL table privileges to anon and
-- authenticated by default and relies on RLS. TRUNCATE, REFERENCES and
-- TRIGGER are not governed by RLS, and anonymous visitors never need to
-- write directly (public submissions go through server-side functions).
-- This migration runs after all feature migrations (late timestamp).
-- =====================================================================

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;
revoke truncate, references, trigger
  on all tables in schema public from authenticated;

revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;

-- Tables created by future migrations get the same treatment by default.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;
