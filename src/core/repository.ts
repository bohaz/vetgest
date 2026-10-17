export interface Entity { id: string; tenant_id: string; updated_at?: string }

/** Datos para crear: sin campos del servidor. El `id` es opcional para poder generarlo en el dispositivo (modo sin conexión). */
export type NewEntity<T extends Entity> = Omit<T, 'id' | 'tenant_id' | 'updated_at'> & { id?: string }

// Contrato único: los adaptadores (local, Supabase, API Rails) son intercambiables.
export interface Repository<T extends Entity> {
  list(filter?: Partial<T>): Promise<T[]>
  create(data: NewEntity<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}
