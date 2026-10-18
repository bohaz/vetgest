-- VetGest: esquema completo. Generado con `npm run db:bundle` a partir de supabase/migrations (no editar a mano).
-- Pégalo completo en Supabase → SQL Editor → Run, una sola vez, en un proyecto nuevo.

-- ===== 0001_init.sql =====
-- VetGest: esquema multitenant. Cada fila de negocio lleva tenant_id y RLS.
create extension if not exists pgcrypto;
create type member_role as enum ('owner','admin','staff');
create type product_category as enum ('farmaco','alimento','agropecuario','accesorio');
create type appointment_status as enum ('pendiente','en_proceso','completada','cancelada');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trial_ends_at timestamptz not null default now() + interval '7 days',
  subscription_until timestamptz,          -- lo activas tú al confirmar el pago
  created_at timestamptz not null default now()
);
create table members (
  tenant_id uuid references tenants on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role member_role not null default 'staff',
  primary key (tenant_id, user_id)
);

create function my_tenants() returns setof uuid language sql stable security definer set search_path = public
as $$ select tenant_id from members where user_id = auth.uid() $$;

create function tenant_active(t uuid) returns boolean language sql stable security definer set search_path = public
as $$ select greatest(trial_ends_at, coalesce(subscription_until, trial_ends_at)) > now() from tenants where id = t $$;

