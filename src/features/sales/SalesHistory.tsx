import { useState } from 'react'
import { Button, Empty, Field, Input } from '@/shared/ui'
import { PAY_METHODS, formatBs, formatUsd, toBs } from '@/core/pricing'
import type { Client, Sale } from '@/core/entities'

interface Props { sales: Sale[]; clients: Client[]; onVoid: (saleId: string, reason: string) => void }

const when = (iso: string) => new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function SaleRow({ s, client, onVoid }: { s: Sale; client?: string; onVoid: (reason: string) => void }) {
  const [voiding, setVoiding] = useState(false); const [reason, setReason] = useState('')
  const voided = !!s.voided_at
  const method = PAY_METHODS.find(m => m.value === s.pay_method)?.label
  const bs = s.rate_bs ? toBs(Number(s.total_usd), Number(s.rate_bs)) : null
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{when(s.created_at)}</p>
          <p>{client ?? 'Venta de mostrador'}{method ? ` · ${method}` : ''}</p>
        </div>
        <div className="text-right">
          <p className={`font-medium ${voided ? 'text-slate-400 line-through' : ''}`}>{formatUsd(Number(s.total_usd))}</p>
          {bs !== null && <p className={`text-sm ${voided ? 'text-slate-400 line-through' : 'text-slate-500'}`}>{formatBs(bs)}</p>}
        </div>
      </div>
      {voided ? (
        <p className="mt-1 text-sm text-red-700"><span className="rounded bg-red-100 px-2 py-0.5">Anulada</span>{s.void_reason ? ` · ${s.void_reason}` : ''}</p>
      ) : (
        <div className="mt-1">
          {!voiding && <Button variant="danger" onClick={() => setVoiding(true)}>Anular venta</Button>}
          {voiding && (
            <form className="mt-2 grid gap-2 rounded-lg border p-3" onSubmit={e => { e.preventDefault(); onVoid(reason.trim()); setVoiding(false) }}>
              <Field label="Motivo de la anulación"><Input required value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej.: el cliente devolvió el producto" /></Field>
              <p className="text-sm text-slate-600">Los productos vuelven al inventario. La venta queda registrada como anulada.</p>
              <div className="flex gap-2">
                <Button variant="danger" disabled={!reason.trim()}>Confirmar anulación</Button>
                <Button type="button" variant="ghost" onClick={() => setVoiding(false)}>Cancelar</Button>
              </div>
            </form>)}
        </div>)}
    </li>
  )
}

export function SalesHistory({ sales, clients, onVoid }: Props) {
  if (sales.length === 0) return <Empty>Todavía no has registrado ventas.</Empty>
  return (
    <ul className="divide-y">{sales.map(s => (
      <SaleRow key={s.id} s={s} client={clients.find(c => c.id === s.client_id)?.full_name} onVoid={reason => onVoid(s.id, reason)} />))}</ul>
  )
}
