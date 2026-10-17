import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Empty, Input } from '@/shared/ui'
import type { Client, Patient } from '@/core/entities'
import { PatientForm } from './PatientForm'

export function PatientsPage() {
  const patients = useCrud<Patient>('patients')
  const clients = useCrud<Client>('clients')
  const [q, setQ] = useState('')
  const owner = (id: string) => clients.list.data?.find(c => c.id === id)?.full_name ?? '—'
  const shown = patients.list.data?.filter(p => `${p.name} ${owner(p.client_id)}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Pacientes</h1>
      {clients.list.data?.length === 0 ? (
        <Empty>Primero registra un cliente (el dueño) para poder agregar su mascota o animal. <Link className="text-teal-700 underline" to="/clientes">Ir a Clientes</Link></Empty>
      ) : (
        <div className="mb-6"><PatientForm clients={clients.list.data ?? []} submitLabel="Agregar paciente" onSubmit={d => patients.create(d as Patient)} /></div>
      )}
      <Input placeholder="Buscar por paciente o dueño" value={q} onChange={e => setQ(e.target.value)} />
      {shown?.length === 0 && <Empty>No hay pacientes que coincidan.</Empty>}
      <ul className="mt-2 divide-y">{shown?.map(p => (
        <li key={p.id}><Link to={`/pacientes/${p.id}`} className="flex flex-wrap items-center justify-between gap-x-2 py-3 hover:bg-slate-50">
          <span className="font-medium">{p.name} <span className="font-normal text-slate-500">{p.species}{p.breed ? `, ${p.breed}` : ''}</span></span>
          <span className="text-sm text-slate-500">{owner(p.client_id)}</span></Link></li>))}</ul>
    </section>
  )
}
