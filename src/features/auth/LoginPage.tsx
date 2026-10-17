import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'
import { authErrorMessage, MIN_PASSWORD, validateCredentials } from './authMessages'

// El botón de Google solo aparece cuando el proveedor está configurado en Supabase (VITE_GOOGLE_AUTH=true).
const googleEnabled = !isDemo && import.meta.env.VITE_GOOGLE_AUTH === 'true'
type Mode = 'signin' | 'signup'

const COPY: Record<Mode, { title: string; submit: string; switchText: string; switchAction: string }> = {
  signin: { title: 'Entra a VetGest', submit: 'Iniciar sesión', switchText: '¿Es tu primera vez?', switchAction: 'Crea tu cuenta' },
  signup: { title: 'Crea tu cuenta', submit: 'Crear cuenta', switchText: '¿Ya tienes cuenta?', switchAction: 'Inicia sesión' },
}

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : ''); const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : '')
  const [confirm, setConfirm] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const copy = COPY[mode]

  const switchMode = () => {
    const next = mode === 'signin' ? 'signup' : 'signin'
    setMode(next); setMsg(''); setConfirm('')
    // En la demo, la cuenta de ejemplo solo tiene sentido para entrar; para registrarse se parte en blanco.
    if (isDemo) { setEmail(next === 'signin' ? DEMO_EMAIL : ''); setPassword(next === 'signin' ? DEMO_PASSWORD : '') }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validateCredentials(email, password, mode) ?? (mode === 'signup' && password !== confirm ? 'Las contraseñas no coinciden.' : null)
    if (invalid) { setMsg(invalid); return }
    setBusy(true); setMsg(isDemo && mode === 'signin' ? 'Preparando la demostración…' : '')
    const creds = { email: email.trim(), password }
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(creds)
      if (error) setMsg(authErrorMessage(error))
    } else {
      const { data, error } = await supabase.auth.signUp(creds)
      // Con la confirmación de correo desactivada, Supabase entrega la sesión al instante y la app pasa a «Registra tu negocio».
      if (error) setMsg(authErrorMessage(error))
      else if (!data.session) setMsg('Cuenta creada. Revisa tu correo y abre el enlace para confirmarla; luego inicia sesión.')
    }
    setBusy(false)
  }
  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">{copy.title}</h1>
      {mode === 'signup' && <p className="text-slate-600">Usa el correo de la clínica. Después registras tu negocio y empiezas 7 días de prueba.</p>}
      {isDemo && mode === 'signin' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <b>Demostración.</b> Los datos son de ejemplo y se guardan solo en este navegador. Entra con la cuenta ya escrita
          ({DEMO_EMAIL} / {DEMO_PASSWORD}) o crea una cuenta nueva para probar el registro de un negocio.
        </p>)}
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Correo
          <input className={input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Contraseña{mode === 'signup' ? ` (mínimo ${MIN_PASSWORD} caracteres)` : ''}
          <input className={input} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {mode === 'signup' && (
          <label className="flex flex-col gap-1 text-sm text-slate-700">Repite la contraseña
            <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>)}
        <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Un momento…' : copy.submit}</button>
      </form>
      {googleEnabled && mode === 'signin' && <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={google}>Continuar con Google</button>}
      {msg && <p role="status" className="text-sm text-slate-700">{msg}</p>}
      <p className="mt-2 border-t pt-4 text-center text-sm text-slate-600">
        {copy.switchText} <button type="button" className="font-medium text-teal-700 underline" onClick={switchMode}>{copy.switchAction}</button>
      </p>
    </main>
  )
}
