// Cambios que el servidor rechazó o que no se pudieron enviar. Se muestran en el aviso de sincronización.
import { useSyncExternalStore } from 'react'

export interface Failure { id: number; label: string; message: string; key: readonly unknown[]; vars: unknown }

let items: Failure[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const failures = {
  add(f: Failure) { items = [...items.filter(i => i.id !== f.id), f]; emit() },
  remove(id: number) { items = items.filter(i => i.id !== id); emit() },
  clear() { items = []; emit() },
  get: () => items,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
}
export const useFailures = () => useSyncExternalStore(failures.subscribe, failures.get)
