alter table public.circuit_notes
  add column if not exists area text default '',
  add column if not exists area_detail text default '';

create or replace function public.save_circuit_note(
  p_pin text,
  p_panel_slug text,
  p_position text,
  p_custom_label text,
  p_notes text,
  p_area text default '',
  p_area_detail text default ''
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_edit_pin(p_pin) then
    raise exception 'Incorrect PIN';
  end if;

  insert into circuit_notes (panel_slug, position, custom_label, notes, area, area_detail, updated_at)
  values (p_panel_slug, p_position, p_custom_label, p_notes, p_area, p_area_detail, now())
  on conflict (panel_slug, position)
  do update set custom_label = excluded.custom_label,
                notes = excluded.notes,
                area = excluded.area,
                area_detail = excluded.area_detail,
                updated_at = excluded.updated_at;

  return true;
end;
$$;
grant execute on function public.save_circuit_note(text, text, text, text, text, text, text) to anon, authenticated;

-- Old 5-argument version is no longer used by the site, but drop it
-- explicitly so there's no ambiguity between the two overloads.
drop function if exists public.save_circuit_note(text, text, text, text, text);
