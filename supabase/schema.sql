-- cLoak Studios · esquema de base de datos
-- Ejecutar en Supabase → SQL Editor.

create type project_status as enum ('nuevo', 'en_desarrollo', 'desplegado');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text not null default '',
  icon text not null default 'other',
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_name text not null,
  business_name text not null default '',
  description text not null default '',
  status project_status not null default 'nuevo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_services (
  project_id uuid not null references public.projects on delete cascade,
  service_id uuid not null references public.services on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (project_id, service_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete cascade,
  content text not null default '',
  color text not null default 'violet',
  created_at timestamptz not null default now()
);

create index notes_project_id_idx on public.notes (project_id);

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger projects_touch before update on public.projects
for each row execute function public.touch_updated_at();

-- Row Level Security: cada usuario solo ve y modifica sus filas
do $$
declare t text;
begin
  foreach t in array array['services','projects','project_services','notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner_all" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Permisos para la Data API (solo usuarios con sesión; RLS filtra las filas)
grant usage on schema public to authenticated;
grant usage on type project_status to authenticated;
grant select, insert, update, delete
  on public.services, public.projects, public.project_services, public.notes
  to authenticated;

-- Refresca la caché de esquema de la API
notify pgrst, 'reload schema';

-- ═════════ Ampliación de proyectos (idéntico a migrations/003_project_extras.sql) ═════════

-- ───────────────────────── Proyectos: nuevos campos ─────────────────────────

alter table public.projects
  add column if not exists phone text not null default '',
  add column if not exists province text not null default '',
  add column if not exists city text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists address text not null default '',
  add column if not exists payment_method text,
  add column if not exists payment_milestones jsonb not null default '[]'::jsonb,
  add column if not exists total_price numeric(10,2) not null default 0;

-- Precio total inicial de los proyectos existentes = suma de sus servicios (como se calculaba hasta ahora)
update public.projects p
set total_price = coalesce((
  select sum(s.price) from public.project_services ps
  join public.services s on s.id = ps.service_id
  where ps.project_id = p.id
), 0)
where p.total_price = 0;

/**
 * Hitos de pago válidos: array vacío (proyectos antiguos) o lista de hitos con
 * descripción, porcentaje > 0 y ≤ 100 con 2 decimales como máximo, paid booleano,
 * y suma EXACTA de 100 (numeric de Postgres: sin errores de coma flotante).
 */
create or replace function public.milestones_valid(m jsonb) returns boolean
language plpgsql immutable as $$
declare
  e jsonb;
  pct numeric;
  total numeric := 0;
begin
  if m is null or jsonb_typeof(m) <> 'array' then return false; end if;
  if jsonb_array_length(m) = 0 then return true; end if;
  for e in select * from jsonb_array_elements(m) loop
    if jsonb_typeof(e) <> 'object'
      or jsonb_typeof(e->'id') is distinct from 'string'
      or jsonb_typeof(e->'description') is distinct from 'string'
      or btrim(e->>'description') = ''
      or jsonb_typeof(e->'percentage') is distinct from 'number'
      or jsonb_typeof(e->'paid') is distinct from 'boolean' then
      return false;
    end if;
    pct := (e->>'percentage')::numeric;
    if pct <= 0 or pct > 100 or pct <> round(pct, 2) then return false; end if;
    total := total + pct;
  end loop;
  return total = 100;
end $$;

-- Métodos de pago: efectivo, bizum o transferencia. Se recrea la restricción por si se aplicó
-- una versión anterior de esta migración con el valor combinado 'bizum_transferencia'.
alter table public.projects drop constraint if exists projects_payment_method_check;
update public.projects set payment_method = 'transferencia' where payment_method = 'bizum_transferencia';
alter table public.projects
  add constraint projects_payment_method_check
  check (payment_method is null or payment_method in ('efectivo', 'bizum', 'transferencia'));

do $$ begin
  alter table public.projects
    add constraint projects_milestones_check check (public.milestones_valid(payment_milestones));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects
    add constraint projects_total_price_check check (total_price >= 0);
exception when duplicate_object then null; end $$;

-- ───────────────────────── Documentación: secciones ─────────────────────────

create table if not exists public.doc_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists doc_sections_touch on public.doc_sections;
create trigger doc_sections_touch before update on public.doc_sections
for each row execute function public.touch_updated_at();

-- ───────────────────────── Ficheros adjuntos (metadatos) ─────────────────────────
-- El binario vive en Storage (bucket "attachments"); aquí solo la ficha del fichero.

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete cascade,
  section_id uuid references public.doc_sections on delete cascade,
  file_name text not null check (length(btrim(file_name)) > 0),
  storage_path text not null unique,
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  size bigint not null check (size > 0 and size <= 20 * 1024 * 1024),
  uploaded_at timestamptz not null default now(),
  -- cada fichero pertenece a un proyecto O a una sección, nunca a ambos
  constraint attachments_one_owner check (num_nonnulls(project_id, section_id) = 1)
);

