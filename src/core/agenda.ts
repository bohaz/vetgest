// Agenda única: controles de consulta y citas de peluquería. Funciones puras, sin acceso a datos.
import type { Appointment, AppointmentKind, AppointmentStatus, Consultation, Evolution, GroomingService } from './entities'
import { dayOf, formatTime, localDateStr, shiftDay } from './dates'
import { round2 } from './pricing'

export const KIND_LABEL: Record<AppointmentKind, string> = { consulta: 'Consulta', peluqueria: 'Peluquería' }
export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', completada: 'Completada', no_asistio: 'No vino', cancelada: 'Cancelada',
}
export const EVOLUTIONS: { value: Evolution; label: string }[] = [
  { value: 'mejoro', label: 'Mejoró' }, { value: 'igual', label: 'Igual' }, { value: 'empeoro', label: 'Empeoró' }, { value: 'alta', label: 'Alta' },
]
export const evolutionLabel = (e?: Evolution | null) => EVOLUTIONS.find(x => x.value === e)?.label

// Un control se completa al registrar la consulta, sin paso «en proceso»; la peluquería se inicia y luego se cobra.
const FLOW: Record<AppointmentKind, Record<AppointmentStatus, AppointmentStatus[]>> = {
  consulta: { pendiente: ['completada', 'no_asistio', 'cancelada'], en_proceso: ['completada', 'cancelada'], completada: [], no_asistio: [], cancelada: [] },
  peluqueria: { pendiente: ['en_proceso', 'no_asistio', 'cancelada'], en_proceso: ['completada', 'cancelada'], completada: [], no_asistio: [], cancelada: [] },
}
export const nextStatuses = (kind: AppointmentKind, s: AppointmentStatus) => FLOW[kind][s]
export const canTransition = (kind: AppointmentKind, from: AppointmentStatus, to: AppointmentStatus) => FLOW[kind][from].includes(to)
export const isOpen = (a: Pick<Appointment, 'status'>) => a.status === 'pendiente' || a.status === 'en_proceso'

/** Minutos que ocupa un control en la agenda. */
export const CONSULT_MINUTES = 30
/** Atajos para fijar el próximo control. */
export const FOLLOW_UP_DAYS = [3, 7, 15, 30]

export const durationOf = (a: Pick<Appointment, 'kind' | 'service_id'>, services: GroomingService[]) =>
  a.kind === 'consulta' ? CONSULT_MINUTES : services.find(s => s.id === a.service_id)?.duration_min ?? 60

export const appointmentsOfDay = (list: Appointment[], dateStr: string, kind?: AppointmentKind) =>
  list.filter(a => dayOf(a.starts_at) === dateStr && (!kind || a.kind === kind)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))

/** Citas del día sin canceladas, cuántas faltan por atender y lo cobrado en peluquería. */
export function daySummary(list: Appointment[]) {
  const active = list.filter(a => a.status !== 'cancelada')
  const income = active.filter(a => a.kind === 'peluqueria' && a.status === 'completada').reduce((s, a) => s + Number(a.paid_usd ?? 0), 0)
  return { total: active.length, pending: active.filter(isOpen).length, incomeUsd: round2(income) }
}

/** Cita activa del mismo tipo que se solapa con el horario propuesto (el veterinario y el peluquero atienden en paralelo). */
export function findConflict(existing: Appointment[], services: GroomingService[], candidate: { kind: AppointmentKind; starts_at: string; duration_min: number }) {
  const start = Date.parse(candidate.starts_at); const end = start + candidate.duration_min * 60000
  return existing.find(a => {
    if (a.kind !== candidate.kind || !isOpen(a)) return false
    const aStart = Date.parse(a.starts_at); const aEnd = aStart + durationOf(a, services) * 60000
    return aStart < end && start < aEnd
  })
}

/** Citas pendientes de un día, para recordarlas el día anterior. */
export const remindersFor = (list: Appointment[], dateStr: string) => appointmentsOfDay(list, dateStr).filter(a => a.status === 'pendiente')

/** Controles a los que el paciente no vino en los últimos días y que nadie ha vuelto a agendar. */
export function missedFollowUps(appts: Appointment[], consultations: Consultation[], now = new Date(), days = 30) {
  const since = shiftDay(localDateStr(now), -days)
  return appts
    .filter(a => a.kind === 'consulta' && a.status === 'no_asistio' && dayOf(a.starts_at) >= since)
    .filter(a => !appts.some(b => b.id !== a.id && b.patient_id === a.patient_id && b.kind === 'consulta' && b.status !== 'cancelada' && b.starts_at > a.starts_at)
      && !consultations.some(c => c.patient_id === a.patient_id && c.visit_date > a.starts_at))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
}

/** Control agendado a partir de una consulta (el vigente, si se reagendó). */
export const followUpOf = (consultationId: string, appts: Appointment[]) =>
  appts.filter(a => a.follow_up_of === consultationId && a.status !== 'cancelada').sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]

/** Control pendiente del paciente para hoy o atrasado: es el que se atiende con la próxima consulta. */
export const dueControl = (patientId: string, appts: Appointment[], today = localDateStr()) =>
  appts.filter(a => a.patient_id === patientId && a.kind === 'consulta' && a.status === 'pendiente' && dayOf(a.starts_at) <= today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]

export const controlReason = (reason?: string) => (reason ? `Control: ${reason.replace(/^Control: /, '')}` : 'Control')

export function reminderText(r: { kind: AppointmentKind; pet: string; starts_at: string; owner?: string; service?: string; clinic?: string }) {
  const hello = r.owner ? `Hola ${r.owner.split(' ')[0]}` : 'Hola'
  const where = r.clinic ? ` en ${r.clinic}` : ''
  const when = `el ${new Date(r.starts_at).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${formatTime(r.starts_at)}`
  return r.kind === 'consulta'
    ? `${hello}, te recordamos el control de ${r.pet}${where} ${when}. Si no puedes venir, avísanos para reagendar.`
    : `${hello}, te recordamos la cita de peluquería de ${r.pet}${r.service ? ` (${r.service})` : ''}${where} ${when}.`
}
