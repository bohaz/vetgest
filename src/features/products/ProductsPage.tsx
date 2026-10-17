import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty, Field, Input, Select } from '@/shared/ui'
import { CATEGORIES, formatUsd, isLowStock } from '@/core/pricing'
import type { Product } from '@/core/entities'

const blank = { name: '', category: 'farmaco', price_usd: '', stock: '', min_stock: '' }

function ProductRow({ p, onSave, onRemove }: { p: Product; onSave: (data: Partial<Product>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false); const [price, setPrice] = useState(String(p.price_usd)); const [add, setAdd] = useState(''); const [min, setMin] = useState(String(p.min_stock))
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{p.name} <span className="text-sm font-normal text-slate-500">{CATEGORIES.find(c => c.value === p.category)?.label}</span></span>
        <span className="flex flex-wrap items-center gap-3 text-sm">
          {isLowStock(p) && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Stock bajo</span>}
          <span>{formatUsd(p.price_usd)} · {p.stock} en stock</span>
          <Button variant="ghost" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : 'Editar'}</Button>
        </span>
      </div>
      {open && (
        <div className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
          <Field label="Precio (USD)"><Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} /></Field>
          <Field label="Sumar al stock"><Input type="number" step="any" min="0" value={add} onChange={e => setAdd(e.target.value)} /></Field>
          <Field label="Stock mínimo"><Input type="number" step="any" min="0" value={min} onChange={e => setMin(e.target.value)} /></Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button onClick={() => { onSave({ price_usd: Number(price), stock: p.stock + Number(add || 0), min_stock: Number(min) }); setAdd(''); setOpen(false) }}>Guardar cambios</Button>
            <Button variant="danger" onClick={() => confirm(`¿Eliminar ${p.name}?`) && onRemove()}>Eliminar</Button>
          </div>
        </div>)}
    </li>
  )
}

export function ProductsPage() {
  const { list, create, update, remove } = useCrud<Product>('products')
  const [f, setF] = useState(blank); const [q, setQ] = useState(''); const [cat, setCat] = useState('')
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create({ name: f.name.trim(), category: f.category as Product['category'], price_usd: Number(f.price_usd || 0), stock: Number(f.stock || 0), min_stock: Number(f.min_stock || 0) })
    setF(blank)
  }
  const shown = (list.data ?? []).filter(p => (!cat || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
  const low = (list.data ?? []).filter(isLowStock).length
  return (
    <section className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Inventario</h1>
      <form className="mb-4 grid gap-3 sm:grid-cols-3" onSubmit={submit}>
        <Field label="Nombre del producto"><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Categoría"><Select value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
        <Field label="Precio (USD)"><Input required type="number" step="0.01" min="0" value={f.price_usd} onChange={set('price_usd')} /></Field>
        <Field label="Stock inicial"><Input type="number" step="any" min="0" value={f.stock} onChange={set('stock')} /></Field>
        <Field label="Stock mínimo (alerta)"><Input type="number" step="any" min="0" value={f.min_stock} onChange={set('min_stock')} /></Field>
        <div className="flex items-end"><Button disabled={!f.name.trim() || !f.price_usd}>Agregar producto</Button></div>
      </form>
      {low > 0 && <p className="mb-2 text-sm text-amber-800">{low} {low === 1 ? 'producto con' : 'productos con'} stock bajo.</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
        <Input placeholder="Buscar producto" value={q} onChange={e => setQ(e.target.value)} />
        <Select value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas las categorías</option>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
      </div>
      {list.data?.length === 0 && <Empty>Aún no tienes productos. Agrega el primero.</Empty>}
      <ul className="mt-2 divide-y">{shown.map(p => <ProductRow key={p.id} p={p} onSave={data => update(p.id, data)} onRemove={() => remove(p.id, p.name)} />)}</ul>
    </section>
  )
}
