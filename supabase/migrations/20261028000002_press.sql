-- =====================================================================
-- Press (প্রেস): news coverage of the organization's activities and
-- interviews given to news channels. The site links to the outlet's own page
-- (no copied articles); YouTube videos may be played via a click-to-load
-- embed. Requested by the organization on 2026-10-28.
-- =====================================================================

create table public.press_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('news', 'interview', 'video_report')),
  title_bn     text not null check (char_length(title_bn) between 2 and 300),
  title_en     text check (title_en is null or char_length(title_en) between 2 and 300),
  outlet_bn    text not null check (char_length(outlet_bn) between 1 and 120),
  outlet_en    text check (outlet_en is null or char_length(outlet_en) between 1 and 120),
  url          text not null check (
                 char_length(url) <= 1000
                 and url ~* '^https://[a-z0-9.-]+\.[a-z]{2,}(:443)?(/[^[:space:][:cntrl:]<>"'']*)?$'
               ),
  published_on date not null check (published_on > date '2000-01-01'),
  summary_bn   text check (char_length(summary_bn) <= 600),
  summary_en   text check (char_length(summary_en) <= 600),
  program_id   uuid references public.programs(id) on delete set null,
  is_published boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index press_items_public_idx on public.press_items(is_published, published_on desc);
create index press_items_program_idx on public.press_items(program_id) where program_id is not null;
create trigger press_items_updated_at before update on public.press_items
  for each row execute function private.set_updated_at();
create trigger press_items_audit after insert or update or delete on public.press_items
  for each row execute function private.audit_row_change();

alter table public.press_items enable row level security;

create policy press_items_public_read on public.press_items
  for select to anon, authenticated using (is_published or (select public.has_permission('content.manage')));
create policy press_items_manage_insert on public.press_items
  for insert to authenticated with check ((select public.has_permission('content.manage')));
create policy press_items_manage_update on public.press_items
  for update to authenticated using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));
create policy press_items_manage_delete on public.press_items
  for delete to authenticated using ((select public.has_permission('content.manage')));

revoke update on public.press_items from authenticated;
grant update (kind, title_bn, title_en, outlet_bn, outlet_en, url, published_on, summary_bn, summary_en,
              program_id, is_published)
  on public.press_items to authenticated;

revoke insert, update, delete, truncate, references, trigger on public.press_items from anon;
revoke truncate, references, trigger on public.press_items from authenticated;
