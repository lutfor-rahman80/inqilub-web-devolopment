-- =====================================================================
-- Membership: database-level hardening (defense in depth)
--
-- 1. members INSERT is limited to the columns the admin "new member" form
--    sends. Without this, Supabase's default all-column INSERT grant let a
--    members.manage user (through PostgREST) insert a row linked to any
--    application (application_id) with a backdated created_at. That fake
--    member would permanently block approve_application (ALREADY_MEMBER),
--    and since application_id cannot be updated and members cannot be
--    deleted, nobody could undo it in the app. Approved members are created
--    only by approve_application (security definer, unaffected by this grant).
--    photo_path is set after creation via the column UPDATE grant.
--
-- 2. Approved applications cannot be deleted, not even by a holder of
--    applications.delete: they are the source record of a member (the member
--    keeps application_id; status history and notification log would be
--    cascaded away). The admin UI already hides/blocks this; now RLS does too.
-- =====================================================================

revoke insert on public.members from authenticated;
grant insert (member_no, full_name, designation_id, status, mobile, email, blood_group,
              directory_consent, show_in_directory, public_phone_consent, public_phone,
              joined_on, sort_order, notes)
  on public.members to authenticated;

drop policy if exists membership_applications_delete on public.membership_applications;
create policy membership_applications_delete on public.membership_applications
  for delete to authenticated
  using ((select public.has_permission('applications.delete')) and status <> 'approved');
