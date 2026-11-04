-- =====================================================================
-- Public site: site_settings value shapes are enforced by the database.
--
-- The admin content form validates each section, but RLS lets anyone with
-- content.manage write the jsonb directly through the REST API with their
-- own session. Every public page renders these values, so a malformed value
-- (an object where text is expected) or a non-Facebook "facebook_url" would
-- break the site or put an arbitrary link on it. This trigger rejects such
-- writes for the five known sections. Other keys are left alone, and keys
-- not listed for a section are allowed, so future fields keep working.
-- =====================================================================

create or replace function private.validate_site_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v       jsonb := new.value;
  k       text;
  t       text;
  item    jsonb;
begin
  if new.key not in ('organization', 'about', 'contact', 'membership', 'directory') then
    return new;
  end if;

  if v is null or jsonb_typeof(v) <> 'object' then
    raise exception 'INVALID_SETTINGS: % must be a JSON object', new.key using errcode = 'check_violation';
  end if;

  if new.key = 'organization' then
    foreach k in array array['name_bn', 'tagline', 'slogan', 'location'] loop
      t := jsonb_typeof(v -> k);
      if t is not null and t <> 'string' then
        raise exception 'INVALID_SETTINGS: organization.% must be text', k using errcode = 'check_violation';
      end if;
    end loop;

  elsif new.key = 'about' then
    foreach k in array array['what_is', 'goal', 'objective', 'why'] loop
      t := jsonb_typeof(v -> k);
      if t is not null and t <> 'string' then
        raise exception 'INVALID_SETTINGS: about.% must be text', k using errcode = 'check_violation';
      end if;
    end loop;

  elsif new.key = 'contact' then
    foreach k in array array['address', 'phone', 'email', 'facebook_url', 'map_url', 'office_hours'] loop
      t := jsonb_typeof(v -> k);
      if t is not null and t not in ('string', 'null') then
        raise exception 'INVALID_SETTINGS: contact.% must be text or null', k using errcode = 'check_violation';
      end if;
    end loop;
    -- Only https Facebook / Google Maps embed addresses (empty = not set).
    if coalesce(v ->> 'facebook_url', '') <> ''
       and (v ->> 'facebook_url') !~* '^https://((www|m)\.)?facebook\.com(/[^[:cntrl:]]*)?$' then
      raise exception 'INVALID_SETTINGS: contact.facebook_url must be an https://facebook.com address'
        using errcode = 'check_violation';
    end if;
    if coalesce(v ->> 'map_url', '') <> ''
       and (v ->> 'map_url') !~ '^https://www\.google\.com/maps/embed[^[:cntrl:]]*$' then
      raise exception 'INVALID_SETTINGS: contact.map_url must be a Google Maps embed address'
        using errcode = 'check_violation';
    end if;

  elsif new.key = 'membership' then
    t := jsonb_typeof(v -> 'is_open');
    if t is not null and t <> 'boolean' then
      raise exception 'INVALID_SETTINGS: membership.is_open must be true or false' using errcode = 'check_violation';
    end if;
    t := jsonb_typeof(v -> 'declaration');
    if t is not null then
      if t <> 'array' then
        raise exception 'INVALID_SETTINGS: membership.declaration must be a list of texts' using errcode = 'check_violation';
      end if;
      for item in select jsonb_array_elements(v -> 'declaration') loop
        if jsonb_typeof(item) <> 'string' then
          raise exception 'INVALID_SETTINGS: membership.declaration must be a list of texts' using errcode = 'check_violation';
        end if;
      end loop;
    end if;

  elsif new.key = 'directory' then
    t := jsonb_typeof(v -> 'enabled');
    if t is not null and t <> 'boolean' then
      raise exception 'INVALID_SETTINGS: directory.enabled must be true or false' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- Trigger functions run without an EXECUTE check; nobody calls this directly.
revoke execute on function private.validate_site_settings() from public, anon, authenticated;

drop trigger if exists site_settings_validate on public.site_settings;
create trigger site_settings_validate
  before insert or update of key, value on public.site_settings
  for each row execute function private.validate_site_settings();
