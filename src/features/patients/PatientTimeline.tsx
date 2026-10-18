import { useState } from 'react'
import { Badge, Empty, IconButton, Segmented } from '@/shared/ui'
import { formatUsd } from '@/core/pricing'
import { STATUS_LABEL, evolutionLabel } from '@/core/agenda'
import { formatTime } from '@/core/dates'
import type { TimelineItem, TimelineKind } from '@/core/dashboard'
import { STATUS_TONE } from '@/features/agenda/status'

type Filter = 'todo' | TimelineKind
const FILTERS: { value: Filter; label: string }[] = [{ value: 'todo', label: 'Todo' }, { value: 'consulta', label: 'Consultas' }, { value: 'peluqueria', label: 'Peluquería' }]
const when = (iso: string) => `${new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatTime(iso)}`

/** Historial del paciente con filtro por tipo. */
export function PatientTimeline({ items, onRemoveConsultation }: { items: TimelineItem[]; onRemoveConsultation: (id: string, label: string) => void }) {
  const [filter, setFilter] = useState<Filter>('todo')
  const shown = filter === 'todo' ? items : items.filter(i => i.kind === filter)
  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Filtrar historial" options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 && <Empty>{items.length === 0 ? 'Este paciente aún no tiene historial.' : 'No hay registros de este tipo.'}</Empty>}
      <ol className="flex flex-col">{shown.map((i, n) => (
        <li key={`${i.kind}-${i.id}`} className="flex gap-4">
          <div className="flex flex-col items-center" aria-hidden="true">
            <span className={`mt-1.5 size-3 rounded-full ${i.kind === 'consulta' ? 'bg-brand' : 'bg-[#d97706]'}`} />
            {n < shown.length - 1 && <span className="mt-1.5 w-0.5 flex-1 bg-line" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <span className="font-bold">{i.kind === 'consulta' ? 'Consulta' : 'Peluquería'} · {i.title}</span>
              <span className="text-sm text-muted">{when(i.date)}</span>
            </div>
            {i.lines.map(l => <p key={l} className="text-sm text-ink/80">{l}</p>)}
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink/80">
              {i.amountUsd ? <span>{formatUsd(i.amountUsd)}</span> : null}
              {i.status && <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>}
              {i.evolution && <Badge tone={i.evolution === 'empeoro' ? 'warn' : 'brand'}>Evolución: {evolutionLabel(i.evolution)}</Badge>}
              {i.removable && (
                <IconButton icon="trash" label={`Eliminar consulta ${i.title}`} className="ml-auto size-9 hover:text-danger-ink"
                  onClick={() => confirm('¿Eliminar esta consulta?') && onRemoveConsultation(i.id, i.title)} />)}
            </div>
          </div>
        </li>))}</ol>
    </div>
  )
}
