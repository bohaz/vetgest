import { Link } from 'react-router-dom'
import { Avatar, Badge, ButtonLink, Empty, ExternalButton, Section } from '@/shared/ui'
import { KIND_LABEL } from '@/core/agenda'
import { formatTime } from '@/core/dates'
import type { Appointment, Client, GroomingService, Patient } from '@/core/entities'
import { useReminderLink } from './useReminderLink'

interface Lookup { patients: Patient[]; clients: Client[]; services: GroomingService[] }
const find = ({ patients, clients }: Lookup, a: Appointment) => {
  const patient = patients.find(p => p.id === a.patient_id)
  return { patient, owner: clients.find(c => c.id === patient?.client_id) }
}
const what = (a: Appointment, services: GroomingService[]) =>
  a.kind === 'consulta' ? a.notes || KIND_LABEL.consulta : services.find(s => s.id === a.service_id)?.name ?? KIND_LABEL.peluqueria

/** Citas de mañana para avisar por WhatsApp; al enviar, la cita queda marcada como recordada. */
export function TomorrowReminders({ appts, onReminded, ...lookup }: Lookup & { appts: Appointment[]; onReminded: (a: Appointment) => void }) {
  const link = useReminderLink()
  const pending = appts.filter(a => !a.reminded_at).length
  return (
    <Section title="Recordatorios para mañana" action={appts.length > 0 ? <Badge tone={pending ? 'warn' : 'brand'}>{pending ? `${pending} por enviar` : 'Todos enviados'}</Badge> : undefined}>
      {appts.length === 0 ? <Empty>No hay citas para mañana.</Empty> : (
        <ul className="flex flex-col gap-3">{appts.map(a => {
          const { patient, owner } = find(lookup, a); const href = link(a, patient, owner, what(a, lookup.services))
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3">
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-bold">{formatTime(a.starts_at)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold">{patient?.name ?? '—'} <span className="font-medium text-muted">· {owner?.full_name ?? '—'}</span></span>
                <span className="truncate text-sm text-muted">{what(a, lookup.services)}</span>
              </span>
              {a.reminded_at ? <Badge tone="info">Recordado</Badge>
                : href ? <ExternalButton href={href} icon="chat" className="min-h-9 px-3" onClick={() => onReminded(a)}>Recordar</ExternalButton>
                  : <span className="text-sm text-muted">Sin teléfono</span>}
            </li>)
        })}</ul>)}
    </Section>
  )
}

/** Controles a los que el paciente no vino y que nadie volvió a agendar. */
export function MissedControls({ appts, ...lookup }: Lookup & { appts: Appointment[] }) {
  if (appts.length === 0) return null
  return (
    <Section title="No vinieron al control">
      <ul className="flex flex-col gap-3">{appts.slice(0, 5).map(a => {
        const { patient, owner } = find(lookup, a)
        const query = new URLSearchParams({ paciente: a.patient_id, tipo: 'consulta', ...(a.notes ? { motivo: a.notes } : {}), ...(a.follow_up_of ? { origen: a.follow_up_of } : {}) })
        return (
          <li key={a.id} className="flex items-center gap-3">
            <Avatar name={patient?.name ?? '?'} size={36} />
            <span className="flex min-w-0 flex-1 flex-col">
              <Link to={`/pacientes/${a.patient_id}`} className="truncate font-bold text-ink no-underline">{patient?.name ?? '—'} <span className="font-medium text-muted">· {owner?.full_name ?? '—'}</span></Link>
              <span className="truncate text-sm text-muted">{new Date(a.starts_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })} · {what(a, lookup.services)}</span>
            </span>
            <ButtonLink to={`/agenda?${query}`} variant="secondary" icon="repeat" className="min-h-9 px-3">Reagendar</ButtonLink>
          </li>)
      })}</ul>
    </Section>
  )
}
