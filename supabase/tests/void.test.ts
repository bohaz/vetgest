// Anulación de ventas: repone stock, solo owner/admin y las ventas no se tocan por fuera de las funciones.
import type { PGlite } from '@electric-sql/pglite'
import { A, B, asUser, createDb, one as oneRow } from './helpers'

let db: PGlite; let tA: string; let pid: string
const as = (uid: string | null) => asUser(db, uid)
const one = <T>(sql: string, p: unknown[] = []) => oneRow<T>(db, sql, p)
const stock = async () => Number((await one<{ stock: string }>('select stock from products where id = $1', [pid])).stock)
const sell = async (qty: number) => (await one<{ register_sale: string }>(
  "select register_sale($1, null, 'efectivo_usd', $2::jsonb)", [tA, JSON.stringify([{ product_id: pid, qty }])])).register_sale

beforeAll(async () => {
  db = await createDb(); await as(A)
  tA = (await one<{ create_tenant: string }>("select create_tenant('Vet A')")).create_tenant
  pid = (await one<{ id: string }>("insert into products(tenant_id, name, category, price_usd, stock) values ($1,'Vacuna X','farmaco',10,10) returning id", [tA])).id
})

describe('anulación de ventas', () => {
  it('repone el stock y registra motivo, fecha y usuario', async () => {
    await as(A)
    const sid = await sell(3); expect(await stock()).toBe(7)
    await db.query('select void_sale($1, $2)', [sid, '  Cliente devolvió el producto  '])
    expect(await stock()).toBe(10)
    const s = await one<{ voided_at: string | null; void_reason: string; voided_by: string }>('select voided_at, void_reason, voided_by from sales where id = $1', [sid])
    expect(s.voided_at).not.toBeNull(); expect(s.void_reason).toBe('Cliente devolvió el producto'); expect(s.voided_by).toBe(A)
  })
  it('no anula dos veces ni sin motivo', async () => {
    await as(A)
    const sid = await sell(1)
    await expect(db.query('select void_sale($1, $2)', [sid, '   '])).rejects.toThrow(/motivo_requerido/)
    await db.query('select void_sale($1, $2)', [sid, 'Error de cobro'])
    await expect(db.query('select void_sale($1, $2)', [sid, 'Otra vez'])).rejects.toThrow(/venta_ya_anulada/)
    expect(await stock()).toBe(10)
  })
  it('impide editar o borrar ventas directamente', async () => {
    await as(A)
    const sid = await sell(2)
    await db.query('update sales set total_usd = 0 where id = $1', [sid])
    await db.query('delete from sales where id = $1', [sid])
    await db.query('delete from sale_items where sale_id = $1', [sid])
    const s = await one<{ total_usd: string; items: string }>('select total_usd, (select count(*) from sale_items where sale_id = $1) as items from sales where id = $1', [sid])
    expect(Number(s.total_usd)).toBe(20); expect(Number(s.items)).toBe(1)
  })
  it('otro negocio no ve la venta y el personal sin rol de admin no puede anular', async () => {
    await as(A); const sid = await sell(1)
    await as(B)
    await expect(db.query('select void_sale($1, $2)', [sid, 'x'])).rejects.toThrow(/venta_no_existe/)
    await db.exec(`reset role; insert into members(tenant_id, user_id, role) values ('${tA}', '${B}', 'staff')`)
    await as(B)
    await expect(db.query('select void_sale($1, $2)', [sid, 'x'])).rejects.toThrow(/no_autorizado/)
  })
})
