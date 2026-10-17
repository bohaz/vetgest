import { useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { repositoryFor } from './repositoryFor'
import type { Entity, Repository } from '@/core/repository'

export function useRepository<T extends Entity>(table: string): Repository<T> {
  const { tenantId } = useAuth()
  return useMemo(() => repositoryFor<T>(table, tenantId!), [table, tenantId])
}
