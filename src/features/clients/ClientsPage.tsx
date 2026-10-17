import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { useRepository } from '@/shared/useRepository'
import { Button, Empty, ErrorNote, Input } from '@/shared/ui'
import type { Client } from '@/core/entities'

export function ClientsPage() {
  const { list, create, remove } = useCrud<Client>('clients', useRepository<Client>('clients'))
  const [name, setName] = useState(''); const [phone, setPhone] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate({ full_name: name.trim(), phone: phone.trim() || undefined }, { onSuccess: () => { setName(''); setPhone('') } })
  }
  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Clientes</h1>
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_10rem_auto]" onSubmit={submit}>
        <Input required placeholder="Nombre del cliente" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Teléfono" value={phone} onChange={e => setPhone(e.target.value)} />
        <Button disabled={!name.trim()}>Agregar cliente</Button>
      </form>
      <ErrorNote error={create.error} />
      {list.data?.length === 0 && <Empty>Aún no tienes clientes. Agrega el primero.</Empty>}
      <ul className="divide-y">{list.data?.map(c => (
        <li key={c.id} className="flex items-center justify-between py-2">
          <span>{c.full_name}{c.phone && <span className="ml-2 text-sm text-slate-500">{c.phone}</span>}</span>
          <Button variant="danger" onClick={() => confirm(`¿Eliminar a ${c.full_name} y sus pacientes?`) && remove.mutate(c.id)}>Eliminar</Button>
        </li>))}</ul>
    </section>
  )
}
