// Modo demostración: un "Supabase" dentro del navegador para probar la app sin proyecto real.
// Corre Postgres (PGlite) con las mismas migraciones y reglas de seguridad (RLS) del servidor, guarda los
// datos en el navegador (IndexedDB) y responde a supabase-js con el subconjunto de Auth y PostgREST que usa la app.
// Solo se carga si VITE_DEMO=true; en producción no forma parte de la app.
import type { PGlite } from '@electric-sql/pglite'

import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'
const DB_NAME = 'idb://vetgest-demo'
const migrations = import.meta.glob('/supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

let dbPromise: Promise<PGlite> | null = null
const getDb = () => (dbPromise ??= open())

async function open() {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite(DB_NAME)
  const ready = await db.query<{ ok: boolean }>("select to_regclass('public.tenants') is not null as ok")
  if (!ready.rows[0].ok) await setup(db)
  return db
}

async function setup(db: PGlite) {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key, email text unique, password text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
    create role authenticated; create role anon;`)
  for (const name of Object.keys(migrations).sort()) await db.exec(migrations[name].replace('create extension if not exists pgcrypto;', ''))
  await db.exec(`grant usage on schema public, auth to authenticated, anon; grant all on all tables in schema public to authenticated;
    grant select on auth.users to authenticated; grant execute on all functions in schema public to authenticated;`)
  await seed(db)
}

// ---------- Peticiones (una a la vez: PGlite tiene una sola conexión) ----------
let chain: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>) => { const p = chain.then(fn, fn); chain = p.catch(() => undefined); return p }

const asUser = (db: PGlite, uid: string | null) =>
  db.exec(`reset role; select set_config('request.jwt.sub', '${uid && /^[0-9a-f-]{36}$/.test(uid) ? uid : ''}', false); ${uid ? 'set role authenticated;' : 'set role anon;'}`)
const ident = (s: string) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('identificador inválido'); return `"${s}"` }
const param = (v: unknown) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v)

const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const DAY_S = 86400
const jwt = (u: { id: string; email: string }) =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 30 * DAY_S })}.demo`
function uidFrom(headers: Headers) {
  try {
    const t = (headers.get('authorization') ?? '').split(' ')[1]
    return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub as string
  } catch { return null }
}
const userObj = (u: { id: string; email: string }) => ({ id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() })
const session = (u: { id: string; email: string }) => ({ access_token: jwt(u), token_type: 'bearer', expires_in: 30 * DAY_S, expires_at: Math.floor(Date.now() / 1000) + 30 * DAY_S, refresh_token: 'demo-' + u.id, user: userObj(u) })

async function asJson(db: PGlite, sql: string, vals: unknown[]) {
  return (await db.query<{ j: Record<string, unknown>[] }>(`with t as (${sql}) select coalesce(json_agg(t), '[]'::json) as j from t`, vals)).rows[0].j
}
function filters(params: URLSearchParams) {
  const where: string[] = []; const vals: unknown[] = []
  params.forEach((v, k) => {
    if (['select', 'order', 'limit', 'offset', 'columns'].includes(k)) return
    const m = /^(eq|neq|gt|gte|lt|lte|is)\.(.*)$/.exec(v); if (!m) return
    if (m[1] === 'is') { where.push(`${ident(k)} is ${m[2] === 'null' ? 'null' : 'not null'}`); return }
    const op = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[m[1]]
    vals.push(m[2]); where.push(`${ident(k)}::text ${op} $${vals.length}`)
  })
  return { sql: where.length ? ' where ' + where.join(' and ') : '', vals }
}
const order = (p: URLSearchParams) => { const o = p.get('order'); return o ? ' order by ' + o.split(',').map(x => { const [c, d] = x.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}` }).join(', ') : '' }
const limit = (p: URLSearchParams) => (p.get('limit') ? ` limit ${Number(p.get('limit'))}` : '')

type Out = [number, unknown]

async function rest(db: PGlite, method: string, url: URL, headers: Headers, body: unknown): Promise<Out> {
  const parts = url.pathname.split('/') // ['', 'rest', 'v1', table, fn?]
  const params = url.searchParams
  if (parts[3] === 'rpc') {
    const args = (body ?? {}) as Record<string, unknown>; const keys = Object.keys(args)
    const call = `select ${ident(parts[4])}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ')}) as r`
    const r = (await db.query<{ j: unknown }>(`select to_json(x.r) as j from (${call}) x`, keys.map(k => param(args[k])))).rows[0].j
    return [200, r ?? null]
  }
  const t = ident(parts[3]); const f = filters(params)
  let rows: Record<string, unknown>[] = []
  if (method === 'GET') rows = await asJson(db, `select * from ${t}${f.sql}${order(params)}${limit(params)}`, f.vals)
  else if (method === 'POST') {
    for (const r of (Array.isArray(body) ? body : [body]) as Record<string, unknown>[]) {
      const cols = Object.keys(r).filter(k => r[k] !== undefined)
      rows.push(...await asJson(db, `insert into ${t} (${cols.map(ident).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, cols.map(k => param(r[k]))))
    }
  } else if (method === 'PATCH') {
    const data = body as Record<string, unknown>; const cols = Object.keys(data).filter(k => data[k] !== undefined)
    const set = cols.map((c, i) => `${ident(c)} = $${f.vals.length + i + 1}`).join(', ')
    rows = await asJson(db, `update ${t} set ${set}${f.sql} returning *`, [...f.vals, ...cols.map(k => param(data[k]))])
  } else if (method === 'DELETE') rows = await asJson(db, `delete from ${t}${f.sql} returning *`, f.vals)
  if ((headers.get('accept') ?? '').includes('vnd.pgrst.object')) {
    return rows.length === 1 ? [200, rows[0]] : [406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${rows.length} rows` }]
  }
  return [200, rows]
}

async function auth(db: PGlite, url: URL, headers: Headers, body: Record<string, string> | null): Promise<Out> {
  const path = url.pathname.replace('/auth/v1', '')
  if (path === '/token') {
    const u = (await db.query<{ id: string; email: string }>('select id, email from auth.users where lower(email) = lower($1) and password = $2', [body?.email, body?.password])).rows[0]
    return u ? [200, session(u)] : [400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }]
  }
  if (path === '/signup') {
    const u = { id: crypto.randomUUID(), email: String(body?.email ?? '') }
    await db.query('insert into auth.users values ($1, $2, $3)', [u.id, u.email, body?.password])
    return [200, session(u)]
  }
  if (path === '/user') {
    const u = (await db.query<{ id: string; email: string }>('select id, email from auth.users where id::text = $1', [uidFrom(headers)])).rows[0]
    return u ? [200, userObj(u)] : [401, { msg: 'Sesión no válida' }]
  }
  if (path === '/logout') return [204, null]
  return [400, { msg: 'No disponible en el modo demostración', error_description: 'No disponible en el modo demostración' }]
}

/** `fetch` que supabase-js usa en el modo demostración. */
export const demoFetch: typeof fetch = async (input, init) => {
  const req = new Request(input, init)
  const url = new URL(req.url)
  const raw = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text()
  const body = raw ? JSON.parse(raw) : null
  const db = await getDb()
  const [status, out] = await serial(async (): Promise<Out> => {
    try {
      if (url.pathname.startsWith('/auth/v1')) { await db.exec('reset role'); return await auth(db, url, req.headers, body) }
      await asUser(db, uidFrom(req.headers))
      return await rest(db, req.method, url, req.headers, body)
    } catch (e) {
      const err = e as { message?: string; code?: string; detail?: string }
      return [400, { code: err.code ?? 'P0001', message: err.message ?? String(e), details: err.detail ?? null, hint: null }]
    } finally { await db.exec('reset role').catch(() => undefined) }
  })
  if (status === 204) return new Response(null, { status })
  return new Response(JSON.stringify(out), { status, headers: { 'content-type': 'application/json' } })
}

/** Borra los datos de la demostración y vuelve a cargar los de ejemplo. */
export async function resetDemo() {
  const db = await getDb(); await db.close()
  const names = (await indexedDB.databases()).map(d => d.name ?? '').filter(n => n.includes('vetgest-demo'))
  await Promise.all(names.map(n => new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = () => resolve() })))
}

