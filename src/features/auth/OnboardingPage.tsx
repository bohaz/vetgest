import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { clearInviteCode, storedInviteCode } from './inviteCode'
import { errorMessage } from '@/core/errors'

export function OnboardingPage() {
  const { createBusiness } = useAuth()
  const [name, setName] = useState(''); const [code, setCode] = useState(storedInviteCode())
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setMsg('Escribe el nombre de la veterinaria.'); return }
    setBusy(true); setMsg('')
    try {
      await createBusiness(name.trim(), code.trim() || undefined)
      clearInviteCode()
    } catch (err) {
      setMsg(errorMessage(err, 'No se pudo registrar el negocio. Inténtalo de nuevo.'))
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Registra tu negocio</h1>
      <p className="text-slate-600">{code ? 'Con tu código de invitación tendrás un periodo de prueba extendido.' : 'Tienes 7 días de prueba, sin pagar nada.'}</p>
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Nombre de la veterinaria
          <input className={input} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Código de invitación (opcional)
          <input className={input} value={code} autoCapitalize="characters" onChange={e => setCode(e.target.value.toUpperCase())} /></label>
        <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Un momento…' : 'Empezar prueba'}</button>
      </form>
      {msg && <p role="status" className="text-sm text-red-700">{msg}</p>}
    </main>
  )
}
