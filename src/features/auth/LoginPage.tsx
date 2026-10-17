import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'
import { authErrorMessage, MIN_PASSWORD, validateCredentials } from './authMessages'

// El botón de Google solo aparece cuando el proveedor está configurado en Supabase (VITE_GOOGLE_AUTH=true).
const googleEnabled = !isDemo && import.meta.env.VITE_GOOGLE_AUTH === 'true'

export function LoginPage() {
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : ''); const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : '')
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)

  const run = async (mode: 'signin' | 'signup') => {
    const invalid = validateCredentials(email, password, mode)
    if (invalid) { setMsg(invalid); return }
    setBusy(true); setMsg(isDemo && mode === 'signin' ? 'Preparando la demostración…' : '')
    const creds = { email: email.trim(), password }
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(creds)
      if (error) setMsg(authErrorMessage(error))
    } else {
      const { data, error } = await supabase.auth.signUp(creds)
      // Con la confirmación de correo desactivada, Supabase entrega la sesión al instante y la app avanza sola.
      if (error) setMsg(authErrorMessage(error))
      else if (!data.session) setMsg('Cuenta creada. Revisa tu correo y abre el enlace para confirmarla.')
    }
    setBusy(false)
  }
  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Entra a VetGest</h1>
      {isDemo && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <b>Demostración.</b> Los datos son de ejemplo y se guardan solo en este navegador. Entra con la cuenta ya escrita
          ({DEMO_EMAIL} / {DEMO_PASSWORD}) o crea una cuenta nueva para probar el registro de un negocio.
        </p>)}
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void run('signin') }}>
        <input className={input} type="email" autoComplete="email" placeholder="Correo" aria-label="Correo" value={email} onChange={e => setEmail(e.target.value)} />
        <input className={input} type="password" autoComplete="current-password" placeholder={`Contraseña (mínimo ${MIN_PASSWORD} caracteres)`} aria-label="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={busy}>Iniciar sesión</button>
      </form>
      {googleEnabled && <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={google}>Continuar con Google</button>}
      <button className="text-sm text-teal-700 underline disabled:opacity-50" disabled={busy} onClick={() => void run('signup')}>¿No tienes cuenta? Créala con este correo y contraseña</button>
      {msg && <p role="status" className="text-sm text-slate-700">{msg}</p>}
    </main>
  )
}
