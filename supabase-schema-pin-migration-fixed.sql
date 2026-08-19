-- ============================================================
-- Panel Schematic — PIN editing (fixed: schema-qualified pgcrypto)
-- Safe to re-run even if the previous attempt partly succeeded.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.edit_pin (
  id boolean primary key default true,
  pin_hash text not null,
  constraint single_row check (id)
);

alter table public.edit_pin enable row level security;

insert into public.edit_pin (id, pin_hash)
values (true, extensions.crypt('123456', extensions.gen_salt('bf')))
on conflict (id) do nothing;
-- Only seeds the PIN if the table is empty — won't overwrite an
-- existing PIN if you're re-running this after already changing it.

create or replace function public.verify_edit_pin(pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from edit_pin where pin_hash = extensions.crypt(pin, pin_hash)
  );
$$;
grant execute on function public.verify_edit_pin(text) to anon, authenticated;

create or replace function public.save_circuit_note(
  p_pin text,
  p_panel_slug text,
  p_position text,
  p_custom_label text,
  p_notes text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.change_edit_pin(old_pin text, new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_edit_pin(old_pin) then
    raise exception 'Current PIN is incorrect';
  end if;
  if new_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must be exactly 6 digits';
  end if;
  update edit_pin set pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf')) where id = true;
  return true;
end;
$$;
grant execute on function public.change_edit_pin(text, text) to anon, authenticated;

drop policy if exists "Signed-in users can insert notes" on public.circuit_notes;
drop policy if exists "Signed-in users can update notes" on public.circuit_notes;
drop policy if exists "Signed-in users can delete notes" on public.circuit_notes;
