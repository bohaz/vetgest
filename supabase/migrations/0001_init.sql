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
