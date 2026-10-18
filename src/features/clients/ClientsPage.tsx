import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCrud } from '@/shared/useCrud'
import { Avatar, Card, CreatePanel, Empty, IconButton, Page, PageHeader, SearchInput } from '@/shared/ui'
import type { Client } from '@/core/entities'
import { ClientForm } from './ClientForm'

function ClientRow({ c, onSave, onRemove }: { c: Client; onSave: (d: Partial<Client>) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Avatar name={c.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{c.full_name}</p>
          {(c.phone || c.email) && <p className="truncate text-sm text-muted">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>}
        </div>
        <IconButton icon={editing ? 'close' : 'edit'} label={editing ? 'Cerrar edición' : `Editar a ${c.full_name}`} onClick={() => setEditing(!editing)} />
        <IconButton icon="trash" label={`Eliminar a ${c.full_name}`} className="hover:text-danger-ink" onClick={() => confirm(`¿Eliminar a ${c.full_name} y sus pacientes?`) && onRemove()} />
      </div>
      {editing && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <ClientForm initial={c} submitLabel="Guardar cambios" onSubmit={d => { onSave(d); setEditing(false) }} onCancel={() => setEditing(false)} />
        </div>)}
    </li>
  )
}

export function ClientsPage() {
  const { list, create, update, remove } = useCrud<Client>('clients')
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const all = list.data ?? []
  const shown = all.filter(c => `${c.full_name} ${c.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Page>
      <PageHeader title="Clientes" subtitle={`${all.length} ${all.length === 1 ? 'cliente' : 'clientes'}`} />
      <CreatePanel label="Nuevo cliente" defaultOpen={params.has('nuevo')}>
        {close => <ClientForm submitLabel="Agregar cliente" onSubmit={d => { create(d as Client); close() }} />}
      </CreatePanel>
      <SearchInput label="Buscar por nombre o teléfono" value={q} onChange={e => setQ(e.target.value)} />
      <Card>
        {all.length === 0 && <Empty>Aún no tienes clientes. Agrega el primero.</Empty>}
        {all.length > 0 && shown.length === 0 && <Empty>No hay clientes que coincidan.</Empty>}
        <ul className="divide-y divide-line">{shown.map(c => <ClientRow key={c.id} c={c} onSave={d => update(c.id, d)} onRemove={() => remove(c.id, c.full_name)} />)}</ul>
      </Card>
    </Page>
  )
}
