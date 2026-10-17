import Dexie from 'dexie'
// Base del modo offline. La cola `outbox` guarda operaciones pendientes de subir a Supabase.
export const localDb = new Dexie('vetgest')
localDb.version(1).stores({
  clients: 'id, tenant_id, updated_at', patients: 'id, tenant_id, client_id', products: 'id, tenant_id, category',
  outbox: '++seq, table, op',
})
