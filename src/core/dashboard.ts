// Cálculos del panel de inicio y de la ficha del paciente. Funciones puras, sin acceso a datos.
import type { Appointment, AppointmentStatus, Consultation, Evolution, GroomingService, Product, Sale } from './entities'
import { controlReason, followUpOf, isOpen } from './agenda'
import { dayOf, formatTime, localDateStr } from './dates'
import { isLowStock, round2 } from './pricing'

const isOn = (iso: string | undefined | null, dateStr: string) => !!iso && dayOf(iso) === dateStr
const activeSales = (sales: Sale[]) => sales.filter(s => !s.voided_at)

export function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** «Viernes 17 de octubre» */
export function longDate(now = new Date()) {
  const s = now.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Lo cobrado en el día: ventas no anuladas más citas de peluquería completadas ese día. */
export function collectedOn(dateStr: string, sales: Sale[], appointments: Appointment[]) {
  const fromSales = activeSales(sales).filter(s => isOn(s.created_at, dateStr)).reduce((t, s) => t + Number(s.total_usd), 0)
  const fromGrooming = appointments
    .filter(a => a.kind === 'peluqueria' && a.status === 'completada' && isOn(a.completed_at ?? a.starts_at, dateStr))
    .reduce((t, a) => t + Number(a.paid_usd ?? 0), 0)
  return { usd: round2(fromSales + fromGrooming), salesCount: activeSales(sales).filter(s => isOn(s.created_at, dateStr)).length }
}

/** Productos en o bajo su stock mínimo, los más urgentes primero. */
export const lowStockProducts = (products: Product[]) =>
  products.filter(isLowStock).sort((a, b) => a.stock - a.min_stock - (b.stock - b.min_stock) || a.name.localeCompare(b.name))

export const latestConsultations = (consultations: Consultation[], n = 3) =>
  [...consultations].sort((a, b) => b.visit_date.localeCompare(a.visit_date)).slice(0, n)

// ---------- Ficha del paciente ----------
export type TimelineKind = 'consulta' | 'peluqueria'
export interface TimelineItem {
  id: string; kind: TimelineKind; date: string; title: string
  lines: string[]; amountUsd?: number; status?: AppointmentStatus; evolution?: Evolution | null
  /** Solo las consultas se eliminan desde el historial. */
  removable?: boolean
}

const shortWhen = (iso: string) => `${new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}, ${formatTime(iso)}`

/**
 * Historial del paciente, lo más reciente primero: consultas (con su control agendado), peluquería y controles a los
 * que no vino. Los controles atendidos no se repiten: aparecen como la consulta que se registró en ellos.
 */
export function patientTimeline(patientId: string, consultations: Consultation[], appointments: Appointment[], services: GroomingService[]): TimelineItem[] {
  const mine = appointments.filter(a => a.patient_id === patientId)
  const fromConsultations: TimelineItem[] = consultations.filter(c => c.patient_id === patientId).map(c => {
    const next = followUpOf(c.id, mine)
    return {
      id: c.id, kind: 'consulta', date: c.visit_date, title: c.reason || 'Consulta', evolution: c.evolution, removable: true,
      lines: [c.diagnosis && `Diagnóstico: ${c.diagnosis}`, c.treatment && `Tratamiento: ${c.treatment}`,
        next && isOpen(next) && `Control agendado: ${shortWhen(next.starts_at)}`].filter(Boolean) as string[],
      amountUsd: c.price_usd ? Number(c.price_usd) : undefined,
    }
  })
  const missedControls: TimelineItem[] = mine.filter(a => a.kind === 'consulta' && a.status === 'no_asistio').map(a => ({
    id: a.id, kind: 'consulta', date: a.starts_at, title: a.notes || controlReason(), lines: [], status: a.status,
  }))
  const fromGrooming: TimelineItem[] = mine.filter(a => a.kind === 'peluqueria' && a.status !== 'cancelada').map(a => ({
    id: a.id, kind: 'peluqueria', date: a.starts_at, title: services.find(s => s.id === a.service_id)?.name ?? 'Peluquería',
    lines: a.notes ? [a.notes] : [], amountUsd: a.paid_usd ?? a.price_usd ?? undefined, status: a.status,
  }))
  return [...fromConsultations, ...missedControls, ...fromGrooming].sort((a, b) => b.date.localeCompare(a.date))
}

/** Próxima cita pendiente o en curso del paciente (desde hoy), de cualquier tipo. */
export function nextAppointment(patientId: string, appointments: Appointment[], now = new Date()) {
  const today = localDateStr(now)
  return appointments
    .filter(a => a.patient_id === patientId && isOpen(a) && dayOf(a.starts_at) >= today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
}

/** Total y cantidad de compras no anuladas de un cliente. */
export function clientPurchases(clientId: string, sales: Sale[]) {
  const mine = activeSales(sales).filter(s => s.client_id === clientId)
  return { count: mine.length, usd: round2(mine.reduce((t, s) => t + Number(s.total_usd), 0)) }
}
