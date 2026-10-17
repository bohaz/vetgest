import { useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { SupabaseRepository } from '@/infra/supabase/SupabaseRepository'
import type { Entity, Repository } from '@/core/repository'

// Único punto donde se elige el adaptador. Para migrar a Rails/offline, se cambia aquí.
export function useRepository<T extends Entity>(table: string): Repository<T> {
  const { tenantId } = useAuth()
  return useMemo(() => new SupabaseRepository<T>(table, tenantId!), [table, tenantId])
}
