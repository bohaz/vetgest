// Cálculos del panel de inicio y de la ficha del paciente. Funciones puras, sin acceso a datos.
import type { Consultation, GroomingAppointment, GroomingService, Product, Sale } from './entities'
import { localDateStr } from './grooming'
import { isLowStock, round2 } from './pricing'

const isOn = (iso: string | undefined | null, dateStr: string) => !!iso && localDateStr(new Date(iso)) === dateStr
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
export function collectedOn(dateStr: string, sales: Sale[], appointments: GroomingAppointment[]) {
  const fromSales = activeSales(sales).filter(s => isOn(s.created_at, dateStr)).reduce((t, s) => t + Number(s.total_usd), 0)
  const fromGrooming = appointments
    .filter(a => a.status === 'completada' && isOn(a.completed_at ?? a.starts_at, dateStr))
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
  lines: string[]; amountUsd?: number; status?: GroomingAppointment['status']
}

/** Historial único de consultas y peluquería del paciente, lo más reciente primero. */
export function patientTimeline(patientId: string, consultations: Consultation[], appointments: GroomingAppointment[], services: GroomingService[]): TimelineItem[] {
  const fromConsultations: TimelineItem[] = consultations.filter(c => c.patient_id === patientId).map(c => ({
    id: c.id, kind: 'consulta', date: c.visit_date, title: c.reason || 'Consulta',
    lines: [c.diagnosis && `Diagnóstico: ${c.diagnosis}`, c.treatment && `Tratamiento: ${c.treatment}`].filter(Boolean) as string[],
    amountUsd: c.price_usd ? Number(c.price_usd) : undefined,
  }))
  const fromGrooming: TimelineItem[] = appointments.filter(a => a.patient_id === patientId && a.status !== 'cancelada').map(a => ({
    id: a.id, kind: 'peluqueria', date: a.starts_at, title: services.find(s => s.id === a.service_id)?.name ?? 'Peluquería',
    lines: a.notes ? [a.notes] : [], amountUsd: a.paid_usd ?? a.price_usd ?? undefined, status: a.status,
  }))
  return [...fromConsultations, ...fromGrooming].sort((a, b) => b.date.localeCompare(a.date))
}

/** Próxima cita de peluquería pendiente o en curso (desde hoy). */
export function nextAppointment(patientId: string, appointments: GroomingAppointment[], now = new Date()) {
  const today = localDateStr(now)
  return appointments
    .filter(a => a.patient_id === patientId && (a.status === 'pendiente' || a.status === 'en_proceso') && localDateStr(new Date(a.starts_at)) >= today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
}

/** Total y cantidad de compras no anuladas de un cliente. */
export function clientPurchases(clientId: string, sales: Sale[]) {
  const mine = activeSales(sales).filter(s => s.client_id === clientId)
  return { count: mine.length, usd: round2(mine.reduce((t, s) => t + Number(s.total_usd), 0)) }
}
