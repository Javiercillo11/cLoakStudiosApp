-- Icono de cada servicio (clave de src/lib/serviceIcons.tsx). Ejecutar en Supabase → SQL Editor.

alter table public.services
  add column if not exists icon text not null default 'other';

notify pgrst, 'reload schema';
