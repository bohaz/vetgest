// Cambios optimistas sobre listas en caché: la pantalla refleja el cambio al instante,
// aunque no haya conexión, y luego se reemplaza con la respuesta del servidor.
import type { Entity } from './repository'

type Row = Entity & Record<string, unknown>

export const applyCreate = <T extends Row>(list: T[] | undefined, row: T): T[] | undefined =>
  list && !list.some(r => r.id === row.id) ? [row, ...list] : list

export const applyUpdate = <T extends Row>(list: T[] | undefined, id: string, data: Partial<T>): T[] | undefined =>
  list?.map(r => (r.id === id ? { ...r, ...data } : r))

export const applyRemove = <T extends Row>(list: T[] | undefined, id: string): T[] | undefined =>
  list?.filter(r => r.id !== id)

/** Descuenta del stock en caché lo vendido. */
export const applySaleToStock = <P extends Row & { stock: number }>(products: P[] | undefined, items: { product_id: string; qty: number }[]) =>
  products?.map(p => {
    const sold = items.filter(i => i.product_id === p.id).reduce((s, i) => s + i.qty, 0)
    return sold ? { ...p, stock: p.stock - sold } : p
  })

/** Nombre legible de un registro para avisos («Cliente Ana Pérez»). */
const LABELS: Record<string, string> = {
  clients: 'Cliente', patients: 'Paciente', consultations: 'Consulta', products: 'Producto',
  grooming_services: 'Servicio', grooming_appointments: 'Cita de peluquería',
}
export function describe(table: string, data: Record<string, unknown> = {}): string {
  const name = data.full_name ?? data.name ?? data.reason
  return [LABELS[table] ?? 'Registro', typeof name === 'string' ? name : ''].join(' ').trim()
}
