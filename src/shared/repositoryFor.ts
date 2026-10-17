import { SupabaseRepository } from '@/infra/supabase/SupabaseRepository'
import type { Entity, Repository } from '@/core/repository'

// Único punto donde se elige el adaptador de datos. Para migrar a Rails, se cambia aquí
// (y en `infra/supabase/rpc.ts` para ventas, anulaciones y tasa).
export const repositoryFor = <T extends Entity>(table: string, tenantId: string): Repository<T> => new SupabaseRepository<T>(table, tenantId)
