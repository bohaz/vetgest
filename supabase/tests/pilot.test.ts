// Códigos de piloto y alta de negocios.
import type { PGlite } from '@electric-sql/pglite'
import { A, B, asUser, createDb, one as oneRow } from './helpers'

let db: PGlite
const one = <T>(sql: string, p: unknown[] = []) => oneRow<T>(db, sql, p)
const trialDays = async (tenant: string) =>
  Math.round(Number((await one<{ d: string }>("select extract(epoch from trial_ends_at - now()) / 86400 as d from tenants where id = $1", [tenant])).d))
const create = (name: string, code: string | null = null) =>
  one<{ create_tenant: string }>('select create_tenant($1, $2)', [name, code]).then(r => r.create_tenant)

beforeEach(async () => {
  db = await createDb()
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-00000000000c');
    insert into pilot_codes (code, trial_days, max_uses) values ('PILOTO-30', 30, 1), ('VENCIDO', 30, 5);
    update pilot_codes set expires_at = now() - interval '1 day' where code = 'VENCIDO';`)
})

describe('alta de negocio y códigos de piloto', () => {
  it('sin código da 7 días de prueba', async () => {
    await asUser(db, A)
    expect(await trialDays(await create('Vet A'))).toBe(7)
  })
  it('con código válido da los días del código, sin importar mayúsculas ni espacios, y lo consume', async () => {
    await asUser(db, A)
    const t = await create('Vet A', '  piloto-30 ')
    expect(await trialDays(t)).toBe(30)
    await db.exec('reset role')
    expect(Number((await one<{ uses: number }>("select uses from pilot_codes where code = 'PILOTO-30'")).uses)).toBe(1)
    expect((await one<{ pilot_code: string }>('select pilot_code from tenants where id = $1', [t])).pilot_code).toBe('PILOTO-30')
  })
  it('rechaza códigos agotados, vencidos o inexistentes sin crear el negocio', async () => {
    await asUser(db, A); await create('Vet A', 'PILOTO-30')
    await asUser(db, B)
    await expect(create('Vet B', 'PILOTO-30')).rejects.toThrow(/codigo_invalido/)
    await expect(create('Vet B', 'VENCIDO')).rejects.toThrow(/codigo_invalido/)
    await expect(create('Vet B', 'NO-EXISTE')).rejects.toThrow(/codigo_invalido/)
    await db.exec('reset role')
    expect(Number((await one<{ n: string }>('select count(*) as n from tenants')).n)).toBe(1)
  })
  it('una cuenta no puede crear un segundo negocio ni dejar el nombre vacío', async () => {
    await asUser(db, A); await create('Vet A')
    await expect(create('Otra')).rejects.toThrow(/ya_tiene_negocio/)
    await asUser(db, B)
    await expect(create('   ')).rejects.toThrow(/nombre_requerido/)
  })
  it('los usuarios no pueden leer ni crear códigos', async () => {
    await asUser(db, A)
    expect((await db.query('select * from pilot_codes')).rows).toHaveLength(0)
    await expect(db.query("insert into pilot_codes (code, trial_days) values ('MIO', 365)")).rejects.toThrow()
  })
})
