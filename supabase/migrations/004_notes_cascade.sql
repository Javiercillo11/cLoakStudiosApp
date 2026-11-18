-- Al eliminar un proyecto se eliminan también sus notas (antes quedaban como notas libres).
-- Ejecutar en Supabase → SQL Editor. Idempotente.

alter table public.notes drop constraint if exists notes_project_id_fkey;
alter table public.notes
  add constraint notes_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;

notify pgrst, 'reload schema';
