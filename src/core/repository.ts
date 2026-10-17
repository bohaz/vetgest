export interface Entity { id: string; tenant_id: string; updated_at?: string }

// Contrato único: los adaptadores (local, Supabase, API Rails) son intercambiables.
export interface Repository<T extends Entity> {
  list(filter?: Partial<T>): Promise<T[]>
  create(data: Omit<T, 'id' | 'tenant_id' | 'updated_at'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}
