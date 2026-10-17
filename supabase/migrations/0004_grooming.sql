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
