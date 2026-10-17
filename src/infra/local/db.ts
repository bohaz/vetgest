import Dexie, { type Table } from 'dexie'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

// Almacenamiento del dispositivo (IndexedDB): guarda la caché de datos y la cola de cambios pendientes.
class LocalDb extends Dexie {
  kv!: Table<{ key: string; value: string }, string>
  constructor() {
    super('vetgest')
    this.version(1).stores({ clients: 'id, tenant_id, updated_at', patients: 'id, tenant_id, client_id', products: 'id, tenant_id, category', outbox: '++seq, table, op' })
    this.version(2).stores({ clients: null, patients: null, products: null, outbox: null, kv: 'key' })
  }
}
export const localDb = new LocalDb()

export const persister = createAsyncStoragePersister({
  key: 'vetgest-cache',
  throttleTime: 500,
  storage: {
    getItem: async k => (await localDb.kv.get(k))?.value ?? null,
    setItem: async (k, value) => { await localDb.kv.put({ key: k, value }) },
    removeItem: async k => { await localDb.kv.delete(k) },
  },
})
