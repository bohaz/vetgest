import { useState } from 'react'
import { Avatar, Badge, Button, ButtonLink, ExternalButton, Field, Input, Select } from '@/shared/ui'
import { Icon } from '@/shared/icons'
import { PAY_METHODS, formatUsd, type PayMethod } from '@/core/pricing'
import { STATUS_LABEL, nextStatuses } from '@/core/agenda'
import { formatTime } from '@/core/dates'
import { sizeLabel } from '@/core/grooming'
import type { Appointment } from '@/core/entities'
import { STATUS_TONE } from './status'

export type RowStatus = 'en_proceso' | 'no_asistio' | 'cancelada'
interface Props {
  appt: Appointment; patient: string; owner: string
  /** Nombre del servicio (solo peluquería). */
  service?: string
  reminderHref: string | null; onReminded?: () => void
  /** Ficha del paciente donde se registra la consulta del control. */
  attendTo?: string
  onStatus: (s: RowStatus) => void; onComplete: (p: { paid_usd: number; pay_method: PayMethod }) => void
  onReschedule?: () => void
}

export function AppointmentRow({ appt, patient, owner, service, reminderHref, onReminded, attendTo, onStatus, onComplete, onReschedule }: Props) {
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState(String(appt.price_usd ?? ''))
  const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const next = nextStatuses(appt.kind, appt.status)
  const isConsult = appt.kind === 'consulta'
  const detail = isConsult ? appt.notes || 'Consulta'
    : [service ?? 'Sin servicio', sizeLabel(appt.size), appt.price_usd != null ? formatUsd(appt.price_usd) : null].filter(Boolean).join(' · ')
  const reminded = appt.status === 'pendiente' && !!appt.reminded_at
  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <span className="w-[4.5rem] shrink-0 whitespace-nowrap pt-2 text-sm font-bold">{formatTime(appt.starts_at)}</span>
        <span className="hidden sm:block"><Avatar name={patient} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{patient} <span className="font-medium text-muted">· {owner}</span></p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name={isConsult ? 'stethoscope' : 'scissors'} size={15} className={isConsult ? 'text-brand' : 'text-[#d97706]'} />
            <span className="sr-only">{isConsult ? 'Consulta:' : 'Peluquería:'}</span>{detail}
          </p>
          {!isConsult && appt.notes && <p className="text-sm text-ink/70">{appt.notes}</p>}
          {appt.kind === 'peluqueria' && appt.status === 'completada' && <p className="mt-1 text-sm font-semibold text-brand-ink">Cobrado {formatUsd(appt.paid_usd ?? 0)} · {PAY_METHODS.find(m => m.value === appt.pay_method)?.label}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STATUS_TONE[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
          {reminded && <Badge tone="info">Recordado</Badge>}
        </div>
      </div>
      {(next.length > 0 || onReschedule) && (
        <div className="mt-3 flex flex-wrap gap-2 sm:pl-[8.5rem]">
          {isConsult && next.includes('completada') && attendTo && <ButtonLink to={attendTo} icon="stethoscope">Atender</ButtonLink>}
          {next.includes('en_proceso') && <Button onClick={() => onStatus('en_proceso')}>Iniciar</Button>}
          {!isConsult && next.includes('completada') && <Button onClick={() => setPaying(!paying)}>Completar</Button>}
          {reminderHref && <ExternalButton href={reminderHref} icon="chat" onClick={onReminded}>{reminded ? 'Recordar de nuevo' : 'Recordar por WhatsApp'}</ExternalButton>}
          {next.includes('no_asistio') && <Button variant="ghost" onClick={() => onStatus('no_asistio')}>No vino</Button>}
          {next.includes('cancelada') && <Button variant="danger" onClick={() => onStatus('cancelada')}>Cancelar cita</Button>}
          {onReschedule && <Button variant="secondary" icon="repeat" onClick={onReschedule}>Reagendar</Button>}
        </div>)}
      {paying && (
        <form className="mt-3 grid gap-3 rounded-xl border border-line p-3 sm:ml-[8.5rem] sm:grid-cols-3" onSubmit={e => { e.preventDefault(); onComplete({ paid_usd: Number(amount), pay_method: method }); setPaying(false) }}>
          <Field label="Monto cobrado (USD)"><Input required type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Método de pago"><Select value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
            {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <div className="flex items-end"><Button disabled={amount === ''}>Confirmar cobro</Button></div>
        </form>)}
    </li>
  )
}
