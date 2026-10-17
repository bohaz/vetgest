import { SupabaseRepository } from './SupabaseRepository'

const h = vi.hoisted(() => {
  const log: [string, unknown[]][] = []
  const result: { data: unknown; error: unknown } = { data: null, error: null }
  const q: unknown = new Proxy({}, { get: (_t, m: string) => (m === 'then' ? (res: (v: unknown) => void) => res(result) : (...a: unknown[]) => { log.push([m, a]); return q }) })
  return { log, result, q }
})
vi.mock('./client', () => ({ supabase: { from: (t: string) => { h.log.push(['from', [t]]); return h.q } } }))

interface Row { id: string; tenant_id: string; name: string }
const repo = () => new SupabaseRepository<Row>('clients', 'tenant-1')
const calls = (name: string) => h.log.filter(([m]) => m === name).map(([, a]) => a)

beforeEach(() => { h.log.length = 0; h.result.data = null; h.result.error = null })

describe('SupabaseRepository', () => {
  it('list consulta la tabla, aplica el filtro y devuelve los datos', async () => {
    h.result.data = [{ id: '1', tenant_id: 't', name: 'Ana' }]
    const rows = await repo().list({ name: 'Ana' })
    expect(rows).toHaveLength(1); expect(calls('from')[0]).toEqual(['clients']); expect(calls('match')[0]).toEqual([{ name: 'Ana' }])
  })
  it('create inyecta el tenant_id', async () => {
    h.result.data = { id: '1' }
    await repo().create({ name: 'Luis' })
    expect(calls('insert')[0]).toEqual([{ name: 'Luis', tenant_id: 'tenant-1' }])
  })
  it('update y remove filtran por id', async () => {
    await repo().update('9', { name: 'X' }); await repo().remove('9')
    expect(calls('eq')).toEqual([['id', '9'], ['id', '9']])
  })
  it('lanza el error de Supabase', async () => {
    h.result.error = new Error('rls')
    await expect(repo().list()).rejects.toThrow('rls')
  })
})
