import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { useRepository } from '@/shared/useRepository'
import { Button, Empty } from '@/shared/ui'
import { ConsultationsPanel } from '@/features/consultations/ConsultationsPanel'
import type { Patient } from '@/core/entities'

export function PatientDetailPage() {
  const { id = '' } = useParams(); const nav = useNavigate()
  const { list, remove } = useCrud<Patient>('patients', useRepository<Patient>('patients'), { id } as Partial<Patient>)
  const p = list.data?.[0]
  if (list.isLoading) return <p className="p-4">Cargando…</p>
  if (!p) return <Empty>No encontramos este paciente. <Link className="text-teal-700 underline" to="/pacientes">Volver a Pacientes</Link></Empty>
  const age = p.birth_date ? Math.max(0, Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31557600000)) : null
  return (
    <section className="p-4">
      <Link to="/pacientes" className="text-sm text-teal-700 underline">← Pacientes</Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{p.name}</h1>
          <p className="text-slate-600">{p.species}{p.breed ? `, ${p.breed}` : ''}{age !== null ? ` · ${age} años` : ''}{p.weight_kg ? ` · ${p.weight_kg} kg` : ''}</p>
        </div>
        <Button variant="danger" onClick={() => confirm(`¿Eliminar a ${p.name} y todo su historial?`) && remove.mutate(p.id, { onSuccess: () => nav('/pacientes') })}>Eliminar</Button>
      </div>
      <ConsultationsPanel patientId={p.id} />
    </section>
  )
}
