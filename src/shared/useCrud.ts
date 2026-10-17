import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Entity, Repository } from '@/core/repository'

export function useCrud<T extends Entity>(key: string, repo: Repository<T>, filter?: Partial<T>) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: [key] })
  return {
    list: useQuery({ queryKey: [key, filter ?? {}], queryFn: () => repo.list(filter) }),
    create: useMutation({ mutationFn: (d: Omit<T, 'id' | 'tenant_id' | 'updated_at'>) => repo.create(d), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => repo.update(id, data), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => repo.remove(id), onSuccess: refresh }),
  }
}
