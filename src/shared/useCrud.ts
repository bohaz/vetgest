import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRepository } from './useRepository'
import { KEYS, listKey, type CrudVars } from './queryClient'
import type { Entity, NewEntity } from '@/core/repository'

/**
 * Lista y cambios de una tabla. Los cambios se aplican al instante en pantalla y quedan en una cola
 * que se envía al servidor en orden; sin conexión se guardan en el dispositivo hasta que vuelva la señal.
 */
export function useCrud<T extends Entity>(table: string) {
  const tenantId = useAuth().tenantId!
  const repo = useRepository<T>(table)
  const list = useQuery({ queryKey: listKey(table, tenantId), queryFn: () => repo.list(), enabled: !!tenantId })
  const m = useMutation<unknown, Error, CrudVars>({ mutationKey: KEYS.crud })
  return {
    list,
    /** Crea el registro con un id generado en el dispositivo y lo devuelve. */
    create: (data: NewEntity<T>) => {
      const id = data.id ?? crypto.randomUUID()
      m.mutate({ op: 'create', table, tenantId, data: { ...(data as Record<string, unknown>), id } })
      return id
    },
    update: (id: string, data: Partial<T>) => m.mutate({ op: 'update', table, tenantId, id, data: data as Record<string, unknown> }),
    remove: (id: string, label?: string) => m.mutate({ op: 'remove', table, tenantId, id, label }),
  }
}
