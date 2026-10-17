import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { useRepository } from '@/shared/useRepository'
import { Button, Empty, ErrorNote, Field, Input } from '@/shared/ui'
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
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{s.name} <span className="text-sm font-normal text-slate-500">{s.duration_min} min</span></span>
        <span className="flex items-center gap-3 text-sm">
          <span>{formatUsd(s.price_small)} / {formatUsd(s.price_medium)} / {formatUsd(s.price_large)}</span>
          <Button variant="ghost" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : 'Editar'}</Button>
        </span>
      </div>
      {open && (
        <form className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); onSave({ ...toNumbers(v), duration_min: Number(mins) }); setOpen(false) }}>
          <PriceFields v={v} onChange={(k, val) => setV({ ...v, [k]: val })} />
          <Field label="Duración (min)"><Input required type="number" min="5" step="5" value={mins} onChange={e => setMins(e.target.value)} /></Field>
          <div className="flex gap-2 sm:col-span-4"><Button>Guardar cambios</Button>
            <Button type="button" variant="danger" onClick={() => confirm(`¿Eliminar ${s.name}?`) && onRemove()}>Eliminar</Button></div>
        </form>)}
    </li>
  )
}

export function ServicesPage() {
  const { list, create, update, remove } = useCrud<GroomingService>('grooming_services', useRepository<GroomingService>('grooming_services'))
  const [name, setName] = useState(''); const [mins, setMins] = useState('60'); const [v, setV] = useState<Prices>({ price_small: '', price_medium: '', price_large: '' })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate({ name: name.trim(), ...toNumbers(v), duration_min: Number(mins) }, { onSuccess: () => { setName(''); setV({ price_small: '', price_medium: '', price_large: '' }) } })
  }
  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Servicios de peluquería</h1>
      <form className="mb-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Nombre del servicio"><Input required value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Duración (min)"><Input required type="number" min="5" step="5" value={mins} onChange={e => setMins(e.target.value)} /></Field>
        <PriceFields v={v} onChange={(k, val) => setV({ ...v, [k]: val })} />
        <div className="sm:col-span-2"><Button disabled={!name.trim()}>Agregar servicio</Button></div>
      </form>
      <ErrorNote error={create.error ?? update.error} />
      {list.data?.length === 0 && <Empty>Aún no tienes servicios. Agrega el primero, por ejemplo "Baño y corte".</Empty>}
      <ul className="divide-y">{list.data?.map(s => <ServiceRow key={s.id} s={s} onSave={data => update.mutate({ id: s.id, data })} onRemove={() => remove.mutate(s.id)} />)}</ul>
    </section>
  )
}
