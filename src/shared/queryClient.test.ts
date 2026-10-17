// La cola de cambios: sin conexión se aplica en pantalla, queda en pausa y al volver la señal se envía en orden.
import { onlineManager } from '@tanstack/react-query'
import { KEYS, createQueryClient, listKey, retryFailure, type CrudVars } from './queryClient'
import { failures } from '@/features/sync/failures'

const calls: string[] = []
const h = vi.hoisted(() => ({ fail: null as Error | null }))
vi.mock('./repositoryFor', () => ({
  repositoryFor: (table: string) => ({
    list: async () => [],
    create: async (d: { id: string }) => { calls.push(`create ${table} ${d.id}`); if (h.fail) throw h.fail; return d },
    update: async (id: string) => { calls.push(`update ${table} ${id}`); return { id } },
    remove: async (id: string) => { calls.push(`remove ${table} ${id}`) },
  }),
}))
vi.mock('@/infra/supabase/rpc', () => ({
  registerSale: async () => { calls.push('sale'); return 's1' }, setRate: async () => undefined, voidSale: async () => { calls.push('void') },
}))

const T = 'tenant-1'
const create = (table: string, data: Record<string, unknown> & { id: string }): CrudVars => ({ op: 'create', table, tenantId: T, data })
const settle = () => new Promise(r => setTimeout(r, 30))

beforeEach(() => { calls.length = 0; h.fail = null; failures.clear(); onlineManager.setOnline(true) })
afterAll(() => onlineManager.setOnline(true))

describe('cola de cambios', () => {
  it('sin conexión muestra el cambio al instante y lo envía en orden al volver la señal', async () => {
    const qc = createQueryClient(); qc.mount() // como en la app: reanuda la cola al volver la conexión
    qc.setQueryData(listKey('clients', T), [])
    qc.setQueryData(listKey('products', T), [{ id: 'p1', tenant_id: T, stock: 5 }])
    onlineManager.setOnline(false)
    const run = (key: readonly unknown[], vars: unknown) => void qc.getMutationCache().build(qc, { mutationKey: key as string[] }).execute(vars).catch(() => undefined)
    run(KEYS.crud, create('clients', { id: 'c1', full_name: 'Ana' }))
    run(KEYS.crud, create('patients', { id: 'pt1', client_id: 'c1', name: 'Rocky' }))
    run(KEYS.sale, { tenantId: T, method: 'efectivo_usd', items: [{ product_id: 'p1', qty: 2 }] })
    await settle()
    expect(calls).toEqual([])
    expect(qc.getQueryData<{ id: string }[]>(listKey('clients', T))?.map(c => c.id)).toEqual(['c1'])
    expect(qc.getQueryData<{ stock: number }[]>(listKey('products', T))?.[0].stock).toBe(3)
    expect(qc.getMutationCache().getAll().filter(m => m.state.isPaused)).toHaveLength(3)

    onlineManager.setOnline(true)
    await settle()
    expect(calls).toEqual(['create clients c1', 'create patients pt1', 'sale'])
  })

  it('un error de red no se reporta como fallido: el cambio sigue en cola y se reintenta', async () => {
    const qc = createQueryClient(); qc.mount()
    h.fail = new TypeError('Failed to fetch')
    const done = qc.getMutationCache().build(qc, { mutationKey: [...KEYS.crud] }).execute(create('clients', { id: 'c5', full_name: 'Eva' }))
    await settle(); h.fail = null
    await done
    expect(calls).toEqual(['create clients c5', 'create clients c5'])
    expect(failures.get()).toHaveLength(0)
  })

  it('registra los cambios rechazados y permite reintentarlos', async () => {
    const qc = createQueryClient()
    h.fail = new Error('new row violates row-level security policy')
    await qc.getMutationCache().build(qc, { mutationKey: [...KEYS.crud] }).execute(create('clients', { id: 'c9', full_name: 'Luis' })).catch(() => undefined)
    const [f] = failures.get()
    expect(f.label).toBe('Crear Cliente Luis'); expect(f.message).toMatch(/suscripción venció/)

    h.fail = null
    await retryFailure(qc, f)
    expect(failures.get()).toHaveLength(0)
    expect(calls).toEqual(['create clients c9', 'create clients c9'])
  })
})
