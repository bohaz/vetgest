import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty } from '@/shared/ui'
import { SIZES } from '@/core/grooming'
import { ConsultationsPanel } from '@/features/consultations/ConsultationsPanel'
import type { Client, Patient } from '@/core/entities'
import { PatientForm } from './PatientForm'

export function PatientDetailPage() {
  const { id = '' } = useParams(); const nav = useNavigate()
  // Se busca en la lista completa (ya en caché) para que la ficha abra también sin conexión.
  const patients = useCrud<Patient>('patients')
  const clients = useCrud<Client>('clients')
  const [editing, setEditing] = useState(false)
  const p = patients.list.data?.find(x => x.id === id)
  if (patients.list.isLoading) return <p className="p-4">Cargando…</p>
  if (!p) return <Empty>No encontramos este paciente. <Link className="text-teal-700 underline" to="/pacientes">Volver a Pacientes</Link></Empty>
  const owner = clients.list.data?.find(c => c.id === p.client_id)
  const age = p.birth_date ? Math.max(0, Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31557600000)) : null
  const size = SIZES.find(z => z.value === p.size)?.label
  return (
    <section className="p-4">
      <Link to="/pacientes" className="text-sm text-teal-700 underline">← Pacientes</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{p.name}</h1>
          <p className="text-slate-600">{[`${p.species}${p.breed ? `, ${p.breed}` : ''}`, age !== null ? `${age} años` : null, p.weight_kg ? `${p.weight_kg} kg` : null, size ? `Tamaño ${size.toLowerCase()}` : null].filter(Boolean).join(' · ')}</p>
          {owner && <p className="text-sm text-slate-500">Dueño: {owner.full_name}{owner.phone ? ` · ${owner.phone}` : ''}</p>}
        </div>
        <span className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Editar'}</Button>
          <Button variant="danger" onClick={() => { if (confirm(`¿Eliminar a ${p.name} y todo su historial?`)) { patients.remove(p.id, p.name); nav('/pacientes') } }}>Eliminar</Button>
        </span>
      </div>
      {editing && (
        <div className="mt-3 rounded-lg border p-3">
          <PatientForm clients={clients.list.data ?? []} initial={p} submitLabel="Guardar cambios" onSubmit={d => { patients.update(p.id, d); setEditing(false) }} onCancel={() => setEditing(false)} />
        </div>)}
      <ConsultationsPanel patientId={p.id} />
    </section>
  )
}
