import type { PGlite } from '@electric-sql/pglite'
import { A, B, asUser, createDb, one as oneRow } from './helpers'

let db: PGlite; let tenant: string; let patient: string; let service: string
const one = <T>(sql: string, p: unknown[] = []) => oneRow<T>(db, sql, p)

beforeAll(async () => {
  db = await createDb(); await asUser(db, A)
  tenant = (await one<{ create_tenant: string }>("select create_tenant('Clínica A')")).create_tenant
  const client = await one<{ id: string }>("insert into clients(tenant_id, full_name) values ($1,'Ana') returning id", [tenant])
  patient = (await one<{ id: string }>("insert into patients(tenant_id, client_id, name, species) values ($1,$2,'Rocky','Perro') returning id", [tenant, client.id])).id
  service = (await one<{ id: string }>("insert into grooming_services(tenant_id, name, price_small, price_medium, price_large) values ($1,'Baño',10,15,20) returning id", [tenant])).id
})

const consult = (reason: string, extra: Record<string, unknown> = {}) => {
  const cols = ['tenant_id', 'patient_id', 'reason', ...Object.keys(extra)]
  const vals = [tenant, patient, reason, ...Object.values(extra)]
  return one<{ id: string }>(`insert into consultations(${cols.join(',')}) values (${vals.map((_, i) => `$${i + 1}`).join(',')}) returning id`, vals)
}
const control = (origin: string | null) => one<{ id: string }>(
  "insert into appointments(tenant_id, patient_id, kind, starts_at, notes, follow_up_of) values ($1,$2,'consulta', now() + interval '7 days', 'Control', $3) returning id", [tenant, patient, origin])

describe('agenda (base de datos)', () => {
  it('agenda un control enlazado a la consulta de origen, sin tamaño ni cobro', async () => {
    const origin = await consult('Otitis')
    const { id } = await control(origin.id)
    const row = await one<{ kind: string; size: string | null; follow_up_of: string }>('select kind, size, follow_up_of from appointments where id = $1', [id])
    expect(row).toEqual({ kind: 'consulta', size: null, follow_up_of: origin.id })
  })

  it('completa el control al registrar la consulta, con su evolución', async () => {
    const origin = await consult('Otitis')
    const { id } = await control(origin.id)
    await db.query("update appointments set status = 'completada' where id = $1", [id])
    const followUp = await consult('Control de otitis', { appointment_id: id, evolution: 'mejoro' })
    const row = await one<{ status: string; completed_at: string | null }>('select status, completed_at from appointments where id = $1', [id])
    expect(row.status).toBe('completada'); expect(row.completed_at).not.toBeNull()
    expect((await one<{ evolution: string }>('select evolution from consultations where id = $1', [followUp.id])).evolution).toBe('mejoro')
  })

  it('marca «no vino» y el recordatorio enviado', async () => {
    const { id } = await control(null)
    await db.query("update appointments set status = 'no_asistio', reminded_at = now() where id = $1", [id])
    const row = await one<{ status: string; reminded_at: string | null }>('select status, reminded_at from appointments where id = $1', [id])
    expect(row.status).toBe('no_asistio'); expect(row.reminded_at).not.toBeNull()
  })

  it('rechaza evoluciones desconocidas', async () => {
    await expect(consult('Control', { evolution: 'regular' })).rejects.toThrow(/consultation_evolution_chk/)
  })

  it('la peluquería sigue exigiendo tamaño y cobro; la consulta no lleva servicio', async () => {
    await expect(db.query("insert into appointments(tenant_id, patient_id, kind, service_id, starts_at) values ($1,$2,'peluqueria',$3, now())", [tenant, patient, service]))
      .rejects.toThrow(/appt_grooming_needs_size/)
    await expect(db.query("insert into appointments(tenant_id, patient_id, kind, service_id, starts_at) values ($1,$2,'consulta',$3, now())", [tenant, patient, service]))
      .rejects.toThrow(/appt_service_only_grooming/)
  })

  it('al borrar la consulta de origen, el control queda sin enlace en vez de desaparecer', async () => {
    const origin = await consult('Vacuna')
    const { id } = await control(origin.id)
    await db.query('delete from consultations where id = $1', [origin.id])
    expect((await one<{ follow_up_of: string | null }>('select follow_up_of from appointments where id = $1', [id])).follow_up_of).toBeNull()
  })

  it('otro negocio no ve los controles', async () => {
    await control(null)
    await asUser(db, B)
    expect((await db.query('select id from appointments')).rows).toHaveLength(0)
    await asUser(db, A)
  })
})
