-- LOCAL DEVELOPMENT / TEST DATA ONLY. Never run against production.
-- One staff account per role; password for all: Test@12345

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'super@test.local',     'সুপার অ্যাডমিন (টেস্ট)',  'super_admin'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'admin@test.local',     'অ্যাডমিন (টেস্ট)',        'admin'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'secretary@test.local', 'সাধারণ সম্পাদক (টেস্ট)',  'secretary'),
      ('00000000-0000-4000-a000-000000000004'::uuid, 'editor@test.local',    'কনটেন্ট এডিটর (টেস্ট)',   'content_editor'),
      ('00000000-0000-4000-a000-000000000005'::uuid, 'viewer@test.local',    'কমিটি সদস্য (টেস্ট)',     'committee_viewer')
    ) as t(id, email, full_name, role_key)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
      extensions.crypt('Test@12345', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), r.id, r.id::text,
            jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
            'email', now(), now(), now());
    insert into public.staff_profiles (id, full_name, role_id)
    values (r.id, r.full_name, (select id from public.roles where key = r.role_key));
  end loop;
end;
$$;
