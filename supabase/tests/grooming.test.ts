import type { PGlite } from '@electric-sql/pglite'
import { A, asUser, createDb, one as oneRow } from './helpers'

let db: PGlite; let tenant: string; let patient: string; let service: string
const one = <T>(sql: string, p: unknown[] = []) => oneRow<T>(db, sql, p)
const book = (size: string) => one<{ id: string; price_usd: string | null }>(
  "insert into grooming_appointments(tenant_id, patient_id, service_id, starts_at, size) values ($1,$2,$3, now() + interval '1 day', $4) returning id, price_usd", [tenant, patient, service, size])

beforeAll(async () => {
  db = await createDb(); await asUser(db, A)
  tenant = (await one<{ create_tenant: string }>("select create_tenant('Peluquería A')")).create_tenant
  const client = await one<{ id: string }>("insert into clients(tenant_id, full_name) values ($1,'Ana') returning id", [tenant])
  patient = (await one<{ id: string }>("insert into patients(tenant_id, client_id, name, species, size) values ($1,$2,'Rocky','Perro','grande') returning id", [tenant, client.id])).id
  service = (await one<{ id: string }>("insert into grooming_services(tenant_id, name, price_small, price_medium, price_large, duration_min) values ($1,'Baño y corte',20,30,45,60) returning id", [tenant])).id
})

describe('peluquería (base de datos)', () => {
  it('fija el precio de la cita según el tamaño', async () => {
    expect(Number((await book('pequeno')).price_usd)).toBe(20)
    expect(Number((await book('mediano')).price_usd)).toBe(30)
    expect(Number((await book('grande')).price_usd)).toBe(45)
  })
  it('exige monto y método de pago para completar la cita', async () => {
    const { id } = await book('mediano')
    await expect(db.query("update grooming_appointments set status = 'completada' where id = $1", [id])).rejects.toThrow(/appt_completed_needs_payment/)
    await db.query("update grooming_appointments set status = 'completada', paid_usd = 30, pay_method = 'pago_movil' where id = $1", [id])
    const row = await one<{ status: string; completed_at: string | null }>('select status, completed_at from grooming_appointments where id = $1', [id])
    expect(row.status).toBe('completada'); expect(row.completed_at).not.toBeNull()
  })
  it('rechaza métodos de pago desconocidos y montos negativos', async () => {
    const { id } = await book('mediano')
    await expect(db.query("update grooming_appointments set paid_usd = 5, pay_method = 'cheque' where id = $1", [id])).rejects.toThrow(/appt_pay_method_chk/)
    await expect(db.query("update grooming_appointments set paid_usd = -1 where id = $1", [id])).rejects.toThrow()
  })
})
