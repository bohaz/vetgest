// Ejecuta las migraciones reales en Postgres (PGlite) y prueba RLS, ventas y suscripción.
import type { PGlite } from '@electric-sql/pglite'
import { A, B, asUser, createDb, one as oneRow } from './helpers'

let db: PGlite; let tA: string; let pid: string
const as = (uid: string | null) => asUser(db, uid)
const one = <T>(sql: string, p: unknown[] = []) => oneRow<T>(db, sql, p)

beforeAll(async () => {
  db = await createDb()
  await as(A)
  tA = (await one<{ create_tenant: string }>("select create_tenant('Vet A')")).create_tenant
  pid = (await one<{ id: string }>("insert into products(tenant_id, name, category, price_usd, stock) values ($1,'Vacuna X','farmaco',10,5) returning id", [tA])).id
  await db.query('select set_exchange_rate($1, 40)', [tA])
})

const items = (qty: number) => JSON.stringify([{ product_id: pid, qty }])

describe('base de datos', () => {
  it('registra la venta, descuenta stock y guarda total y tasa', async () => {
    await as(A)
    const { register_sale: sid } = await one<{ register_sale: string }>("select register_sale($1, null, 'pago_movil', $2::jsonb)", [tA, items(2)])
    const sale = await one<{ total_usd: string; rate_bs: string }>('select total_usd, rate_bs from sales where id = $1', [sid])
    expect(Number(sale.total_usd)).toBe(20); expect(Number(sale.rate_bs)).toBe(40)
    expect(Number((await one<{ stock: string }>('select stock from products where id = $1', [pid])).stock)).toBe(3)
  })
  it('bloquea vender más del stock y no altera el inventario', async () => {
    await as(A)
    await expect(db.query("select register_sale($1, null, 'efectivo_usd', $2::jsonb)", [tA, items(99)])).rejects.toThrow(/stock_insuficiente/)
    expect(Number((await one<{ stock: string }>('select stock from products where id = $1', [pid])).stock)).toBe(3)
  })
  it('rechaza inserts directos en sales (solo por register_sale)', async () => {
    await as(A)
    await expect(db.query("insert into sales(tenant_id, total_usd, pay_method) values ($1, 1, 'efectivo_usd')", [tA])).rejects.toThrow(/row-level security/)
  })
  it('aísla los negocios entre sí', async () => {
    await as(B)
    expect(Number((await one<{ count: string }>('select count(*) from products')).count)).toBe(0)
    await expect(db.query("select register_sale($1, null, 'efectivo_usd', $2::jsonb)", [tA, items(1)])).rejects.toThrow(/no_autorizado/)
  })
  it('bloquea escrituras con la prueba vencida y las reactiva al pagar', async () => {
    await db.exec(`reset role; update tenants set trial_ends_at = now() - interval '1 day' where id = '${tA}'`)
    await as(A)
    await expect(db.query("insert into clients(tenant_id, full_name) values ($1, 'Ana')", [tA])).rejects.toThrow(/row-level security/)
    await expect(db.query("select register_sale($1, null, 'efectivo_usd', $2::jsonb)", [tA, items(1)])).rejects.toThrow(/suscripcion_vencida/)
    await db.exec(`reset role; update tenants set subscription_until = now() + interval '30 days' where id = '${tA}'`)
    await as(A)
    await db.query("insert into clients(tenant_id, full_name) values ($1, 'Ana')", [tA])
  })
  it('solo owner o admin cambian la tasa', async () => {
    await db.exec(`reset role; insert into members(tenant_id, user_id, role) values ('${tA}', '${B}', 'staff')`)
    await as(B)
    await expect(db.query('select set_exchange_rate($1, 50)', [tA])).rejects.toThrow(/no_autorizado/)
  })
})
