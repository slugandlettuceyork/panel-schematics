-- ============================================================
-- Panel Schematic — allow multiple area tags + multiple sub-tags
-- per circuit (e.g. a Bar Ring that also feeds Customer Area,
-- or lights covering both Section 1 and Section 2).
-- Safe to run once — converts existing single-value tags into
-- one-item arrays automatically, nothing is lost.
-- ============================================================

alter table public.circuit_notes
  alter column area drop default,
  alter column area type text[] using (case when area is null or area = '' then '{}'::text[] else array[area] end),
  alter column area set default '{}';

alter table public.circuit_notes
  alter column area_detail drop default,
  alter column area_detail type text[] using (case when area_detail is null or area_detail = '' then '{}'::text[] else array[area_detail] end),
  alter column area_detail set default '{}';

create or replace function public.save_circuit_note(
  p_pin text,
  p_panel_slug text,
  p_position text,
  p_custom_label text,
  p_notes text,
  p_areas text[] default '{}',
  p_area_details text[] default '{}'
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
  values (p_panel_slug, p_position, p_custom_label, p_notes, p_areas, p_area_details, now())
  on conflict (panel_slug, position)
  do update set custom_label = excluded.custom_label,
                notes = excluded.notes,
                area = excluded.area,
                area_detail = excluded.area_detail,
                updated_at = excluded.updated_at;

  return true;
end;
$$;
grant execute on function public.save_circuit_note(text, text, text, text, text, text[], text[]) to anon, authenticated;

-- Drop the old single-value version so there's no ambiguity between overloads
drop function if exists public.save_circuit_note(text, text, text, text, text, text, text);
