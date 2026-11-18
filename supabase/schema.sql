-- cLoak Studios · esquema de base de datos
-- Ejecutar en Supabase → SQL Editor.

create type project_status as enum ('nuevo', 'en_desarrollo', 'desplegado');

create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text not null default '',
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
  content text not null default '',
  color text not null default 'violet',
  created_at timestamptz not null default now()
);

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
