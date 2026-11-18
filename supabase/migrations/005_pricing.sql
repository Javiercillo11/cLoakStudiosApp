-- Precio del proyecto calculado: (servicios + cargos adicionales) − % de descuento.
-- Ejecutar en Supabase → SQL Editor. Idempotente.

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
