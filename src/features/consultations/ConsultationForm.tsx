import { useState } from 'react'
import { Button, Field, Input, Textarea } from '@/shared/ui'
import type { Consultation } from '@/core/entities'

const blank = { reason: '', diagnosis: '', treatment: '', price_usd: '' }
export type NewConsultation = Omit<Consultation, 'id' | 'tenant_id' | 'updated_at'>

/** Registro de una consulta para un paciente. */
export function ConsultationForm({ patientId, onSubmit, onCancel }: { patientId: string; onSubmit: (c: NewConsultation) => void; onCancel?: () => void }) {
  const [f, setF] = useState(blank)
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ patient_id: patientId, visit_date: new Date().toISOString(), reason: f.reason.trim(), diagnosis: f.diagnosis.trim() || undefined,
      treatment: f.treatment.trim() || undefined, price_usd: f.price_usd ? Number(f.price_usd) : 0 })
    setF(blank)
  }
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
      <Field label="Motivo de la consulta" className="sm:col-span-2"><Input required value={f.reason} onChange={set('reason')} /></Field>
      <Field label="Diagnóstico"><Textarea value={f.diagnosis} onChange={set('diagnosis')} /></Field>
      <Field label="Tratamiento"><Textarea value={f.treatment} onChange={set('treatment')} /></Field>
      <Field label="Precio (USD)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={f.price_usd} onChange={set('price_usd')} /></Field>
      <div className="flex items-end gap-2">
        <Button disabled={!f.reason.trim()}>Guardar consulta</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
