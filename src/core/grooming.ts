import type { GroomingAppointment, GroomingService, PetSize } from './entities'
import { round2 } from './pricing'

export type Status = GroomingAppointment['status']
export const SIZES: { value: PetSize; label: string }[] = [
  { value: 'pequeno', label: 'Pequeño' }, { value: 'mediano', label: 'Mediano' }, { value: 'grande', label: 'Grande' },
]
export const STATUS_LABEL: Record<Status, string> = { pendiente: 'Pendiente', en_proceso: 'En proceso', completada: 'Completada', cancelada: 'Cancelada' }

const NEXT: Record<Status, Status[]> = { pendiente: ['en_proceso', 'cancelada'], en_proceso: ['completada', 'cancelada'], completada: [], cancelada: [] }
export const nextStatuses = (s: Status) => NEXT[s]
export const canTransition = (from: Status, to: Status) => NEXT[from].includes(to)

export const priceFor = (s: Pick<GroomingService, 'price_small' | 'price_medium' | 'price_large'>, size: PetSize) =>
  ({ pequeno: s.price_small, mediano: s.price_medium, grande: s.price_large })[size]

// Fechas siempre en hora local del negocio (YYYY-MM-DD)
export const localDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const shiftDay = (dateStr: string, days: number) => { const [y, m, d] = dateStr.split('-').map(Number); return localDateStr(new Date(y, m - 1, d + days)) }
export const toStartsAt = (dateStr: string, time: string) => new Date(`${dateStr}T${time}`).toISOString()
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

export const appointmentsOfDay = (list: GroomingAppointment[], dateStr: string) =>
  list.filter(a => localDateStr(new Date(a.starts_at)) === dateStr).sort((a, b) => a.starts_at.localeCompare(b.starts_at))

export function daySummary(list: GroomingAppointment[]) {
  const active = list.filter(a => a.status !== 'cancelada')
  const done = active.filter(a => a.status === 'completada')
  return { total: active.length, pending: active.length - done.length, incomeUsd: round2(done.reduce((s, a) => s + (a.paid_usd ?? 0), 0)) }
}

/** Devuelve la cita existente (no cancelada) que se solapa con el horario propuesto. */
export function findConflict(existing: GroomingAppointment[], services: GroomingService[], candidate: { starts_at: string; duration_min: number }) {
  const start = Date.parse(candidate.starts_at); const end = start + candidate.duration_min * 60000
  return existing.find(a => {
    if (a.status === 'cancelada') return false
    const aStart = Date.parse(a.starts_at); const aEnd = aStart + (services.find(s => s.id === a.service_id)?.duration_min ?? 60) * 60000
    return aStart < end && start < aEnd
  })
}

/** Enlace de WhatsApp (por defecto Venezuela, +58). Devuelve null si no hay teléfono. */
export function whatsappLink(phone: string | undefined, text: string, country = '58') {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const number = digits.startsWith(country) ? digits : country + digits.replace(/^0+/, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}
export const reminderText = (pet: string, service: string, iso: string) =>
  `Hola, te recordamos la cita de peluquería de ${pet} (${service}) el ${new Date(iso).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${formatTime(iso)}.`
