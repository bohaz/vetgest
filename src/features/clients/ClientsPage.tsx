import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty, Input } from '@/shared/ui'
import type { Client } from '@/core/entities'
import { ClientForm } from './ClientForm'

function ClientRow({ c, onSave, onRemove }: { c: Client; onSave: (d: Partial<Client>) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{c.full_name}</p>
          {(c.phone || c.email) && <p className="text-sm text-slate-500">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>}
        </div>
        <span className="flex gap-1">
          <Button variant="ghost" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar' : 'Editar'}</Button>
          <Button variant="danger" onClick={() => confirm(`¿Eliminar a ${c.full_name} y sus pacientes?`) && onRemove()}>Eliminar</Button>
        </span>
      </div>
      {editing && (
        <div className="mt-2 rounded-lg border p-3">
          <ClientForm initial={c} submitLabel="Guardar cambios" onSubmit={d => { onSave(d); setEditing(false) }} onCancel={() => setEditing(false)} />
        </div>)}
    </li>
  )
}

export function ClientsPage() {
  const { list, create, update, remove } = useCrud<Client>('clients')
  const [q, setQ] = useState('')
  const shown = list.data?.filter(c => `${c.full_name} ${c.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Clientes</h1>
      <div className="mb-6"><ClientForm submitLabel="Agregar cliente" onSubmit={d => create(d as Client)} /></div>
      <Input placeholder="Buscar por nombre o teléfono" value={q} onChange={e => setQ(e.target.value)} />
      {list.data?.length === 0 && <Empty>Aún no tienes clientes. Agrega el primero.</Empty>}
      {!!list.data?.length && shown?.length === 0 && <Empty>No hay clientes que coincidan.</Empty>}
      <ul className="mt-2 divide-y">{shown?.map(c => <ClientRow key={c.id} c={c} onSave={d => update(c.id, d)} onRemove={() => remove(c.id, c.full_name)} />)}</ul>
    </section>
  )
}
