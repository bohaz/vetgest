import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { Button, Card, CreatePanel, Empty, Field, IconButton, Input } from '@/shared/ui'
import { formatUsd } from '@/core/pricing'
import type { GroomingService } from '@/core/entities'

type Prices = { price_small: string; price_medium: string; price_large: string }
const PRICE_LABELS: [keyof Prices, string][] = [['price_small', 'Pequeño (USD)'], ['price_medium', 'Mediano (USD)'], ['price_large', 'Grande (USD)']]
const toNumbers = (v: Prices) => ({ price_small: Number(v.price_small), price_medium: Number(v.price_medium), price_large: Number(v.price_large) })

function PriceFields({ v, onChange }: { v: Prices; onChange: (k: keyof Prices, value: string) => void }) {
  return <>{PRICE_LABELS.map(([k, label]) => (
    <Field key={k} label={label}><Input required type="number" step="0.01" min="0" value={v[k]} onChange={e => onChange(k, e.target.value)} /></Field>))}</>
}

function ServiceRow({ s, onSave, onRemove }: { s: GroomingService; onSave: (d: Partial<GroomingService>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Prices>({ price_small: String(s.price_small), price_medium: String(s.price_medium), price_large: String(s.price_large) })
  const [mins, setMins] = useState(String(s.duration_min))
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{s.name} <span className="text-sm font-normal text-muted">· {s.duration_min} min</span></p>
          <p className="text-sm text-muted">Pequeño {formatUsd(s.price_small)} · Mediano {formatUsd(s.price_medium)} · Grande {formatUsd(s.price_large)}</p>
        </div>
        <IconButton icon={open ? 'close' : 'edit'} label={open ? 'Cerrar edición' : `Editar ${s.name}`} onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <form className="mt-3 grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); onSave({ ...toNumbers(v), duration_min: Number(mins) }); setOpen(false) }}>
          <PriceFields v={v} onChange={(k, val) => setV({ ...v, [k]: val })} />
          <Field label="Duración (min)"><Input required type="number" min="5" step="5" value={mins} onChange={e => setMins(e.target.value)} /></Field>
          <div className="flex gap-2 sm:col-span-4"><Button>Guardar cambios</Button>
            <Button type="button" variant="danger" onClick={() => confirm(`¿Eliminar ${s.name}?`) && onRemove()}>Eliminar</Button></div>
        </form>)}
    </li>
  )
}

export function ServicesPage() {
  const { list, create, update, remove } = useCrud<GroomingService>('grooming_services')
  const [name, setName] = useState(''); const [mins, setMins] = useState('60'); const [v, setV] = useState<Prices>({ price_small: '', price_medium: '', price_large: '' })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create({ name: name.trim(), ...toNumbers(v), duration_min: Number(mins) })
    setName(''); setV({ price_small: '', price_medium: '', price_large: '' })
  }
  return (
    <div className="flex flex-col gap-4">
      <CreatePanel label="Nuevo servicio">{close => (
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { submit(e); close() }}>
        <Field label="Nombre del servicio"><Input required value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Duración (min)"><Input required type="number" min="5" step="5" value={mins} onChange={e => setMins(e.target.value)} /></Field>
        <PriceFields v={v} onChange={(k, val) => setV({ ...v, [k]: val })} />
        <div className="sm:col-span-2"><Button disabled={!name.trim()}>Agregar servicio</Button></div>
      </form>)}</CreatePanel>
      <Card>
        {list.data?.length === 0 && <Empty>Aún no tienes servicios. Agrega el primero, por ejemplo «Baño y corte».</Empty>}
        <ul className="divide-y divide-line">{list.data?.map(s => <ServiceRow key={s.id} s={s} onSave={data => update(s.id, data)} onRemove={() => remove(s.id, s.name)} />)}</ul>
      </Card>
    </div>
  )
}
