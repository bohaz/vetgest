import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { persister } from '@/infra/local/db'

/** Aviso del modo demostración, con opción de volver a los datos de ejemplo. */
export function DemoBanner() {
  const [busy, setBusy] = useState(false)
  if (!isDemo) return null
  const reset = async () => {
    if (!confirm('¿Borrar todo lo que hiciste y volver a los datos de ejemplo?')) return
    setBusy(true)
    const { resetDemo } = await import('@/infra/demo/demoBackend')
    await supabase.auth.signOut().catch(() => undefined)
    await persister.removeClient()
    await resetDemo()
    try { Object.keys(localStorage).filter(k => k.startsWith('vetgest.') || k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)) } catch { /* sin almacenamiento */ }
    location.replace('/')
  }
  return (
    <p className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
      <span>Demostración · los datos se guardan solo en este navegador</span>
      <button className="underline disabled:opacity-50" disabled={busy} onClick={reset}>{busy ? 'Reiniciando…' : 'Reiniciar datos'}</button>
    </p>
  )
}
