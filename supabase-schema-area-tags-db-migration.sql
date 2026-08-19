-- ============================================================
-- Panel Schematic — move area tags into Supabase tables
-- so they can be added/edited from the Table Editor, no code
-- or SQL needed for day-to-day changes.
-- ============================================================

create table if not exists public.area_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.area_sub_tags (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.area_tags(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

alter table public.area_tags enable row level security;
alter table public.area_sub_tags enable row level security;

create policy "Public can read area tags" on public.area_tags
  for select to anon, authenticated using (true);
create policy "Public can read area sub tags" on public.area_sub_tags
  for select to anon, authenticated using (true);
-- Deliberately no insert/update/delete policies — the public site can
-- never change these. Editing only happens via the Supabase dashboard
-- (Table Editor), which connects with elevated access and isn't
-- subject to these policies.

-- Seed with the same tags that were previously hardcoded, plus two
-- spare "Playground" sub-options to try things out on.
with new_tags as (
  insert into public.area_tags (label, sort_order) values
    ('Bar', 10),
    ('Kitchen', 20),
    ('Cellar', 30),
    ('Staff Room', 40),
    ('Office', 50),
    ('Toilets', 60),
    ('Customer Area', 70),
    ('Outside', 80),
    ('HVAC / Plant', 90),
    ('Playground (test)', 999)
  returning id, label
),
sub_ins as (
  insert into public.area_sub_tags (parent_id, label, sort_order)
  select nt.id, v.label, v.sort_order
  from new_tags nt
  join (values
    ('Toilets', 'Gents', 10),
    ('Toilets', 'Ladies', 20),
    ('Toilets', 'Accessible', 30),
    ('Customer Area', 'Section 1', 10),
    ('Customer Area', 'Section 2', 20),
    ('Customer Area', 'Section 3', 30),
    ('Customer Area', 'Section 4', 40),
    ('Playground (test)', 'Spare Option A', 10),
    ('Playground (test)', 'Spare Option B', 20)
  ) as v(parent_label, label, sort_order) on nt.label = v.parent_label
  returning id
)
select 'seeded' as status, (select count(*) from new_tags) as tags_added, (select count(*) from sub_ins) as sub_tags_added;

-- Migrate any existing notes tagged with the old hardcoded slugs
-- (e.g. 'bar', 'toilets', 'gents') across to the new table-based ids.
-- Harmless no-op if you haven't tagged any notes yet.
update public.circuit_notes cn
set area = at.id::text
from public.area_tags at
join (values
  ('bar','Bar'), ('kitchen','Kitchen'), ('cellar','Cellar'), ('staff-room','Staff Room'),
  ('office','Office'), ('toilets','Toilets'), ('customer-area','Customer Area'),
  ('outside','Outside'), ('hvac-plant','HVAC / Plant')
) as m(old_slug, label) on m.label = at.label
where cn.area = m.old_slug;

update public.circuit_notes cn
set area_detail = ast.id::text
from public.area_sub_tags ast
join (values
  ('gents','Gents'), ('ladies','Ladies'), ('accessible','Accessible'),
  ('section-1','Section 1'), ('section-2','Section 2'),
  ('section-3','Section 3'), ('section-4','Section 4')
) as m(old_slug, label) on m.label = ast.label
where cn.area_detail = m.old_slug;
