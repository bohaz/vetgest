// Fechas siempre en la hora local del negocio. Los días se manejan como texto YYYY-MM-DD.
export const localDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const shiftDay = (dateStr: string, days: number) => { const [y, m, d] = dateStr.split('-').map(Number); return localDateStr(new Date(y, m - 1, d + days)) }
export const toStartsAt = (dateStr: string, time: string) => new Date(`${dateStr}T${time}`).toISOString()
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
export const dayOf = (iso: string) => localDateStr(new Date(iso))

/** «Hoy», «Mañana» o «martes 20 de octubre». */
export function dayLabel(dateStr: string, today = localDateStr()) {
  if (dateStr === today) return 'Hoy'
  if (dateStr === shiftDay(today, 1)) return 'Mañana'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })
}
