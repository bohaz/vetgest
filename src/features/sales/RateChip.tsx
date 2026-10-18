import { useState } from 'react'
import { Button, Input } from '@/shared/ui'
import { useRate } from './useRate'

const fmt = (r: number) => r.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Tasa del día (Bs por USD). Al tocarla se edita; solo el dueño o un administrador pueden guardarla. */
export function RateChip() {
  const { rate, save } = useRate()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  if (!editing) {
    return (
      <button type="button" onClick={() => { setValue(rate ? String(rate) : ''); setEditing(true) }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm text-ink/80 hover:bg-ground">
        Tasa del día <b className="text-ink">{rate ? `${fmt(rate)} Bs` : 'sin definir'}</b>
      </button>
    )
  }
  const n = Number(value.replace(',', '.'))
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); if (n > 0) { save(n); setEditing(false) } }}>
      <label className="sr-only" htmlFor="rate-input">Tasa del día en Bs por USD</label>
      <Input id="rate-input" inputMode="decimal" autoFocus value={value} onChange={e => setValue(e.target.value)} className="w-32" placeholder="Bs por USD" />
      <Button disabled={!(n > 0)}>Guardar</Button>
      <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
    </form>
  )
}
