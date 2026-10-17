import { useState } from 'react'
import { Button, Field, Input, Select } from '@/shared/ui'
import { SIZES } from '@/core/grooming'
import type { Client, Patient } from '@/core/entities'

const SPECIES = ['Perro', 'Gato', 'Bovino', 'Equino', 'Porcino', 'Ave', 'Otro']
type Form = { client_id: string; name: string; species: string; breed: string; birth_date: string; weight_kg: string; size: string }
const toForm = (p?: Patient): Form => ({
  client_id: p?.client_id ?? '', name: p?.name ?? '', species: p?.species ?? 'Perro', breed: p?.breed ?? '',
  birth_date: p?.birth_date ?? '', weight_kg: p?.weight_kg != null ? String(p.weight_kg) : '', size: p?.size ?? '',
})
// Los campos vacíos van como null para poder borrar un dato al editar.
export const toPatientData = (f: Form) => ({
  client_id: f.client_id, name: f.name.trim(), species: f.species, breed: f.breed.trim() || null,
  birth_date: f.birth_date || null, weight_kg: f.weight_kg ? Number(f.weight_kg) : null, size: f.size || null,
}) as unknown as Partial<Patient>

interface Props { clients: Client[]; initial?: Patient; submitLabel: string; onSubmit: (data: Partial<Patient>) => void; onCancel?: () => void }

export function PatientForm({ clients, initial, submitLabel, onSubmit, onCancel }: Props) {
  const [f, setF] = useState(toForm(initial))
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const species = SPECIES.includes(f.species) ? SPECIES : [...SPECIES, f.species]
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); onSubmit(toPatientData(f)); if (!initial) setF(toForm()) }}>
      <Field label="Dueño"><Select required value={f.client_id} onChange={set('client_id')}>
        <option value="">Selecciona un cliente</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
      <Field label="Nombre del paciente"><Input required value={f.name} onChange={set('name')} /></Field>
      <Field label="Especie"><Select value={f.species} onChange={set('species')}>{species.map(s => <option key={s}>{s}</option>)}</Select></Field>
      <Field label="Raza"><Input value={f.breed} onChange={set('breed')} /></Field>
      <Field label="Fecha de nacimiento"><Input type="date" value={f.birth_date} onChange={set('birth_date')} /></Field>
      <Field label="Peso (kg)"><Input type="number" step="0.01" min="0" value={f.weight_kg} onChange={set('weight_kg')} /></Field>
      <Field label="Tamaño (para peluquería)"><Select value={f.size} onChange={set('size')}>
        <option value="">Sin definir</option>{SIZES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}</Select></Field>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button disabled={!f.client_id || !f.name.trim()}>{submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
