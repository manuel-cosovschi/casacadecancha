-- ============================================================
--  Subastas en vivo  ·  Casaca de Cancha
--  Pegar tal cual en Supabase → SQL Editor → Run.
--  Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

-- ---------- Tablas ----------

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  image_url text,
  size text,
  variant_id uuid references public.product_variants(id) on delete set null,
  start_price numeric not null check (start_price >= 0),
  min_increment numeric not null default 1000 check (min_increment > 0),
  max_bid numeric,                       -- tope por puja (anti "puse 50 millones")
  anti_snipe_seconds int not null default 120,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'borrador',   -- borrador | activa | finalizada | cancelada
  winner_bid_id uuid,
  seller_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Postores: se aprueban una vez y quedan habilitados para todas las subastas.
create table if not exists public.auction_bidders (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  name text not null,
  phone text not null,
  phone_key text not null,               -- últimos 10 dígitos, para comparar
  status text not null default 'pendiente',  -- pendiente | aprobado | bloqueado
  is_customer boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create unique index if not exists auction_bidders_phone_key_idx on public.auction_bidders (phone_key);

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.auction_bidders(id) on delete cascade,
  amount numeric not null check (amount > 0),
  voided boolean not null default false,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists auction_bids_auction_idx on public.auction_bids (auction_id, created_at desc);
create index if not exists auction_bids_live_idx on public.auction_bids (auction_id, voided, amount desc);

-- ---------- Seguridad ----------
-- Nadie entra directo a las tablas: todo pasa por las funciones de abajo.

alter table public.auctions enable row level security;
alter table public.auction_bidders enable row level security;
alter table public.auction_bids enable row level security;

drop policy if exists admin_read_auctions on public.auctions;
create policy admin_read_auctions on public.auctions for select to public using (is_admin());
drop policy if exists staff_write_auctions on public.auctions;
create policy staff_write_auctions on public.auctions for all to public
  using (is_staff_writer()) with check (is_staff_writer());

drop policy if exists admin_read_bidders on public.auction_bidders;
create policy admin_read_bidders on public.auction_bidders for select to public using (is_admin());
drop policy if exists staff_write_bidders on public.auction_bidders;
create policy staff_write_bidders on public.auction_bidders for all to public
  using (is_staff_writer()) with check (is_staff_writer());

drop policy if exists admin_read_bids on public.auction_bids;
create policy admin_read_bids on public.auction_bids for select to public using (is_admin());
drop policy if exists staff_write_bids on public.auction_bids;
create policy staff_write_bids on public.auction_bids for all to public
  using (is_staff_writer()) with check (is_staff_writer());

-- ---------- Utilidades ----------

-- Últimos 10 dígitos del teléfono: hace que 2235123456, 02235123456
-- y +54 9 223 512-3456 sean la misma persona.
create or replace function public.auction_phone_key(p_phone text)
returns text language sql immutable as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
$$;

-- Cierra las subastas cuyo tiempo ya venció y deja marcado al ganador.
create or replace function public.auction_finalize_due()
returns void language plpgsql security definer set search_path to 'public' as $$
declare a record; top record;
begin
  for a in select id from public.auctions where status = 'activa' and ends_at <= now() loop
    select id into top from public.auction_bids
      where auction_id = a.id and voided = false
      order by amount desc, created_at asc limit 1;
    update public.auctions
      set status = 'finalizada', winner_bid_id = top.id, updated_at = now()
      where id = a.id;
  end loop;
end;
$$;

-- ---------- Registro de postores ----------

-- Registra (o recupera) un postor. Si el teléfono ya compró alguna vez,
-- queda aprobado al instante; si no, queda pendiente de que lo apruebes.
create or replace function public.auction_register_bidder(p_name text, p_phone text)
returns table (token text, status text, name text)
language plpgsql security definer set search_path to 'public' as $$
declare
  v_key text := public.auction_phone_key(p_phone);
  v_row public.auction_bidders%rowtype;
  v_is_customer boolean := false;
begin
  if coalesce(trim(p_name), '') = '' or length(v_key) < 8 then
    raise exception 'Necesitamos tu nombre y un WhatsApp válido.';
  end if;

  select * into v_row from public.auction_bidders where phone_key = v_key;
  if found then
    -- Si estaba bloqueado, sigue bloqueado.
    return query select v_row.token, v_row.status, v_row.name;
    return;
  end if;

  -- ¿Ya te compró? (pedido pagado con ese teléfono)
  select exists (
    select 1 from public.orders o
    where o.payment_status = 'paid'
      and public.auction_phone_key(o.customer_phone) = v_key
  ) into v_is_customer;

  insert into public.auction_bidders (name, phone, phone_key, status, is_customer)
  values (trim(p_name), trim(p_phone), v_key,
          case when v_is_customer then 'aprobado' else 'pendiente' end,
          v_is_customer)
  returning * into v_row;

  if v_is_customer then
    update public.auction_bidders set approved_at = now() where id = v_row.id;
  end if;

  return query select v_row.token, v_row.status, v_row.name;
end;
$$;

-- ---------- Estado público de una subasta ----------

create or replace function public.auction_state(p_slug text, p_token text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  a public.auctions%rowtype;
  v_current numeric;
  v_bids jsonb;
  v_me public.auction_bidders%rowtype;
  v_top_bidder uuid;
begin
  perform public.auction_finalize_due();

  select * into a from public.auctions where slug = p_slug;
  if not found or a.status = 'borrador' or a.status = 'cancelada' then
    return null;
  end if;

  select coalesce(max(amount), 0) into v_current
    from public.auction_bids where auction_id = a.id and voided = false;

  select bidder_id into v_top_bidder from public.auction_bids
    where auction_id = a.id and voided = false
    order by amount desc, created_at asc limit 1;

  -- Historial público: sólo el nombre de pila y la inicial del apellido.
  select coalesce(jsonb_agg(x order by x.amount desc), '[]'::jsonb) into v_bids from (
    select b.amount,
           b.created_at,
           split_part(bd.name, ' ', 1) ||
             case when position(' ' in bd.name) > 0
                  then ' ' || upper(left(split_part(bd.name, ' ', 2), 1)) || '.'
                  else '' end as who
    from public.auction_bids b
    join public.auction_bidders bd on bd.id = b.bidder_id
    where b.auction_id = a.id and b.voided = false
    order by b.amount desc limit 12
  ) x;

  if p_token is not null then
    select * into v_me from public.auction_bidders where token = p_token;
  end if;

  return jsonb_build_object(
    'slug', a.slug,
    'title', a.title,
    'description', a.description,
    'image_url', a.image_url,
    'size', a.size,
    'status', a.status,
    'start_price', a.start_price,
    'min_increment', a.min_increment,
    'max_bid', a.max_bid,
    'ends_at', a.ends_at,
    'server_now', now(),
    'current_price', greatest(v_current, a.start_price),
    'has_bids', v_current > 0,
    'next_min', case when v_current > 0 then v_current + a.min_increment else a.start_price end,
    'bid_count', (select count(*) from public.auction_bids where auction_id = a.id and voided = false),
    'bids', v_bids,
    'winner', case when a.status = 'finalizada' then (
        select split_part(bd.name, ' ', 1) || ' ' ||
               coalesce(upper(left(split_part(bd.name, ' ', 2), 1)) || '.', '')
        from public.auction_bids b join public.auction_bidders bd on bd.id = b.bidder_id
        where b.id = a.winner_bid_id
      ) else null end,
    'me', case when v_me.id is null then null else jsonb_build_object(
        'name', v_me.name,
        'status', v_me.status,
        'is_top', (v_top_bidder = v_me.id)
      ) end
  );
end;
$$;

-- ---------- Pujar ----------

create or replace function public.auction_place_bid(p_slug text, p_token text, p_amount numeric, p_ip text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  a public.auctions%rowtype;
  b public.auction_bidders%rowtype;
  v_current numeric;
  v_top uuid;
  v_last timestamptz;
  v_min numeric;
begin
  select * into b from public.auction_bidders where token = p_token;
  if not found then raise exception 'Registrate para poder pujar.'; end if;
  if b.status = 'bloqueado' then raise exception 'Tu cuenta no está habilitada para pujar.'; end if;
  if b.status <> 'aprobado' then raise exception 'Todavía no te habilitamos. Te avisamos por WhatsApp apenas te aprobemos.'; end if;

  -- Bloqueo de fila: dos pujas simultáneas se ordenan, no se pisan.
  select * into a from public.auctions where slug = p_slug for update;
  if not found then raise exception 'No encontramos la subasta.'; end if;
  if a.status <> 'activa' then raise exception 'La subasta no está abierta.'; end if;
  if now() >= a.ends_at then
    perform public.auction_finalize_due();
    raise exception 'La subasta ya terminó.';
  end if;

  -- Freno de frecuencia: una puja cada 3 segundos por persona.
  select max(created_at) into v_last from public.auction_bids
    where bidder_id = b.id and auction_id = a.id;
  if v_last is not null and now() - v_last < interval '3 seconds' then
    raise exception 'Esperá unos segundos antes de volver a pujar.';
  end if;

  select coalesce(max(amount), 0) into v_current
    from public.auction_bids where auction_id = a.id and voided = false;
  select bidder_id into v_top from public.auction_bids
    where auction_id = a.id and voided = false
    order by amount desc, created_at asc limit 1;

  if v_top = b.id then
    raise exception 'Ya sos el que va ganando.';
  end if;

  v_min := case when v_current > 0 then v_current + a.min_increment else a.start_price end;
  if p_amount < v_min then
    raise exception 'La puja mínima ahora es $%.', trim(to_char(v_min, 'FM999G999G999'));
  end if;
  if a.max_bid is not null and p_amount > a.max_bid then
    raise exception 'El máximo por puja es $%.', trim(to_char(a.max_bid, 'FM999G999G999'));
  end if;

  insert into public.auction_bids (auction_id, bidder_id, amount, ip)
  values (a.id, b.id, p_amount, p_ip);

  -- Anti-sniping: si pujaron sobre la hora, se estira el cierre.
  if a.ends_at - now() < make_interval(secs => a.anti_snipe_seconds) then
    update public.auctions
      set ends_at = now() + make_interval(secs => a.anti_snipe_seconds), updated_at = now()
      where id = a.id;
  end if;

  return public.auction_state(p_slug, p_token);
end;
$$;

-- ---------- Permisos ----------
revoke all on function public.auction_register_bidder(text, text) from public;
revoke all on function public.auction_state(text, text) from public;
revoke all on function public.auction_place_bid(text, text, numeric, text) from public;
grant execute on function public.auction_register_bidder(text, text) to anon, authenticated;
grant execute on function public.auction_state(text, text) to anon, authenticated;
grant execute on function public.auction_place_bid(text, text, numeric, text) to anon, authenticated;
grant execute on function public.auction_finalize_due() to anon, authenticated;
