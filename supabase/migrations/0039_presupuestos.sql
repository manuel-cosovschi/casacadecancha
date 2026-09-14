-- =====================================================================
-- CASACA DE CANCHA — Presupuestos para encargos
--
-- Alguien escribe por WhatsApp pidiendo tres camisetas. Hoy eso se
-- contesta a mano, con la cuenta hecha en la calculadora del teléfono.
-- Acá queda armado, numerado y guardado.
--
-- Los totales se guardan CALCULADOS, no solo los ingredientes: si mañana
-- cambia la forma de calcular, el presupuesto que ya mandaste tiene que
-- seguir diciendo lo mismo que leyó el cliente.
-- =====================================================================

create sequence if not exists presupuesto_numero_seq start 1;

create table if not exists public.presupuestos (
  id            uuid primary key default gen_random_uuid(),
  -- PRES-0001, no PRES-1: queda mejor en el PDF y ordena bien alfabéticamente.
  numero        text not null unique default ('PRES-' || lpad(nextval('presupuesto_numero_seq')::text, 4, '0')),

  -- Para quién
  cliente       text not null,
  contacto      text,                       -- WhatsApp o lo que haya

  -- Qué se le cotiza: [{ nombre, cantidad, precio }]
  items         jsonb not null default '[]'::jsonb,

  -- Descuento sobre el total: en porcentaje o en plata, nunca los dos.
  descuento_tipo  text not null default 'porcentaje',
  descuento_valor numeric not null default 0,

  -- Un costo extra cualquiera (envío, estampado, lo que sea).
  extra_label   text,
  extra_monto   numeric not null default 0,

  sena_pct      int not null default 50,
  notas         text,
  valido_dias   int not null default 7,

  -- Congelados al momento de generarlo.
  subtotal      numeric not null default 0,
  descuento     numeric not null default 0,
  total         numeric not null default 0,
  sena          numeric not null default 0,

  estado        text not null default 'enviado',   -- enviado | aceptado | rechazado
  created_at    timestamptz not null default now(),
  -- on delete set null: si algún día se da de baja a un vendedor, sus
  -- presupuestos tienen que seguir existiendo. Son plata cotizada, no
  -- pertenecen a la cuenta que los tipeó.
  created_by    uuid references auth.users(id) on delete set null default auth.uid()
);

create index if not exists presupuestos_created_idx on public.presupuestos (created_at desc);

alter table public.presupuestos enable row level security;

drop policy if exists admin_read_presupuestos on public.presupuestos;
create policy admin_read_presupuestos on public.presupuestos
  for select using (public.is_admin());

drop policy if exists staff_write_presupuestos on public.presupuestos;
create policy staff_write_presupuestos on public.presupuestos
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());
