import { useState } from 'react'
import { supabase } from '@/infra/supabase/client'
import { useAuth } from './AuthProvider'
import { authErrorMessage, MIN_PASSWORD, validateNewPassword } from './authMessages'
import { AuthLayout, authInput as input, authLabel, authPrimary } from './AuthLayout'

/** Se muestra al volver desde el enlace de recuperación: pide la contraseña nueva. */
export function ResetPasswordPage() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateNewPassword(password, confirm)
    if (invalid) { setMsg(invalid); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setMsg(authErrorMessage(error))
    else finishRecovery()
  }
  return (
    <AuthLayout title="Crea una contraseña nueva">
      <p className="text-muted">Después entrarás directo a tu clínica.</p>
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className={authLabel}>Contraseña nueva (mínimo {MIN_PASSWORD} caracteres)
          <input className={input} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className={authLabel}>Repite la contraseña
          <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <button className={authPrimary} disabled={busy}>{busy ? 'Un momento…' : 'Guardar contraseña'}</button>
      </form>
      {msg && <p role="status" className="text-sm text-danger-ink">{msg}</p>}
    </AuthLayout>
  )
}
