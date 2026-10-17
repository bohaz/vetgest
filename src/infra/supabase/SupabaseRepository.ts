import type { Entity, NewEntity, Repository } from '@/core/repository'
import { supabase } from './client'

// DRY: una sola clase sirve para todas las tablas; RLS aísla cada negocio.
export class SupabaseRepository<T extends Entity> implements Repository<T> {
  constructor(private table: string, private tenantId: string) {}

  async list(filter: Partial<T> = {}) {
    const { data, error } = await supabase.from(this.table).select('*').match(filter as Record<string, unknown>).order('created_at', { ascending: false })
    if (error) throw error
    return data as T[]
  }
  async create(input: NewEntity<T>) {
    const { data, error } = await supabase.from(this.table).insert({ ...input, tenant_id: this.tenantId }).select().single()
    if (error) throw error
    return data as T
  }
  async update(id: string, input: Partial<T>) {
    const { data, error } = await supabase.from(this.table).update(input as never).eq('id', id).select().single()
    if (error) throw error
    return data as T
  }
  async remove(id: string) {
    const { error } = await supabase.from(this.table).delete().eq('id', id)
    if (error) throw error
  }
}
