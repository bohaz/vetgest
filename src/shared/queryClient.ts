// Cliente de datos de la app: caché persistente y cola de cambios que sobrevive sin conexión.
//
// Cada cambio es una mutación con clave fija (`crud`, `sale`, `rate`, `void_sale`) y variables serializables.
// Así, si la app se cierra sin señal, la cola se guarda en el dispositivo y al volver a abrirla se
// reanuda con las funciones registradas aquí. Todas comparten un `scope`, por lo que se envían en orden
// (un paciente creado sin conexión llega después de su dueño).
import { MutationCache, QueryClient, type QueryKey } from '@tanstack/react-query'
import { repositoryFor } from './repositoryFor'
import { registerSale, setRate, voidSale } from '@/infra/supabase/rpc'
import { applyCreate, applyRemove, applySaleToStock, applyUpdate, describe } from '@/core/optimistic'
import { errorMessage, isNetworkError } from '@/core/errors'
import type { Entity } from '@/core/repository'
import type { PayMethod } from '@/core/pricing'
import type { Product, Sale } from '@/core/entities'
import { failures } from '@/features/sync/failures'

type Row = Entity & Record<string, unknown>
export type CrudVars =
  | { op: 'create'; table: string; tenantId: string; data: Record<string, unknown> & { id: string } }
  | { op: 'update'; table: string; tenantId: string; id: string; data: Record<string, unknown> }
  | { op: 'remove'; table: string; tenantId: string; id: string; label?: string }
export interface SaleVars { tenantId: string; clientId?: string; method: PayMethod; items: { product_id: string; qty: number }[] }
export interface RateVars { tenantId: string; rate: number }
export interface VoidVars { tenantId: string; saleId: string; reason: string }

export const KEYS = { crud: ['crud'], sale: ['sale'], rate: ['rate-set'], void: ['void_sale'] } as const
export const listKey = (table: string, tenantId: string | null) => [table, tenantId] as const

const DAY = 24 * 60 * 60 * 1000
const scope = { id: 'vetgest-sync' }
// Un error de red no es un rechazo: el cambio sigue en la cola y se reintenta (con espera creciente, máx. 30 s)
// hasta que pase, para no romper el orden. Solo los rechazos del servidor se reportan como fallidos.
const retry = (_count: number, e: unknown) => isNetworkError(e)
const retryDelay = (n: number) => Math.min(1000 * 2 ** n, 30_000)

function labelOf(key: QueryKey | undefined, vars: unknown): string {
  const k = key?.[0]
  if (k === 'crud') {
    const v = vars as CrudVars
    const what = describe(v.table, v.op === 'remove' ? { name: v.label } : v.data)
    return { create: `Crear ${what}`, update: `Editar ${what}`, remove: `Eliminar ${what}` }[v.op]
  }
  return { sale: 'Venta', 'rate-set': 'Tasa del día', void_sale: 'Anulación de venta' }[String(k)] ?? 'Cambio'
}

export function createQueryClient() {
  const qc: QueryClient = new QueryClient({
    defaultOptions: {
      // Sin señal se muestra lo último guardado en el dispositivo.
      queries: { networkMode: 'offlineFirst', gcTime: 7 * DAY, staleTime: 30_000, retry: (n, e) => isNetworkError(e) && n < 2 },
    },
    mutationCache: new MutationCache({
      onError: (error, vars, _ctx, m) =>
        failures.add({ id: m.mutationId, label: labelOf(m.options.mutationKey, vars), message: errorMessage(error), key: m.options.mutationKey ?? [], vars }),
    }),
  })

  const lists = (table: string, tenantId: string) => ({ queryKey: listKey(table, tenantId) })

  qc.setMutationDefaults(KEYS.crud, {
    scope, retry, retryDelay,
    mutationFn: async (v: CrudVars) => {
      const repo = repositoryFor<Row>(v.table, v.tenantId)
      if (v.op === 'create') return repo.create(v.data as never)
      if (v.op === 'update') return repo.update(v.id, v.data as never)
      return repo.remove(v.id)
    },
    onMutate: async (v: CrudVars) => {
      await qc.cancelQueries(lists(v.table, v.tenantId))
      qc.setQueriesData<Row[]>(lists(v.table, v.tenantId), list =>
        v.op === 'create' ? applyCreate(list, { tenant_id: v.tenantId, created_at: new Date().toISOString(), ...v.data } as Row)
          : v.op === 'update' ? applyUpdate(list, v.id, v.data as Partial<Row>)
            : applyRemove(list, v.id))
    },
    // Al eliminar puede haber borrados en cascada (un cliente arrastra a sus pacientes), así que se refresca todo.
    onSettled: (_d, _e, v: CrudVars) => qc.invalidateQueries(v.op === 'remove' ? undefined : { queryKey: [v.table] }),
  })

  qc.setMutationDefaults(KEYS.sale, {
    scope, retry, retryDelay,
    mutationFn: (v: SaleVars) => registerSale(v.tenantId, v),
    onMutate: async (v: SaleVars) => {
      await qc.cancelQueries(lists('products', v.tenantId))
      qc.setQueriesData<Product[]>(lists('products', v.tenantId), list => applySaleToStock(list as never, v.items) as Product[] | undefined)
    },
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ['products'] }), qc.invalidateQueries({ queryKey: ['sales'] })]),
  })

  qc.setMutationDefaults(KEYS.void, {
    scope, retry, retryDelay,
    mutationFn: (v: VoidVars) => voidSale(v.saleId, v.reason),
    onMutate: async (v: VoidVars) => {
      await qc.cancelQueries(lists('sales', v.tenantId))
      qc.setQueriesData<Sale[]>(lists('sales', v.tenantId), list => applyUpdate(list as never, v.saleId, { voided_at: new Date().toISOString(), void_reason: v.reason }) as Sale[] | undefined)
    },
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ['products'] }), qc.invalidateQueries({ queryKey: ['sales'] })]),
  })

  qc.setMutationDefaults(KEYS.rate, {
    scope, retry, retryDelay,
    mutationFn: (v: RateVars) => setRate(v.tenantId, v.rate),
    onMutate: (v: RateVars) => { qc.setQueryData(['rate', v.tenantId], v.rate) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['rate'] }),
  })

  return qc
}

/** Reintenta un cambio fallido con las mismas variables. */
export function retryFailure(qc: QueryClient, f: { id: number; key: readonly unknown[]; vars: unknown }) {
  failures.remove(f.id)
  return qc.getMutationCache().build(qc, { mutationKey: f.key as QueryKey }).execute(f.vars).catch(() => undefined)
}

/** Tras abrir la app, reanuda los cambios que quedaron pendientes (en orden, por el `scope`). */
export function resumePending(qc: QueryClient) {
  const pending = qc.getMutationCache().getAll().filter(m => m.state.status === 'pending')
  return Promise.all(pending.map(m => m.continue().catch(() => undefined)))
}
