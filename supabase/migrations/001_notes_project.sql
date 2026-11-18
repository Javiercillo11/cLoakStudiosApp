-- Asocia notas a proyectos (opcional). Ejecutar en Supabase → SQL Editor
-- si la base de datos ya se creó con una versión anterior de schema.sql.

alter table public.notes
  add column if not exists project_id uuid references public.projects on delete set null;

create index if not exists notes_project_id_idx on public.notes (project_id);

notify pgrst, 'reload schema';
