import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'
import { authErrorMessage, MIN_PASSWORD, validateCredentials, validateEmail } from './authMessages'
import { recoveryRedirectUrl } from './recovery'

// El botón de Google solo aparece cuando el proveedor está configurado en Supabase (VITE_GOOGLE_AUTH=true).
const googleEnabled = !isDemo && import.meta.env.VITE_GOOGLE_AUTH === 'true'
export type LoginMode = 'signin' | 'signup' | 'recover'

const TITLES: Record<LoginMode, string> = { signin: 'Entra a VetGest', signup: 'Crea tu cuenta', recover: 'Recupera tu contraseña' }
const SUBMIT: Record<LoginMode, string> = { signin: 'Iniciar sesión', signup: 'Crear cuenta', recover: 'Enviar enlace' }

interface Props { initialMode?: LoginMode; notice?: string }

export function LoginPage({ initialMode = 'signin', notice = '' }: Props) {
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : ''); const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : '')
  const [confirm, setConfirm] = useState(''); const [msg, setMsg] = useState(notice); const [busy, setBusy] = useState(false)

  const switchTo = (next: LoginMode) => {
    setMode(next); setMsg(''); setConfirm('')
    // En la demo, la cuenta de ejemplo solo tiene sentido para entrar; para registrarse se parte en blanco.
    if (isDemo) { setEmail(next === 'signin' ? DEMO_EMAIL : ''); setPassword(next === 'signin' ? DEMO_PASSWORD : '') }
  }

  const validate = () => {
    if (mode === 'recover') return validateEmail(email)
    return validateCredentials(email, password, mode) ?? (mode === 'signup' && password !== confirm ? 'Las contraseñas no coinciden.' : null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const invalid = validate()
    if (invalid) { setMsg(invalid); return }
    setBusy(true); setMsg(isDemo && mode === 'signin' ? 'Preparando la demostración…' : '')
    const creds = { email: email.trim(), password }
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword(creds)
      if (error) setMsg(authErrorMessage(error))
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp(creds)
      // Con la confirmación de correo desactivada, Supabase entrega la sesión al instante y la app pasa a «Registra tu negocio».
      if (error) setMsg(authErrorMessage(error))
      else if (!data.session) setMsg('Cuenta creada. Revisa tu correo y abre el enlace para confirmarla; luego inicia sesión.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(creds.email, { redirectTo: recoveryRedirectUrl() })
      // El mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
      setMsg(error && /rate limit|too many/i.test(error.message) ? authErrorMessage(error)
        : 'Si hay una cuenta con ese correo, te llegará un enlace en unos minutos. Revisa también la carpeta de spam.')
    }
    setBusy(false)
  }
  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'
  const link = 'font-medium text-teal-700 underline'
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">{TITLES[mode]}</h1>
      {mode === 'signup' && <p className="text-slate-600">Usa el correo de la clínica. Después registras tu negocio y empiezas tu periodo de prueba.</p>}
      {mode === 'recover' && <p className="text-slate-600">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>}
      {isDemo && mode === 'signin' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <b>Demostración.</b> Los datos son de ejemplo y se guardan solo en este navegador. Entra con la cuenta ya escrita
          ({DEMO_EMAIL} / {DEMO_PASSWORD}) o crea una cuenta nueva para probar el registro de un negocio.
        </p>)}
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className="flex flex-col gap-1 text-sm text-slate-700">Correo
          <input className={input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {mode !== 'recover' && (
          <label className="flex flex-col gap-1 text-sm text-slate-700">Contraseña{mode === 'signup' ? ` (mínimo ${MIN_PASSWORD} caracteres)` : ''}
            <input className={input} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>)}
        {mode === 'signup' && (
          <label className="flex flex-col gap-1 text-sm text-slate-700">Repite la contraseña
            <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>)}
        {mode === 'signin' && !isDemo && (
          <button type="button" className={`self-end text-sm ${link}`} onClick={() => switchTo('recover')}>¿Olvidaste tu contraseña?</button>)}
        <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Un momento…' : SUBMIT[mode]}</button>
      </form>
      {googleEnabled && mode === 'signin' && <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={google}>Continuar con Google</button>}
      {msg && <p role="status" className="text-sm text-slate-700">{msg}</p>}
      <p className="mt-2 border-t pt-4 text-center text-sm text-slate-600">
        {mode === 'signin'
          ? <>¿Es tu primera vez? <button type="button" className={link} onClick={() => switchTo('signup')}>Crea tu cuenta</button></>
          : mode === 'signup'
            ? <>¿Ya tienes cuenta? <button type="button" className={link} onClick={() => switchTo('signin')}>Inicia sesión</button></>
            : <button type="button" className={link} onClick={() => switchTo('signin')}>Volver a iniciar sesión</button>}
      </p>
    </main>
  )
}
