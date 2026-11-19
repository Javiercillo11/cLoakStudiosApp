-- Solicitudes que llegan desde el formulario de la web (cloakstudios.app).
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- La web (visitante anónimo) NO tiene acceso a la tabla: solo puede llamar a la
-- función submit_lead(), que valida de nuevo en el servidor y aplica un límite de envíos.

-- ───────────────────────── Tipo y tabla ─────────────────────────

do $$ begin
  create type public.lead_status as enum ('nuevo', 'contactado', 'convertido', 'descartado');
exception when duplicate_object then null; end $$;

/**
 * Respuestas propias del servicio: lista ordenada de {label, value} (texto ≤ 80 / ≤ 1500),
 * como máximo 12 elementos. Se guarda como array porque jsonb no conserva el orden de las claves.
 */
create or replace function public.lead_details_valid(d jsonb) returns boolean
language plpgsql immutable as $$
declare
  e jsonb;
begin
  if d is null or jsonb_typeof(d) <> 'array' or jsonb_array_length(d) > 12 then return false; end if;
  for e in select * from jsonb_array_elements(d) loop
    if jsonb_typeof(e) <> 'object'
      or jsonb_typeof(e->'label') is distinct from 'string'
      or jsonb_typeof(e->'value') is distinct from 'string'
      or char_length(e->>'label') not between 1 and 80
      or char_length(e->>'value') not between 1 and 1500 then
      return false;
    end if;
  end loop;
  return true;
end $$;

-- Longitudes iguales a LIMITS de la web (src/lib/contact/schema.ts).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.lead_status not null default 'nuevo',
  service text not null check (service in ('web', 'app', 'qr', 'otro')),
  name text not null check (char_length(name) between 2 and 100),
  business text not null default '' check (char_length(business) <= 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$'),
  phone text not null default '' check (char_length(phone) <= 25),
  message text not null check (char_length(message) between 10 and 3000),
  details jsonb not null default '[]'::jsonb check (public.lead_details_valid(details)),
  project_id uuid references public.projects on delete set null
);

create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);
create index if not exists leads_created_at_idx on public.leads (created_at);
create index if not exists leads_project_id_idx on public.leads (project_id);

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
for each row execute function public.touch_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────

alter table public.leads enable row level security;

drop policy if exists "owner_all" on public.leads;
create policy "owner_all" on public.leads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on type public.lead_status to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
-- Supabase concede por defecto permisos a anon en las tablas nuevas: se retiran explícitamente.
revoke all on public.leads from anon;

-- ───────────────────────── Entrada desde la web ─────────────────────────

/**
 * Única puerta de entrada de la web. Ejecutable por anon.
 *  - Honeypot relleno → responde ok y no guarda nada.
 *  - Límite global: 20 solicitudes por hora.
 *  - La solicitud se asigna al propietario de la app (el usuario más antiguo; el registro está desactivado).
 * Devuelve {"ok": true} o {"ok": false, "reason": "..."}.
 */
create or replace function public.submit_lead(
  p_service text,
  p_name text,
  p_email text,
  p_message text,
  p_business text default '',
  p_phone text default '',
  p_details jsonb default '[]'::jsonb,
  p_botcheck text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_business text := btrim(coalesce(p_business, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_details jsonb := coalesce(p_details, '[]'::jsonb);
begin
  -- Bot: se finge éxito para no darle pistas.
  if coalesce(btrim(p_botcheck), '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  if p_service is null or p_service not in ('web', 'app', 'qr', 'otro')
    or char_length(v_name) not between 2 and 100
    or char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$'
    or char_length(v_business) > 120
    or (p_service = 'qr' and v_business = '')
    or char_length(v_phone) > 25
    or char_length(v_message) not between 10 and 3000
    or not public.lead_details_valid(v_details) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select id into v_owner from auth.users order by created_at limit 1;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'reason', 'no_owner');
  end if;

  insert into public.leads (user_id, service, name, business, email, phone, message, details)
  values (v_owner, p_service, v_name, v_business, v_email, v_phone, v_message, v_details);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.submit_lead(text, text, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- ───────────────────────── Tiempo real ─────────────────────────
-- La app recibe las solicitudes nuevas al momento (RLS sigue filtrando por usuario).

do $$ begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null; end $$;

-- ───────────────────────── Borrado automático ─────────────────────────
-- Cumple la política de privacidad: las solicitudes que no acaban en proyecto
-- (nuevas, contactadas o descartadas) se borran tras 12 meses sin actividad.
-- Se ejecuta a diario a las 04:00 UTC. Si cambia el plazo, cambiarlo también en la web
-- (legal.leadRetentionMonths en src/data/site.ts).

create extension if not exists pg_cron;

select cron.schedule(
  'purge-stale-leads',
  '0 4 * * *',
  $job$ delete from public.leads where status <> 'convertido' and updated_at < now() - interval '12 months' $job$
);

notify pgrst, 'reload schema';
