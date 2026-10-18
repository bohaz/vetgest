import { useState } from 'react'
import { Button, Field, Input, Segmented, Textarea } from '@/shared/ui'
import { EVOLUTIONS, FOLLOW_UP_DAYS, controlReason } from '@/core/agenda'
import { dayLabel, localDateStr, shiftDay, toStartsAt } from '@/core/dates'
import type { Appointment, Consultation, Evolution } from '@/core/entities'

export type NewConsultation = Omit<Consultation, 'id' | 'tenant_id' | 'updated_at'>
/** Próximo control a agendar junto con la consulta. */
export interface FollowUp { starts_at: string; notes: string }

interface Props {
  patientId: string
  /** Control de la agenda que se está atendiendo: precarga el motivo y pide la evolución. */
  attending?: Appointment
  onSubmit: (c: NewConsultation, followUp?: FollowUp) => void
  onCancel?: () => void
}

const NO_EVOLUTION = '' as const
const EVOLUTION_OPTIONS: { value: Evolution | typeof NO_EVOLUTION; label: string }[] = [{ value: NO_EVOLUTION, label: 'Sin indicar' }, ...EVOLUTIONS]

/** Registro de una consulta, con su evolución si es un control y, si hace falta, el próximo control. */
export function ConsultationForm({ patientId, attending, onSubmit, onCancel }: Props) {
  const today = localDateStr()
  const [f, setF] = useState({ reason: attending ? attending.notes || controlReason() : '', diagnosis: '', treatment: '', price_usd: '' })
  const [evolution, setEvolution] = useState<Evolution | typeof NO_EVOLUTION>(NO_EVOLUTION)
  const [next, setNext] = useState({ date: '', time: '09:00' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const reason = f.reason.trim()
    onSubmit({
      patient_id: patientId, visit_date: new Date().toISOString(), reason, diagnosis: f.diagnosis.trim() || undefined,
      treatment: f.treatment.trim() || undefined, price_usd: f.price_usd ? Number(f.price_usd) : 0,
      appointment_id: attending?.id ?? null, evolution: attending && evolution ? evolution : null,
    }, next.date && next.time ? { starts_at: toStartsAt(next.date, next.time), notes: controlReason(reason) } : undefined)
  }
  const quick = FOLLOW_UP_DAYS.map(d => ({ value: shiftDay(today, d), label: `En ${d} días` }))

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <Field label="Motivo de la consulta" className="sm:col-span-2"><Input required value={f.reason} onChange={set('reason')} /></Field>
      {attending && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-semibold">¿Cómo evolucionó?</span>
          <Segmented label="Evolución" options={EVOLUTION_OPTIONS} value={evolution} onChange={setEvolution} />
        </div>)}
      <Field label="Diagnóstico"><Textarea value={f.diagnosis} onChange={set('diagnosis')} /></Field>
      <Field label="Tratamiento"><Textarea value={f.treatment} onChange={set('treatment')} /></Field>
      <Field label="Precio (USD)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={f.price_usd} onChange={set('price_usd')} /></Field>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:col-span-2">
        <legend className="px-1 text-sm font-semibold">Próximo control (opcional)</legend>
        <Segmented label="Atajos del próximo control" options={[{ value: '', label: 'Sin control' }, ...quick]} value={quick.some(q => q.value === next.date) ? next.date : next.date ? 'otra' : ''}
          onChange={date => setNext({ ...next, date: date === 'otra' ? next.date : date })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha del control"><Input type="date" min={today} value={next.date} onChange={e => setNext({ ...next, date: e.target.value })} /></Field>
          <Field label="Hora del control"><Input type="time" value={next.time} onChange={e => setNext({ ...next, time: e.target.value })} /></Field>
        </div>
        {next.date && <p className="text-sm text-muted">Se agendará en la agenda: <b className="text-ink first-letter:uppercase">{dayLabel(next.date, today)}</b> a las {next.time}.</p>}
      </fieldset>

      <div className="flex items-end gap-2 sm:col-span-2">
        <Button disabled={!f.reason.trim() || (!!next.date && !next.time)}>Guardar consulta</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
