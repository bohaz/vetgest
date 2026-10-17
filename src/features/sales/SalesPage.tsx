import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCrud } from '@/shared/useCrud'
import { useRepository } from '@/shared/useRepository'
import { Button, Empty, Field, Input, Select } from '@/shared/ui'
import { registerSale } from '@/infra/supabase/rpc'
import { PAY_METHODS, addToCart, formatUsd, saleErrorMessage, setQty, type CartLine, type PayMethod } from '@/core/pricing'
import type { Client, Product, Sale } from '@/core/entities'
import { Cart } from './Cart'
import { useRate } from './useRate'

export function SalesPage() {
  const { tenantId } = useAuth(); const qc = useQueryClient()
  const products = useCrud<Product>('products', useRepository<Product>('products'))
  const clients = useCrud<Client>('clients', useRepository<Client>('clients'))
  const sales = useCrud<Sale>('sales', useRepository<Sale>('sales'))
  const { rate, save } = useRate()
  const [cart, setCart] = useState<CartLine[]>([]); const [q, setQ] = useState('')
  const [clientId, setClientId] = useState(''); const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const [rateInput, setRateInput] = useState(''); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const checkout = useMutation({
    mutationFn: () => registerSale(tenantId!, { clientId: clientId || undefined, method, items: cart.map(l => ({ product_id: l.productId, qty: l.qty })) }),
    onSuccess: () => { setCart([]); setMsg({ ok: true, text: 'Venta registrada.' }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['sales'] }) },
    onError: e => setMsg({ ok: false, text: saleErrorMessage(e) }),
  })
  const matches = (products.list.data ?? []).filter(p => p.stock > 0 && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)

  return (
    <section className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Ventas</h1>
      <form className="flex flex-wrap items-end gap-2 rounded-lg border p-3" onSubmit={e => { e.preventDefault(); save.mutate(Number(rateInput), { onSuccess: () => setRateInput('') }) }}>
        <Field label={`Tasa del día (Bs por USD)${rate ? ` — actual: ${rate}` : ' — sin definir'}`}>
          <Input type="number" step="0.01" min="0" value={rateInput} onChange={e => setRateInput(e.target.value)} />
        </Field>
        <Button variant="ghost" disabled={!(Number(rateInput) > 0)}>Guardar tasa</Button>
        {save.error && <p role="alert" className="text-sm text-red-600">{saleErrorMessage(save.error)}</p>}
      </form>

      <div>
        <Input placeholder="Buscar producto para vender" value={q} onChange={e => setQ(e.target.value)} />
        <ul className="divide-y">{matches.map(p => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <span>{p.name} <span className="text-sm text-slate-500">{formatUsd(p.price_usd)} · stock {p.stock}</span></span>
            <Button variant="ghost" onClick={() => setCart(addToCart(cart, p))}>Agregar</Button>
          </li>))}</ul>
        {products.list.data?.length === 0 && <Empty>Aún no hay productos. Créalos en Inventario.</Empty>}
      </div>

      <div className="rounded-lg border p-3">
        <Cart lines={cart} rate={rate} onQty={(id, n) => setCart(setQty(cart, id, n))} onRemove={id => setCart(setQty(cart, id, 0))} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Cliente (opcional)"><Select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Venta de mostrador</option>{clients.list.data?.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
          <Field label="Método de pago"><Select value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
            {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
        </div>
        <div className="mt-3"><Button disabled={cart.length === 0 || checkout.isPending} onClick={() => { setMsg(null); checkout.mutate() }}>Registrar venta</Button></div>
        {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? 'text-teal-700' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Últimas ventas</h2>
        {sales.list.data?.length === 0 && <Empty>Todavía no has registrado ventas.</Empty>}
        <ul className="divide-y">{sales.list.data?.slice(0, 10).map(s => (
          <li key={s.id} className="flex justify-between py-2"><span>{new Date(s.created_at).toLocaleString('es-VE')}</span>
            <span>{formatUsd(s.total_usd)}{s.rate_bs ? ` · Bs ${(s.total_usd * s.rate_bs).toFixed(2)}` : ''}</span></li>))}</ul>
      </div>
    </section>
  )
}
