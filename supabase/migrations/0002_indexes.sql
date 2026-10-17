create index if not exists patients_client_idx on patients (client_id);
create index if not exists consultations_patient_idx on consultations (patient_id, visit_date desc);
