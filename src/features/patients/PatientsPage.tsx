import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Avatar, ButtonLink, Card, CreatePanel, Empty, Page, PageHeader, SearchInput } from '@/shared/ui'
import { Icon } from '@/shared/icons'
import type { Client, Patient } from '@/core/entities'
import { PatientForm } from './PatientForm'

export function PatientsPage() {
  const patients = useCrud<Patient>('patients')
  const clients = useCrud<Client>('clients')
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const owner = (id: string) => clients.list.data?.find(c => c.id === id)?.full_name ?? '—'
  const all = patients.list.data ?? []
  const shown = all.filter(p => `${p.name} ${owner(p.client_id)}`.toLowerCase().includes(q.toLowerCase()))
  const noClients = clients.list.data?.length === 0

  return (
    <Page>
      <PageHeader title="Pacientes" subtitle="Elige un paciente para ver su ficha o registrar una consulta." />
      {noClients ? (
        <Card>
          <Empty>Primero registra un cliente (el dueño) para poder agregar su mascota o animal.</Empty>
          <div className="flex justify-center"><ButtonLink to="/clientes?nuevo=1" icon="plus">Nuevo cliente</ButtonLink></div>
        </Card>
      ) : (
        <CreatePanel label="Nuevo paciente" defaultOpen={params.has('nuevo')}>
          {close => <PatientForm clients={clients.list.data ?? []} submitLabel="Agregar paciente" onSubmit={d => { patients.create(d as Patient); close() }} />}
        </CreatePanel>
      )}
      <SearchInput label="Buscar por paciente o dueño" value={q} onChange={e => setQ(e.target.value)} />
      <Card className="p-2 sm:p-2">
        {shown.length === 0 && <Empty>{all.length === 0 ? 'Aún no hay pacientes.' : 'No hay pacientes que coincidan.'}</Empty>}
        <ul className="divide-y divide-line">{shown.map(p => (
          <li key={p.id}>
            <Link to={`/pacientes/${p.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 no-underline hover:bg-ground">
              <Avatar name={p.name} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-bold text-ink">{p.name} <span className="font-normal text-muted">{p.species}{p.breed ? `, ${p.breed}` : ''}</span></span>
                <span className="truncate text-sm text-muted">{owner(p.client_id)}</span>
              </span>
              <Icon name="chevronRight" className="text-muted" />
            </Link>
          </li>))}</ul>
      </Card>
    </Page>
  )
}
