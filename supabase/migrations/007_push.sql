-- Avisos push: dispositivos suscritos para recibir una notificación con cada solicitud nueva.
-- Ejecutar en Supabase → SQL Editor. Idempotente.
-- El envío lo hace la Edge Function notify-new-lead (supabase/functions/notify-new-lead),
-- llamada por un Database Webhook en INSERT de public.leads.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- URL del servicio push del navegador; identifica al dispositivo
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  device_label text not null default '' check (char_length(device_label) <= 120),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "owner_all" on public.push_subscriptions;
create policy "owner_all" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon;

notify pgrst, 'reload schema';
