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
