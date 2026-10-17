import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { useRepository } from '@/shared/useRepository'
import { Button, Empty, ErrorNote, Field, Input, Select } from '@/shared/ui'
import { SIZES } from '@/core/grooming'
import type { Client, Patient } from '@/core/entities'

const SPECIES = ['Perro', 'Gato', 'Bovino', 'Equino', 'Porcino', 'Ave', 'Otro']
const blank = { client_id: '', name: '', species: 'Perro', breed: '', birth_date: '', weight_kg: '', size: '' }

export function PatientsPage() {
  const patients = useCrud<Patient>('patients', useRepository<Patient>('patients'))
  const clients = useCrud<Client>('clients', useRepository<Client>('clients'))
  const [f, setF] = useState(blank); const [q, setQ] = useState('')
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const owner = (id: string) => clients.list.data?.find(c => c.id === id)?.full_name ?? '—'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    patients.create.mutate({
      client_id: f.client_id, name: f.name.trim(), species: f.species, breed: f.breed.trim() || undefined,
      birth_date: f.birth_date || undefined, weight_kg: f.weight_kg ? Number(f.weight_kg) : undefined, size: (f.size || undefined) as Patient['size'],
    }, { onSuccess: () => setF(blank) })
  }
  const shown = patients.list.data?.filter(p => `${p.name} ${owner(p.client_id)}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Pacientes</h1>
      {clients.list.data?.length === 0 ? (
        <Empty>Primero registra un cliente (el dueño) para poder agregar su mascota o animal. <Link className="text-teal-700 underline" to="/clientes">Ir a Clientes</Link></Empty>
      ) : (
        <form className="mb-6 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          <Field label="Dueño"><Select required value={f.client_id} onChange={set('client_id')}>
            <option value="">Selecciona un cliente</option>
            {clients.list.data?.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
          <Field label="Nombre del paciente"><Input required value={f.name} onChange={set('name')} /></Field>
          <Field label="Especie"><Select value={f.species} onChange={set('species')}>{SPECIES.map(s => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Raza"><Input value={f.breed} onChange={set('breed')} /></Field>
          <Field label="Fecha de nacimiento"><Input type="date" value={f.birth_date} onChange={set('birth_date')} /></Field>
          <Field label="Peso (kg)"><Input type="number" step="0.01" min="0" value={f.weight_kg} onChange={set('weight_kg')} /></Field>
          <Field label="Tamaño (para peluquería)"><Select value={f.size} onChange={set('size')}>
            <option value="">Sin definir</option>{SIZES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Button disabled={!f.client_id || !f.name.trim()}>Agregar paciente</Button></div>
        </form>
      )}
      <ErrorNote error={patients.create.error} />
      <Input placeholder="Buscar por paciente o dueño" value={q} onChange={e => setQ(e.target.value)} />
      {shown?.length === 0 && <Empty>No hay pacientes que coincidan.</Empty>}
      <ul className="mt-2 divide-y">{shown?.map(p => (
        <li key={p.id}><Link to={`/pacientes/${p.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50">
          <span className="font-medium">{p.name} <span className="font-normal text-slate-500">{p.species}{p.breed ? `, ${p.breed}` : ''}</span></span>
          <span className="text-sm text-slate-500">{owner(p.client_id)}</span></Link></li>))}</ul>
    </section>
  )
}
