import { useState } from 'react'
import { Avatar, Badge, Button, ExternalButton, Field, Input, Select } from '@/shared/ui'
import { PAY_METHODS, formatUsd, type PayMethod } from '@/core/pricing'
import { SIZES, STATUS_LABEL, formatTime, nextStatuses } from '@/core/grooming'
import type { GroomingAppointment } from '@/core/entities'
import { STATUS_TONE } from './status'

interface Props {
  appt: GroomingAppointment; patient: string; owner: string; service: string; reminderHref: string | null
  onStatus: (s: 'en_proceso' | 'cancelada') => void; onComplete: (p: { paid_usd: number; pay_method: PayMethod }) => void
}

export function AppointmentRow({ appt, patient, owner, service, reminderHref, onStatus, onComplete }: Props) {
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState(String(appt.price_usd ?? ''))
  const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const next = nextStatuses(appt.status)
  const size = SIZES.find(z => z.value === appt.size)?.label
  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <span className="w-[4.5rem] shrink-0 whitespace-nowrap pt-2 text-sm font-bold">{formatTime(appt.starts_at)}</span>
        <Avatar name={patient} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{patient} <span className="font-medium text-muted">· {owner}</span></p>
          <p className="text-sm text-muted">{service} · {size}{appt.price_usd != null ? ` · ${formatUsd(appt.price_usd)}` : ''}</p>
          {appt.notes && <p className="text-sm text-ink/70">{appt.notes}</p>}
          {appt.status === 'completada' && <p className="mt-1 text-sm font-semibold text-brand-ink">Cobrado {formatUsd(appt.paid_usd ?? 0)} · {PAY_METHODS.find(m => m.value === appt.pay_method)?.label}</p>}
        </div>
        <Badge tone={STATUS_TONE[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
      </div>
      {next.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 sm:pl-[8.5rem]">
          {next.includes('en_proceso') && <Button onClick={() => onStatus('en_proceso')}>Iniciar</Button>}
          {next.includes('completada') && <Button onClick={() => setPaying(!paying)}>Completar</Button>}
          {reminderHref && <ExternalButton href={reminderHref} icon="chat">Recordar por WhatsApp</ExternalButton>}
          {next.includes('cancelada') && <Button variant="danger" onClick={() => onStatus('cancelada')}>Cancelar cita</Button>}
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
