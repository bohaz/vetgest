import { useState } from 'react'
import { Button, Field, Input, Select } from '@/shared/ui'
import { PAY_METHODS, formatUsd, type PayMethod } from '@/core/pricing'
import { SIZES, STATUS_LABEL, formatTime, nextStatuses } from '@/core/grooming'
import type { GroomingAppointment } from '@/core/entities'

interface Props {
  appt: GroomingAppointment; patient: string; owner: string; service: string; reminderHref: string | null
  onStatus: (s: 'en_proceso' | 'cancelada') => void; onComplete: (p: { paid_usd: number; pay_method: PayMethod }) => void
}
const BADGE: Record<GroomingAppointment['status'], string> = {
  pendiente: 'bg-slate-100 text-slate-700', en_proceso: 'bg-amber-100 text-amber-800', completada: 'bg-teal-100 text-teal-800', cancelada: 'bg-red-100 text-red-700',
}

export function AppointmentRow({ appt, patient, owner, service, reminderHref, onStatus, onComplete }: Props) {
  const [paying, setPaying] = useState(false)
  const [amount, setAmount] = useState(String(appt.price_usd ?? ''))
  const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const next = nextStatuses(appt.status)
  const size = SIZES.find(z => z.value === appt.size)?.label
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{formatTime(appt.starts_at)} · {patient} <span className="font-normal text-slate-500">({owner})</span></p>
          <p className="text-sm text-slate-600">{service} · {size}{appt.price_usd != null ? ` · ${formatUsd(appt.price_usd)}` : ''}</p>
          {appt.notes && <p className="text-sm text-slate-500">{appt.notes}</p>}
        </div>
        <span className={`rounded px-2 py-0.5 text-sm ${BADGE[appt.status]}`}>{STATUS_LABEL[appt.status]}</span>
      </div>
      {appt.status === 'completada' && <p className="mt-1 text-sm text-teal-800">Cobrado {formatUsd(appt.paid_usd ?? 0)} · {PAY_METHODS.find(m => m.value === appt.pay_method)?.label}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {next.includes('en_proceso') && <Button onClick={() => onStatus('en_proceso')}>Iniciar</Button>}
        {next.includes('completada') && <Button onClick={() => setPaying(!paying)}>Completar</Button>}
        {reminderHref && <a className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50" href={reminderHref} target="_blank" rel="noreferrer">Recordar por WhatsApp</a>}
        {next.includes('cancelada') && <Button variant="danger" onClick={() => onStatus('cancelada')}>Cancelar cita</Button>}
      </div>
      {paying && (
        <form className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-3" onSubmit={e => { e.preventDefault(); onComplete({ paid_usd: Number(amount), pay_method: method }); setPaying(false) }}>
          <Field label="Monto cobrado (USD)"><Input required type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Método de pago"><Select value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
            {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          <div className="flex items-end"><Button disabled={amount === ''}>Confirmar cobro</Button></div>
        </form>)}
    </li>
  )
}
