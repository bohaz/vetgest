import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { clearInviteCode, storedInviteCode } from './inviteCode'
import { errorMessage } from '@/core/errors'
import { AuthLayout, authInput as input, authLabel, authPrimary } from './AuthLayout'

export function OnboardingPage() {
  const { createBusiness } = useAuth()
  const [name, setName] = useState(''); const [code, setCode] = useState(storedInviteCode())
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')

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
    <AuthLayout title="Registra tu negocio">
      <p className="text-muted">{code ? 'Con tu código de invitación tendrás un periodo de prueba extendido.' : 'Tienes 7 días de prueba, sin pagar nada.'}</p>
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className={authLabel}>Nombre de la veterinaria
          <input className={input} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className={authLabel}>Código de invitación (opcional)
          <input className={input} value={code} autoCapitalize="characters" onChange={e => setCode(e.target.value.toUpperCase())} /></label>
        <button className={authPrimary} disabled={busy}>{busy ? 'Un momento…' : 'Empezar prueba'}</button>
      </form>
      {msg && <p role="status" className="text-sm text-danger-ink">{msg}</p>}
    </AuthLayout>
  )
}
