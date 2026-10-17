import { useState } from 'react'
import { Button, Field, Input, Textarea } from '@/shared/ui'
import type { Client } from '@/core/entities'

type Form = { full_name: string; phone: string; email: string; notes: string }
const toForm = (c?: Client): Form => ({ full_name: c?.full_name ?? '', phone: c?.phone ?? '', email: c?.email ?? '', notes: c?.notes ?? '' })
// Los campos vacíos se guardan como null para poder borrar un teléfono o correo al editar.
const toData = (f: Form) => ({ full_name: f.full_name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, notes: f.notes.trim() || null }) as Partial<Client>

export function ClientForm({ initial, submitLabel, onSubmit, onCancel }: { initial?: Client; submitLabel: string; onSubmit: (data: Partial<Client>) => void; onCancel?: () => void }) {
  const [f, setF] = useState(toForm(initial))
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); onSubmit(toData(f)); if (!initial) setF(toForm()) }}>
      <Field label="Nombre del cliente"><Input required value={f.full_name} onChange={set('full_name')} /></Field>
      <Field label="Teléfono"><Input type="tel" value={f.phone} onChange={set('phone')} /></Field>
      <Field label="Correo"><Input type="email" value={f.email} onChange={set('email')} /></Field>
      <Field label="Notas"><Textarea value={f.notes} onChange={set('notes')} /></Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button disabled={!f.full_name.trim()}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