create index if not exists attachments_project_id_idx on public.attachments (project_id);
create index if not exists attachments_section_id_idx on public.attachments (section_id);

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.doc_sections enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "owner_all" on public.doc_sections;
create policy "owner_all" on public.doc_sections for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Un adjunto solo se puede crear/modificar si el proyecto o la sección son del usuario
-- y su ruta en Storage está dentro de la carpeta de ese proyecto/sección.
drop policy if exists "owner_all" on public.attachments;
create policy "owner_all" on public.attachments for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      (project_id is not null
        and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
        and storage_path like auth.uid()::text || '/projects/' || project_id::text || '/%')
      or
      (section_id is not null
        and exists (select 1 from public.doc_sections d where d.id = section_id and d.user_id = auth.uid())
        and storage_path like auth.uid()::text || '/sections/' || section_id::text || '/%')
    )
  );

grant select, insert, update, delete on public.doc_sections, public.attachments to authenticated;

-- Espacio ocupado por los adjuntos del usuario (aviso de almacenamiento del Dashboard).
-- security invoker: RLS limita la suma a las filas del usuario.
create or replace function public.attachments_total_size() returns bigint
language sql stable security invoker as $$
  select coalesce(sum(size), 0)::bigint from public.attachments
$$;
grant execute on function public.attachments_total_size() to authenticated;

-- ───────────────────────── Storage ─────────────────────────
-- Bucket privado: tamaño máximo y tipos MIME se validan también en el servidor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 20 * 1024 * 1024,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Rutas: {uid}/projects/{projectId}/{fichero} y {uid}/sections/{sectionId}/{fichero}
drop policy if exists "attachments_select_own" on storage.objects;
create policy "attachments_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_insert_own" on storage.objects;
create policy "attachments_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      ((storage.foldername(name))[2] = 'projects' and exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[3] and p.user_id = auth.uid()))
      or
      ((storage.foldername(name))[2] = 'sections' and exists (
        select 1 from public.doc_sections d
        where d.id::text = (storage.foldername(name))[3] and d.user_id = auth.uid()))
    )
  );

drop policy if exists "attachments_update_own" on storage.objects;
create policy "attachments_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

-- ═════════ Precio calculado (idéntico a migrations/005_pricing.sql) ═════════
alter table public.projects
  add column if not exists extra_charges jsonb not null default '[]'::jsonb,
  add column if not exists discount_pct numeric(5,2) not null default 0;

/** Cargos válidos: lista de {id, description no vacía, amount > 0 con 2 decimales como máximo} */
create or replace function public.extra_charges_valid(c jsonb) returns boolean
language plpgsql immutable as $$
declare
  e jsonb;
  amt numeric;
begin
  if c is null or jsonb_typeof(c) <> 'array' then return false; end if;
  for e in select * from jsonb_array_elements(c) loop
    if jsonb_typeof(e) <> 'object'
      or jsonb_typeof(e->'id') is distinct from 'string'
      or jsonb_typeof(e->'description') is distinct from 'string'
      or btrim(e->>'description') = ''
      or jsonb_typeof(e->'amount') is distinct from 'number' then
      return false;
    end if;
    amt := (e->>'amount')::numeric;
    if amt <= 0 or amt <> round(amt, 2) then return false; end if;
  end loop;
  return true;
end $$;

do $$ begin
  alter table public.projects add constraint projects_extra_charges_check check (public.extra_charges_valid(extra_charges));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.projects add constraint projects_discount_pct_check check (discount_pct >= 0 and discount_pct <= 100);
exception when duplicate_object then null; end $$;

-- Conserva el precio de los proyectos existentes, que hasta ahora se podía fijar a mano:
--  · si era MAYOR que la suma de servicios → la diferencia pasa a un cargo "Ajuste de precio"
--  · si era MENOR → se convierte en % de descuento (y el total se recalcula con ese %, puede variar algún céntimo)
with sums as (
  select p.id, p.total_price,
         coalesce((select sum(s.price) from public.project_services ps
                   join public.services s on s.id = ps.service_id
                   where ps.project_id = p.id), 0) as services_sum
  from public.projects p
  where p.extra_charges = '[]'::jsonb and p.discount_pct = 0
)
update public.projects p
set extra_charges = jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text, 'description', 'Ajuste de precio', 'amount', s.total_price - s.services_sum))
from sums s
where p.id = s.id and s.total_price > s.services_sum;

with sums as (
  select p.id, p.total_price,
         coalesce((select sum(s.price) from public.project_services ps
                   join public.services s on s.id = ps.service_id
                   where ps.project_id = p.id), 0) as services_sum
  from public.projects p
  where p.extra_charges = '[]'::jsonb and p.discount_pct = 0
)
update public.projects p
set discount_pct = round((s.services_sum - s.total_price) / s.services_sum * 100, 2),
    total_price = round(s.services_sum * (1 - round((s.services_sum - s.total_price) / s.services_sum * 100, 2) / 100), 2)
from sums s
where p.id = s.id and s.services_sum > 0 and s.total_price < s.services_sum;

notify pgrst, 'reload schema';
