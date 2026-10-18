import { useState } from 'react'
import { supabase } from '@/infra/supabase/client'
import { useAuth } from './AuthProvider'
import { authErrorMessage, MIN_PASSWORD, validateNewPassword } from './authMessages'

/** Se muestra al volver desde el enlace de recuperación: pide la contraseña nueva. */
export function ResetPasswordPage() {
  const { finishRecovery } = useAuth()
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Crea una contraseña nueva</h1>
      <p className="text-slate-600">Después entrarás directo a tu clínica.</p>
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Contraseña nueva (mínimo {MIN_PASSWORD} caracteres)
          <input className={input} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Repite la contraseña
          <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Un momento…' : 'Guardar contraseña'}</button>
      </form>
      {msg && <p role="status" className="text-sm text-red-700">{msg}</p>}
    </main>
  )
}
