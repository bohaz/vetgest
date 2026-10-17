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
