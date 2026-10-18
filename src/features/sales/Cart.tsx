import { Button, Empty } from '@/shared/ui'
import { cartTotal, formatBs, formatUsd, lineTotal, toBs, type CartLine } from '@/core/pricing'

interface Props { lines: CartLine[]; rate: number | null; onQty: (productId: string, qty: number) => void; onRemove: (productId: string) => void }

export function Cart({ lines, rate, onQty, onRemove }: Props) {
  if (lines.length === 0) return <Empty>El carrito está vacío. Agrega productos para vender.</Empty>
  const total = cartTotal(lines); const bs = toBs(total, rate)
  const step = 'size-10 rounded-xl border border-line-strong bg-white text-lg disabled:opacity-40'
  return (
    <div>
      <ul className="divide-y divide-line">{lines.map(l => (
        <li key={l.productId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
          <span className="min-w-0 font-semibold">{l.name} <span className="text-sm font-normal text-muted">{formatUsd(l.unitPrice)} c/u</span></span>
          <span className="flex items-center gap-2">
            <button className={step} aria-label={`Quitar una unidad de ${l.name}`} onClick={() => onQty(l.productId, l.qty - 1)}>−</button>
            <span aria-label={`Cantidad de ${l.name}`} className="w-6 text-center font-bold">{l.qty}</span>
            <button className={step} aria-label={`Agregar una unidad de ${l.name}`} disabled={l.qty >= l.stock} onClick={() => onQty(l.productId, l.qty + 1)}>+</button>
            <span className="w-24 text-right font-bold">{formatUsd(lineTotal(l))}</span>
            <Button variant="danger" onClick={() => onRemove(l.productId)}>Quitar</Button>
          </span>
        </li>))}</ul>
      <p className="mt-3 text-right text-xl font-extrabold">Total: {formatUsd(total)}</p>
      <p className="text-right text-muted">{bs !== null ? formatBs(bs) : 'Define la tasa del día para ver el total en Bs.'}</p>
    </div>
  )
}
