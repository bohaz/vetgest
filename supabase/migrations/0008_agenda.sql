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
