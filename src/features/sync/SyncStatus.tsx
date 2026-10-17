import { useSyncExternalStore } from 'react'
import { onlineManager, useMutationState, useQueryClient } from '@tanstack/react-query'
import { retryFailure } from '@/shared/queryClient'
import { failures, useFailures } from './failures'

const useOnline = () => useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline())

/** Aviso de conexión: cambios pendientes de enviar y cambios que el servidor rechazó. */
export function SyncStatus() {
  const qc = useQueryClient()
  const online = useOnline()
  const pending = useMutationState({ filters: { status: 'pending' } }).length
  const failed = useFailures()
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  return (
    <div aria-live="polite">
      {!online && (
        <p className="bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Sin conexión. Puedes seguir trabajando{pending > 0 ? `: ${plural(pending, 'cambio se guardará', 'cambios se guardarán')} al volver la señal` : ''}.
        </p>)}
      {online && pending > 0 && <p className="bg-slate-50 px-4 py-2 text-sm text-slate-700">Guardando {plural(pending, 'cambio', 'cambios')}…</p>}
      {failed.length > 0 && (
        <div role="alert" className="space-y-2 bg-red-50 px-4 py-2 text-sm text-red-800">
          <p className="font-medium">{plural(failed.length, 'cambio no se pudo guardar', 'cambios no se pudieron guardar')}:</p>
          <ul className="space-y-1">{failed.map(f => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{f.label}:</b> {f.message}</span>
              <span className="flex gap-3">
                <button className="underline" onClick={() => void retryFailure(qc, f)}>Reintentar</button>
                <button className="underline" onClick={() => failures.remove(f.id)}>Descartar</button>
              </span>
            </li>))}</ul>
        </div>)}
    </div>
  )
}
