import { useState } from 'react'
import { onlineManager, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCrud } from '@/shared/useCrud'
import { Button, Empty, Field, Input, Select } from '@/shared/ui'
import { KEYS, type SaleVars, type VoidVars } from '@/shared/queryClient'
import { PAY_METHODS, addToCart, formatUsd, setQty, type CartLine, type PayMethod } from '@/core/pricing'
import type { Client, Product, Sale } from '@/core/entities'
import { Cart } from './Cart'
import { SalesHistory } from './SalesHistory'
import { useRate } from './useRate'

export function SalesPage() {
  const tenantId = useAuth().tenantId!
  const products = useCrud<Product>('products')
  const clients = useCrud<Client>('clients')
  const sales = useCrud<Sale>('sales')
  const { rate, save } = useRate()
  const checkout = useMutation<unknown, Error, SaleVars>({ mutationKey: KEYS.sale })
  const voidSale = useMutation<unknown, Error, VoidVars>({ mutationKey: KEYS.void })
  const [cart, setCart] = useState<CartLine[]>([]); const [q, setQ] = useState('')
  const [clientId, setClientId] = useState(''); const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const [rateInput, setRateInput] = useState(''); const [msg, setMsg] = useState('')

  const register = () => {
    const offline = !onlineManager.isOnline()
    checkout.mutate({ tenantId, clientId: clientId || undefined, method, items: cart.map(l => ({ product_id: l.productId, qty: l.qty })) },
      // Si falla, el motivo aparece en el aviso de cambios no guardados, con opción de reintentar.
      { onSuccess: () => setMsg('Venta registrada.'), onError: () => setMsg('') })
    setCart([]); setClientId('')
    setMsg(offline ? 'Sin conexión: la venta se registrará al volver la señal.' : 'Registrando venta…')
  }
  const matches = (products.list.data ?? []).filter(p => p.stock > 0 && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)

  return (
    <section className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Ventas</h1>
      <form className="flex flex-wrap items-end gap-2 rounded-lg border p-3" onSubmit={e => { e.preventDefault(); save(Number(rateInput)); setRateInput('') }}>
        <Field label={`Tasa del día (Bs por USD)${rate ? ` — actual: ${rate}` : ' — sin definir'}`}>
          <Input type="number" step="0.01" min="0" value={rateInput} onChange={e => setRateInput(e.target.value)} />
        </Field>
        <Button variant="ghost" disabled={!(Number(rateInput) > 0)}>Guardar tasa</Button>
      </form>

      <div>
        <Input placeholder="Buscar producto para vender" value={q} onChange={e => setQ(e.target.value)} />
        <ul className="divide-y">{matches.map(p => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
            <span className="min-w-0">{p.name} <span className="text-sm text-slate-500">{formatUsd(p.price_usd)} · stock {p.stock}</span></span>
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
        <div className="mt-3"><Button disabled={cart.length === 0} onClick={register}>Registrar venta</Button></div>
        {msg && <p role="status" className="mt-2 text-sm text-teal-700">{msg}</p>}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Últimas ventas</h2>
        <SalesHistory sales={(sales.list.data ?? []).slice(0, 20)} clients={clients.list.data ?? []} onVoid={(saleId, reason) => voidSale.mutate({ tenantId, saleId, reason })} />
      </div>
    </section>
  )
}
