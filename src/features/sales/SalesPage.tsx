import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { onlineManager, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCrud } from '@/shared/useCrud'
import { Button, Card, Empty, Field, IconButton, Page, PageHeader, SearchInput, Section, Segmented, Select } from '@/shared/ui'
import { KEYS, type SaleVars, type VoidVars } from '@/shared/queryClient'
import { CATEGORIES, PAY_METHODS, addToCart, cartTotal, formatBs, formatUsd, setQty, toBs, type CartLine, type PayMethod } from '@/core/pricing'
import type { Client, Product, Sale } from '@/core/entities'
import { Cart } from './Cart'
import { RateChip } from './RateChip'
import { SalesHistory } from './SalesHistory'
import { useRate } from './useRate'

const CATEGORY_FILTERS = [{ value: '', label: 'Todo' }, ...CATEGORIES.map(c => ({ value: c.value as string, label: c.label }))]

export function SalesPage() {
  const tenantId = useAuth().tenantId!
  const products = useCrud<Product>('products')
  const clients = useCrud<Client>('clients')
  const sales = useCrud<Sale>('sales')
  const { rate } = useRate()
  const checkout = useMutation<unknown, Error, SaleVars>({ mutationKey: KEYS.sale })
  const voidSale = useMutation<unknown, Error, VoidVars>({ mutationKey: KEYS.void })
  // Desde la ficha del paciente se llega con ?cliente=<id> para venderle a su dueño.
  const [params] = useSearchParams()
  const [cart, setCart] = useState<CartLine[]>([]); const [q, setQ] = useState(''); const [cat, setCat] = useState('')
  const [clientId, setClientId] = useState(params.get('cliente') ?? ''); const [method, setMethod] = useState<PayMethod>('efectivo_usd')
  const [msg, setMsg] = useState('')

  const register = () => {
    const offline = !onlineManager.isOnline()
    checkout.mutate({ tenantId, clientId: clientId || undefined, method, items: cart.map(l => ({ product_id: l.productId, qty: l.qty })) },
      // Si falla, el motivo aparece en el aviso de cambios no guardados, con opción de reintentar.
      { onSuccess: () => setMsg('Venta registrada.'), onError: () => setMsg('') })
    setCart([]); setClientId('')
    setMsg(offline ? 'Sin conexión: la venta se registrará al volver la señal.' : 'Registrando venta…')
  }
  const all = products.list.data ?? []
  const matches = all.filter(p => p.stock > 0 && (!cat || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12)
  const total = cartTotal(cart); const totalBs = toBs(total, rate)

  return (
    <Page>
      <PageHeader title="Ventas" actions={<RateChip />} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-3">
          <SearchInput label="Buscar producto para vender" value={q} onChange={e => setQ(e.target.value)} />
          <Segmented label="Categoría" options={CATEGORY_FILTERS} value={cat} onChange={setCat} />
          <Card className="p-2 sm:p-2">
            {all.length === 0 && <Empty>Aún no hay productos. Créalos en Inventario.</Empty>}
            {all.length > 0 && matches.length === 0 && <Empty>No hay productos con stock que coincidan.</Empty>}
            <ul className="divide-y divide-line">{matches.map(p => (
              <li key={p.id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold">{p.name}</span>
                  <span className="text-sm text-muted">{formatUsd(p.price_usd)} · {p.stock <= p.min_stock ? <b className="text-warn-ink">quedan {p.stock}</b> : `stock ${p.stock}`}</span>
                </span>
                <IconButton icon="plus" label={`Agregar ${p.name}`} className="bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand-strong" onClick={() => setCart(addToCart(cart, p))} />
              </li>))}</ul>
          </Card>
        </div>

        <Section title={cart.length ? `Carrito · ${cart.reduce((n, l) => n + l.qty, 0)} productos` : 'Carrito'} className="lg:sticky lg:top-4"
          action={cart.length ? <Button variant="ghost" className="min-h-9" onClick={() => setCart([])}>Vaciar</Button> : undefined}>
          <Cart lines={cart} rate={rate} onQty={(id, n) => setCart(setQty(cart, id, n))} onRemove={id => setCart(setQty(cart, id, 0))} />
          <div className="mt-4 grid gap-3">
            <Field label="Cliente (opcional)"><Select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Venta de mostrador</option>{clients.list.data?.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</Select></Field>
            <Field label="Método de pago"><Select value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
              {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            <button type="button" disabled={cart.length === 0} onClick={register}
              className="flex min-h-14 items-center justify-between rounded-xl bg-brand px-5 text-white hover:bg-brand-strong disabled:opacity-50">
              <span className="text-base font-extrabold">Registrar venta</span>
              {cart.length > 0 && <span className="flex flex-col items-end leading-tight"><span className="font-extrabold">{formatUsd(total)}</span>{totalBs !== null && <span className="text-xs text-[#cdede7]">{formatBs(totalBs)}</span>}</span>}
            </button>
            {msg && <p role="status" className="text-sm font-semibold text-brand-ink">{msg}</p>}
          </div>
        </Section>
      </div>

      <Section title="Últimas ventas">
        <SalesHistory sales={(sales.list.data ?? []).slice(0, 20)} clients={clients.list.data ?? []} onVoid={(saleId, reason) => voidSale.mutate({ tenantId, saleId, reason })} />
      </Section>
    </Page>
  )
}
