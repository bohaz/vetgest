import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty, Field, Input, Textarea } from '@/shared/ui'
import { formatUsd } from '@/core/pricing'
import type { Consultation } from '@/core/entities'

const blank = { reason: '', diagnosis: '', treatment: '', price_usd: '' }

export function ConsultationsPanel({ patientId }: { patientId: string }) {
  // Lista completa en caché, filtrada aquí: así la ficha funciona sin conexión, incluso con pacientes recién creados.
  const { list, create, remove } = useCrud<Consultation>('consultations')
  const [f, setF] = useState(blank)
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create({ patient_id: patientId, visit_date: new Date().toISOString(), reason: f.reason.trim(), diagnosis: f.diagnosis.trim() || undefined,
      treatment: f.treatment.trim() || undefined, price_usd: f.price_usd ? Number(f.price_usd) : 0 })
    setF(blank)
  }
  const sorted = (list.data ?? []).filter(c => c.patient_id === patientId).sort((a, b) => b.visit_date.localeCompare(a.visit_date))
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Consultas</h2>
      <form className="mb-4 grid gap-3 rounded-lg border p-3" onSubmit={submit}>
        <Field label="Motivo de la consulta"><Input required value={f.reason} onChange={set('reason')} /></Field>
        <Field label="Diagnóstico"><Textarea value={f.diagnosis} onChange={set('diagnosis')} /></Field>
        <Field label="Tratamiento"><Textarea value={f.treatment} onChange={set('treatment')} /></Field>
        <Field label="Precio (USD)"><Input type="number" step="0.01" min="0" value={f.price_usd} onChange={set('price_usd')} /></Field>
        <div><Button disabled={!f.reason.trim()}>Guardar consulta</Button></div>
      </form>
      {sorted.length === 0 && <Empty>Este paciente aún no tiene consultas.</Empty>}
      <ul className="space-y-3">{sorted.map(c => (
        <li key={c.id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-slate-500">{new Date(c.visit_date).toLocaleDateString('es-VE')}{c.price_usd ? ` · ${formatUsd(Number(c.price_usd))}` : ''}</span>
            <Button variant="danger" onClick={() => confirm('¿Eliminar esta consulta?') && remove(c.id, c.reason)}>Eliminar</Button>
          </div>
          <p className="font-medium">{c.reason}</p>
          {c.diagnosis && <p className="text-sm"><b>Diagnóstico:</b> {c.diagnosis}</p>}
          {c.treatment && <p className="text-sm"><b>Tratamiento:</b> {c.treatment}</p>}
        </li>))}</ul>
    </div>
  )
}
