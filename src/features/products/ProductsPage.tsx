import { useState } from 'react'
import { useCrud } from '@/shared/useCrud'
import { Badge, Button, Card, CreatePanel, Empty, Field, IconButton, Input, Page, PageHeader, SearchInput, Segmented, Select } from '@/shared/ui'
import { CATEGORIES, formatUsd, isLowStock } from '@/core/pricing'
import type { Product } from '@/core/entities'

const blank = { name: '', category: 'farmaco', price_usd: '', stock: '', min_stock: '' }

function ProductRow({ p, onSave, onRemove }: { p: Product; onSave: (data: Partial<Product>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false); const [price, setPrice] = useState(String(p.price_usd)); const [add, setAdd] = useState(''); const [min, setMin] = useState(String(p.min_stock))
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{p.name}</p>
          <p className="text-sm text-muted">{CATEGORIES.find(c => c.value === p.category)?.label} · {formatUsd(p.price_usd)}</p>
        </div>
        {isLowStock(p) ? <Badge tone="warn">{p.stock === 0 ? 'Agotado' : `Quedan ${p.stock}`}</Badge> : <span className="text-sm text-muted">{p.stock} en stock</span>}
        <IconButton icon={open ? 'close' : 'edit'} label={open ? 'Cerrar edición' : `Editar ${p.name}`} onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <div className="mt-3 grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-4">
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
  const filters = [{ value: '', label: 'Todo' }, ...CATEGORIES.map(c => ({ value: c.value as string, label: c.label }))]
  return (
    <Page>
      <PageHeader title="Inventario" subtitle={low > 0 ? `${low} ${low === 1 ? 'producto con' : 'productos con'} stock bajo` : `${list.data?.length ?? 0} productos`} />
      <CreatePanel label="Nuevo producto">{close => (
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={e => { submit(e); close() }}>
          <Field label="Nombre del producto"><Input required value={f.name} onChange={set('name')} /></Field>
          <Field label="Categoría"><Select value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
          <Field label="Precio (USD)"><Input required type="number" inputMode="decimal" step="0.01" min="0" value={f.price_usd} onChange={set('price_usd')} /></Field>
          <Field label="Stock inicial"><Input type="number" step="any" min="0" value={f.stock} onChange={set('stock')} /></Field>
          <Field label="Stock mínimo (alerta)"><Input type="number" step="any" min="0" value={f.min_stock} onChange={set('min_stock')} /></Field>
          <div className="flex items-end"><Button disabled={!f.name.trim() || !f.price_usd}>Agregar producto</Button></div>
        </form>)}
      </CreatePanel>
      <SearchInput label="Buscar producto" value={q} onChange={e => setQ(e.target.value)} />
      <Segmented label="Categoría" options={filters} value={cat} onChange={setCat} />
      <Card>
        {list.data?.length === 0 && <Empty>Aún no tienes productos. Agrega el primero.</Empty>}
        {!!list.data?.length && shown.length === 0 && <Empty>No hay productos que coincidan.</Empty>}
        <ul className="divide-y divide-line">{shown.map(p => <ProductRow key={p.id} p={p} onSave={data => update(p.id, data)} onRemove={() => remove(p.id, p.name)} />)}</ul>
      </Card>
    </Page>
  )
}