// ---------- Datos de ejemplo ----------
async function seed(db: PGlite) {
  const DEMO = '11111111-1111-4111-8111-111111111111'
  await db.query('insert into auth.users values ($1, $2, $3)', [DEMO, DEMO_EMAIL, DEMO_PASSWORD])
  await asUser(db, DEMO)
  const one = async <T>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
  const T = (await one<{ id: string }>("select create_tenant('Clínica Veterinaria San Rafael') as id")).id
  await db.query('select set_exchange_rate($1, 36.5)', [T])
  const cl = async (n: string, ph: string) => (await one<{ id: string }>('insert into clients(tenant_id, full_name, phone) values ($1,$2,$3) returning id', [T, n, ph])).id
  const ana = await cl('Ana Pérez', '0412-555 1234'); const luis = await cl('Luis Rodríguez', '0414-222 3344'); const maria = await cl('María González', '0424-765 4321')
  await cl('Finca Los Samanes (José Medina)', '0416-908 7766')
  const pt = async (c: string, n: string, sp: string, br: string | null, w: number, size: string | null) =>
    (await one<{ id: string }>('insert into patients(tenant_id, client_id, name, species, breed, weight_kg, size) values ($1,$2,$3,$4,$5,$6,$7) returning id', [T, c, n, sp, br, w, size])).id
  const rocky = await pt(ana, 'Rocky', 'Perro', 'Golden Retriever', 32, 'grande')
  const luna = await pt(luis, 'Luna', 'Perro', 'Poodle', 6, 'pequeno')
  await pt(maria, 'Michi', 'Gato', 'Mestizo', 4.2, null)
  const toby = await pt(maria, 'Toby', 'Perro', 'Schnauzer', 9, 'mediano')
  await db.query(`insert into consultations(tenant_id, patient_id, visit_date, reason, diagnosis, treatment, price_usd) values
    ($1,$2, now() - interval '20 days', 'Vacunación anual', null, 'Vacuna séxtuple + desparasitación', 25),
    ($1,$2, now() - interval '2 days', 'Otitis en oído derecho', 'Otitis externa bacteriana', 'Limpieza y gotas óticas por 7 días', 30)`, [T, rocky])
  for (const [n, c, p, s, min] of [['Vacuna séxtuple', 'farmaco', 12, 20, 5], ['Desparasitante Drontal', 'farmaco', 4.5, 3, 5], ['Alimento Dog Chow 15 kg', 'alimento', 38, 8, 2],
    ['Ivermectina 1% 50 ml', 'agropecuario', 7, 15, 3], ['Sal mineralizada 25 kg', 'agropecuario', 18, 6, 2], ['Collar antipulgas', 'accesorio', 9.9, 12, 2]] as const)
    await db.query('insert into products(tenant_id, name, category, price_usd, stock, min_stock) values ($1,$2,$3,$4,$5,$6)', [T, n, c, p, s, min])
  const vac = (await one<{ id: string }>("select id from products where name = 'Vacuna séxtuple'")).id
  await db.query("select register_sale($1, $2, 'pago_movil', $3::jsonb)", [T, ana, JSON.stringify([{ product_id: vac, qty: 2 }])])
  const sv = async (n: string, a: number, b: number, c: number, d: number) =>
    (await one<{ id: string }>('insert into grooming_services(tenant_id, name, price_small, price_medium, price_large, duration_min) values ($1,$2,$3,$4,$5,$6) returning id', [T, n, a, b, c, d])).id
  const bath = await sv('Baño y corte', 15, 22, 30, 90); const onlyBath = await sv('Solo baño', 10, 14, 18, 60)
  // Citas de hoy en la hora local del navegador.
  const at = (h: number) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d.toISOString() }
  const appt = 'insert into grooming_appointments(tenant_id, patient_id, service_id, starts_at, size) values ($1,$2,$3,$4,$5)'
  await db.query(appt, [T, luna, bath, at(9), 'pequeno']); await db.query(appt, [T, rocky, bath, at(11), 'grande']); await db.query(appt, [T, toby, onlyBath, at(15), 'mediano'])
  await db.query("update grooming_appointments set status = 'completada', paid_usd = 15, pay_method = 'efectivo_usd' where patient_id = $1", [luna])
  await db.query("update grooming_appointments set status = 'en_proceso' where patient_id = $1", [rocky])
  await db.exec('reset role')
}