create function create_tenant(p_name text) returns uuid language plpgsql security definer set search_path = public
as $$ declare t uuid; begin
  insert into tenants(name) values (p_name) returning id into t;
  insert into members(tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  return t; end $$;

create table clients (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  full_name text not null, phone text, email text, notes text, created_at timestamptz not null default now());
create table patients (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  client_id uuid not null references clients on delete cascade, name text not null, species text not null, breed text,
  birth_date date, weight_kg numeric, notes text, created_at timestamptz not null default now());
create table consultations (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  patient_id uuid not null references patients on delete cascade, visit_date timestamptz not null default now(),
  reason text, diagnosis text, treatment text, price_usd numeric default 0, created_at timestamptz not null default now());
create table products (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  name text not null, category product_category not null, sku text, price_usd numeric not null default 0,
  stock numeric not null default 0, min_stock numeric not null default 0, created_at timestamptz not null default now());
create table sales (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  client_id uuid references clients, total_usd numeric not null default 0, rate_bs numeric, pay_method text,
  created_at timestamptz not null default now());
create table sale_items (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  sale_id uuid not null references sales on delete cascade, product_id uuid not null references products,
  qty numeric not null, unit_price_usd numeric not null, created_at timestamptz not null default now());
create table grooming_services (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  name text not null, price_usd numeric not null default 0, duration_min int not null default 60, created_at timestamptz not null default now());
create table grooming_appointments (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants on delete cascade,
  patient_id uuid not null references patients on delete cascade, service_id uuid references grooming_services,
  starts_at timestamptz not null, status appointment_status not null default 'pendiente', notes text, created_at timestamptz not null default now());

create function touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create function apply_sale_item_stock() returns trigger language plpgsql as $$
begin update products set stock = stock - new.qty where id = new.product_id; return new; end $$;
create trigger sale_items_stock after insert on sale_items for each row execute function apply_sale_item_stock();

-- DRY: columnas de sync, trigger y políticas RLS para todas las tablas de negocio
do $$ declare t text; begin
  foreach t in array array['clients','patients','consultations','products','sales','sale_items','grooming_services','grooming_appointments'] loop
    execute format('alter table %I add column updated_at timestamptz not null default now()', t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
    execute format('create index on %I (tenant_id, updated_at)', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_sel on %I for select using (tenant_id in (select my_tenants()))', t, t);
    execute format('create policy %I_ins on %I for insert with check (tenant_id in (select my_tenants()) and tenant_active(tenant_id))', t, t);
    execute format('create policy %I_upd on %I for update using (tenant_id in (select my_tenants())) with check (tenant_active(tenant_id))', t, t);
    execute format('create policy %I_del on %I for delete using (tenant_id in (select my_tenants()) and tenant_active(tenant_id))', t, t);
  end loop;
end $$;

alter table tenants enable row level security;
alter table members enable row level security;
create policy tenants_sel on tenants for select using (id in (select my_tenants()));
create policy members_sel on members for select using (tenant_id in (select my_tenants()));

-- ===== 0002_indexes.sql =====
create index if not exists patients_client_idx on patients (client_id);
create index if not exists consultations_patient_idx on consultations (patient_id, visit_date desc);

-- ===== 0003_inventory_sales.sql =====
-- Tasa del día, stock nunca negativo y ventas atómicas vía función (no inserts directos)
alter table tenants add column rate_bs numeric check (rate_bs > 0);
alter table products add constraint products_stock_nonneg check (stock >= 0);
alter table sales add constraint sales_pay_method_chk check (pay_method in ('efectivo_usd','efectivo_bs','pago_movil','zelle_binance'));
drop policy sales_ins on sales;
drop policy sale_items_ins on sale_items;

create function set_exchange_rate(p_tenant uuid, p_rate numeric) returns void language plpgsql security definer set search_path = public
as $$ begin
  if not exists (select 1 from members where tenant_id = p_tenant and user_id = auth.uid() and role in ('owner','admin')) then raise exception 'no_autorizado'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'tasa_invalida'; end if;
  update tenants set rate_bs = p_rate where id = p_tenant;
end $$;

create function register_sale(p_tenant uuid, p_client uuid, p_method text, p_items jsonb) returns uuid language plpgsql security definer set search_path = public
as $$
declare s uuid; it jsonb; prod products; total numeric := 0; r numeric; q numeric;
begin
  if p_tenant not in (select my_tenants()) then raise exception 'no_autorizado'; end if;
  if not tenant_active(p_tenant) then raise exception 'suscripcion_vencida'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'venta_vacia'; end if;
  select rate_bs into r from tenants where id = p_tenant;
  insert into sales(tenant_id, client_id, pay_method, rate_bs, total_usd) values (p_tenant, p_client, p_method, r, 0) returning id into s;
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::numeric;
    if q is null or q <= 0 then raise exception 'cantidad_invalida'; end if;
    select * into prod from products where id = (it->>'product_id')::uuid and tenant_id = p_tenant for update;
    if not found then raise exception 'producto_no_existe'; end if;
    if prod.stock < q then raise exception 'stock_insuficiente:%', prod.name; end if;
    insert into sale_items(tenant_id, sale_id, product_id, qty, unit_price_usd) values (p_tenant, s, prod.id, q, prod.price_usd);
    total := total + round(q * prod.price_usd, 2);
  end loop;
  update sales set total_usd = total where id = s;
  return s;
end $$;

-- ===== 0004_grooming.sql =====
-- Peluquería: precio por tamaño, cobro al completar y precio fijado al agendar
create type pet_size as enum ('pequeno','mediano','grande');
alter table patients add column size pet_size;

alter table grooming_services
  add column price_small numeric not null default 0, add column price_medium numeric not null default 0, add column price_large numeric not null default 0;
update grooming_services set price_small = price_usd, price_medium = price_usd, price_large = price_usd;
alter table grooming_services drop column price_usd;

alter table grooming_appointments
  add column size pet_size not null default 'mediano', add column price_usd numeric,
  add column paid_usd numeric check (paid_usd >= 0), add column pay_method text, add column completed_at timestamptz;
alter table grooming_appointments add constraint appt_pay_method_chk
  check (pay_method is null or pay_method in ('efectivo_usd','efectivo_bs','pago_movil','zelle_binance'));
alter table grooming_appointments add constraint appt_completed_needs_payment
  check (status <> 'completada' or (paid_usd is not null and pay_method is not null));

create function grooming_set_price() returns trigger language plpgsql as $$
begin
  if new.price_usd is null and new.service_id is not null then
    select case new.size when 'pequeno' then price_small when 'mediano' then price_medium else price_large end
      into new.price_usd from grooming_services where id = new.service_id and tenant_id = new.tenant_id;
  end if;
  if new.status = 'completada' and new.completed_at is null then new.completed_at := now(); end if;
  return new;
end $$;
create trigger grooming_price before insert or update on grooming_appointments for each row execute function grooming_set_price();

-- ===== 0005_void_sales.sql =====
-- Anulación de ventas: la única forma de deshacer una venta. Repone el stock y deja registro de quién, cuándo y por qué.
alter table sales add column voided_at timestamptz, add column void_reason text, add column voided_by uuid references auth.users;

-- Las ventas ya no se editan ni se borran directamente: solo se crean con register_sale y se anulan con void_sale.
drop policy sales_upd on sales;
drop policy sales_del on sales;
drop policy sale_items_upd on sale_items;
drop policy sale_items_del on sale_items;

create function void_sale(p_sale uuid, p_reason text) returns void language plpgsql security definer set search_path = public
as $$
declare s sales;
begin
  select * into s from sales where id = p_sale for update;
  if not found or s.tenant_id not in (select my_tenants()) then raise exception 'venta_no_existe'; end if;
  if not exists (select 1 from members where tenant_id = s.tenant_id and user_id = auth.uid() and role in ('owner','admin')) then raise exception 'no_autorizado'; end if;
  if not tenant_active(s.tenant_id) then raise exception 'suscripcion_vencida'; end if;
  if s.voided_at is not null then raise exception 'venta_ya_anulada'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'motivo_requerido'; end if;

  update products p set stock = p.stock + i.qty
    from (select product_id, sum(qty) as qty from sale_items where sale_id = p_sale group by product_id) i
    where p.id = i.product_id;
  update sales set voided_at = now(), void_reason = trim(p_reason), voided_by = auth.uid() where id = p_sale;
end $$;

-- ===== 0006_grants.sql =====
-- Permisos explícitos para el rol de usuarios con sesión. Algunos proyectos nuevos de Supabase no exponen
-- automáticamente las tablas creadas por SQL; con esto la app funciona igual. RLS sigue decidiendo qué filas ve cada negocio.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ===== 0007_pilot_codes.sql =====
-- Códigos de piloto: dan un periodo de prueba más largo a las clínicas invitadas.
-- Se crean desde el SQL Editor, por ejemplo:
--   insert into pilot_codes (code, trial_days, max_uses) values ('PILOTO-SANRAFAEL', 30, 1);
create table pilot_codes (
  code text primary key check (code = upper(code) and length(code) between 4 and 40),
  trial_days int not null check (trial_days between 1 and 365),
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
-- Sin políticas: nadie lo lee directamente; solo create_tenant (security definer).
alter table pilot_codes enable row level security;
alter table tenants add column pilot_code text references pilot_codes;

drop function create_tenant(text);
create function create_tenant(p_name text, p_code text default null) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
  c pilot_codes;
  days int := 7;
  code_in text := upper(nullif(trim(coalesce(p_code, '')), ''));
begin
  if auth.uid() is null then raise exception 'no_autorizado'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'nombre_requerido'; end if;
  -- Una cuenta, un negocio: evita encadenar periodos de prueba.
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'ya_tiene_negocio'; end if;
  if code_in is not null then
    select * into c from pilot_codes where code = code_in for update;
    if not found or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then
      raise exception 'codigo_invalido';
    end if;
    update pilot_codes set uses = uses + 1 where code = c.code;
    days := c.trial_days;
  end if;
  insert into tenants(name, trial_ends_at, pilot_code) values (trim(p_name), now() + make_interval(days => days), c.code) returning id into t;
  insert into members(tenant_id, user_id, role) values (t, auth.uid(), 'owner');
  return t;
end $$;
revoke execute on function create_tenant(text, text) from public;
grant execute on function create_tenant(text, text) to authenticated;

-- ===== 0008_agenda.sql =====
-- Agenda única: la peluquería y los controles de consulta comparten la misma agenda.
-- Un control nace de una consulta (follow_up_of) y, al atenderlo, la consulta nueva queda enlazada a la cita (appointment_id).
alter table grooming_appointments rename to appointments;
alter trigger grooming_appointments_touch on appointments rename to appointments_touch;
alter trigger grooming_price on appointments rename to appointments_grooming_price;
alter index grooming_appointments_tenant_id_updated_at_idx rename to appointments_tenant_id_updated_at_idx;
alter policy grooming_appointments_sel on appointments rename to appointments_sel;
alter policy grooming_appointments_ins on appointments rename to appointments_ins;
alter policy grooming_appointments_upd on appointments rename to appointments_upd;
alter policy grooming_appointments_del on appointments rename to appointments_del;

create type appointment_kind as enum ('consulta','peluqueria');
-- «No vino»: el paciente no se presentó. Queda en la lista para volver a agendarlo.
alter type appointment_status add value 'no_asistio' after 'completada';

alter table appointments
  add column kind appointment_kind not null default 'peluqueria',
  add column follow_up_of uuid references consultations on delete set null,
  add column reminded_at timestamptz;
create index appointments_day_idx on appointments (tenant_id, starts_at);

-- Tamaño, servicio y cobro son propios de la peluquería; una consulta se cobra en su registro clínico.
alter table appointments alter column size drop not null, alter column size drop default;
alter table appointments drop constraint appt_completed_needs_payment;
alter table appointments
  add constraint appt_grooming_needs_size check (kind <> 'peluqueria' or size is not null),
  add constraint appt_service_only_grooming check (kind = 'peluqueria' or service_id is null),
  add constraint appt_completed_needs_payment check (kind <> 'peluqueria' or status <> 'completada' or (paid_usd is not null and pay_method is not null));

-- Evolución registrada en la consulta de control.
alter table consultations
  add column appointment_id uuid references appointments on delete set null,
  add column evolution text constraint consultation_evolution_chk check (evolution is null or evolution in ('mejoro','igual','empeoro','alta'));
create index consultations_appointment_idx on consultations (appointment_id) where appointment_id is not null;

grant select, insert, update, delete on appointments to authenticated;
