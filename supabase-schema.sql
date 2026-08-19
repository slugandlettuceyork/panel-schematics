-- ============================================================
-- Panel Schematic — Supabase setup
-- Run this once in your Supabase project: SQL Editor > New query
-- ============================================================

create table if not exists public.circuit_notes (
  id           uuid primary key default gen_random_uuid(),
  panel_slug   text not null,
  position     text not null,
  custom_label text default '',
  notes        text default '',
  updated_at   timestamptz default now(),
  updated_by   text,
  unique (panel_slug, position)
);

alter table public.circuit_notes enable row level security;

-- Anyone (including anonymous site visitors) can read notes
create policy "Public can read notes"
  on public.circuit_notes for select
  to anon, authenticated
  using (true);

-- Only signed-in editors can add/change notes
create policy "Signed-in users can insert notes"
  on public.circuit_notes for insert
  to authenticated
  with check (true);

create policy "Signed-in users can update notes"
  on public.circuit_notes for update
  to authenticated
  using (true)
  with check (true);

-- Optional: let editors delete a note (clears it back to blank)
create policy "Signed-in users can delete notes"
  on public.circuit_notes for delete
  to authenticated
  using (true);

-- ============================================================
-- Next steps (do these in the Supabase dashboard, not SQL):
--
-- 1. Authentication > Providers: make sure "Email" is enabled.
-- 2. Authentication > Users > Add user: create ONE editor login,
--    e.g. edits@yourcompany.com, with a password. This is the
--    shared login everyone who's allowed to edit will use.
-- 3. Authentication > URL Configuration: add the URL where you'll
--    host this site (e.g. https://yourname.github.io/panels/) to
--    "Redirect URLs", so the password-reset email link works.
-- 4. Settings > API: copy the "Project URL" and "anon public" key
--    into assets/app.js (SUPABASE_URL / SUPABASE_ANON_KEY).
-- ============================================================
