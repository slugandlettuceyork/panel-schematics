-- ============================================================
-- Panel Schematic — switch to 6-digit PIN editing
-- Run this in SQL Editor AFTER supabase-schema.sql has already
-- been run once. Safe to run even if you already created an
-- email/password editor user — that account just won't be used
-- by the site anymore (you can delete it under Authentication >
-- Users if you like, or leave it, it's harmless).
-- ============================================================

create extension if not exists pgcrypto;

-- Single-row table holding the PIN as a salted hash (never stored
-- or transmitted as plain text, and not readable via the public API —
-- see the "no policies" note below).
create table if not exists public.edit_pin (
  id boolean primary key default true,
  pin_hash text not null,
  constraint single_row check (id)
);

alter table public.edit_pin enable row level security;
-- Deliberately NO select/insert/update policies here — this means
-- nobody, not even signed-in users, can read or write this table
-- directly through the API. Only the SECURITY DEFINER functions
-- below (which run with elevated privilege) can touch it.

-- Seed the starting PIN. CHANGE THIS after setup — either run:
--   select public.change_edit_pin('123456', 'your-new-pin');
-- or just use "Change PIN" on the live site once you've signed in.
insert into public.edit_pin (id, pin_hash)
values (true, crypt('123456', gen_salt('bf')))
on conflict (id) do nothing;

-- Check a PIN without exposing the hash
create or replace function public.verify_edit_pin(pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from edit_pin where pin_hash = crypt(pin, pin_hash)
  );
$$;
grant execute on function public.verify_edit_pin(text) to anon, authenticated;

-- Save a note — takes the PIN as an argument and checks it
-- server-side before writing anything.
create or replace function public.save_circuit_note(
  p_pin text,
  p_panel_slug text,
  p_position text,
  p_custom_label text,
  p_notes text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_edit_pin(p_pin) then
    raise exception 'Incorrect PIN';
  end if;

  insert into circuit_notes (panel_slug, position, custom_label, notes, updated_at)
  values (p_panel_slug, p_position, p_custom_label, p_notes, now())
  on conflict (panel_slug, position)
  do update set custom_label = excluded.custom_label,
                notes = excluded.notes,
                updated_at = excluded.updated_at;

  return true;
end;
$$;
grant execute on function public.save_circuit_note(text, text, text, text, text) to anon, authenticated;

-- Change the PIN — requires the current one.
create or replace function public.change_edit_pin(old_pin text, new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_edit_pin(old_pin) then
    raise exception 'Current PIN is incorrect';
  end if;
  if new_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must be exactly 6 digits';
  end if;
  update edit_pin set pin_hash = crypt(new_pin, gen_salt('bf')) where id = true;
  return true;
end;
$$;
grant execute on function public.change_edit_pin(text, text) to anon, authenticated;

-- Direct table writes are no longer used (all writes now go through
-- save_circuit_note above), so drop the old auth-based write policies.
-- Public read access is untouched.
drop policy if exists "Signed-in users can insert notes" on public.circuit_notes;
drop policy if exists "Signed-in users can update notes" on public.circuit_notes;
drop policy if exists "Signed-in users can delete notes" on public.circuit_notes;
