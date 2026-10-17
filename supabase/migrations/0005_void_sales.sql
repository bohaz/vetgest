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
