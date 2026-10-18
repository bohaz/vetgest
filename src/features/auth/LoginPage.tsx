import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'
import { authErrorMessage, MIN_PASSWORD, validateCredentials, validateEmail } from './authMessages'
import { recoveryRedirectUrl } from './recovery'
import { AuthLayout, authInput as input, authLabel, authLink as link, authPrimary } from './AuthLayout'

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
  return (
    <AuthLayout title={TITLES[mode]} footer={
      mode === 'signin'
        ? <>¿Es tu primera vez? <button type="button" className={link} onClick={() => switchTo('signup')}>Crea tu cuenta</button></>
        : mode === 'signup'
          ? <>¿Ya tienes cuenta? <button type="button" className={link} onClick={() => switchTo('signin')}>Inicia sesión</button></>
          : <button type="button" className={link} onClick={() => switchTo('signin')}>Volver a iniciar sesión</button>}>
      {mode === 'signup' && <p className="text-muted">Usa el correo de la clínica. Después registras tu negocio y empiezas tu periodo de prueba.</p>}
      {mode === 'recover' && <p className="text-muted">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>}
      {isDemo && mode === 'signin' && (
        <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">
          <b>Demostración.</b> Los datos son de ejemplo y se guardan solo en este navegador. Entra con la cuenta ya escrita
          ({DEMO_EMAIL} / {DEMO_PASSWORD}) o crea una cuenta nueva para probar el registro de un negocio.
        </p>)}
      <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
        <label className={authLabel}>Correo
          <input className={input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {mode !== 'recover' && (
          <label className={authLabel}>Contraseña{mode === 'signup' ? ` (mínimo ${MIN_PASSWORD} caracteres)` : ''}
            <input className={input} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>)}
        {mode === 'signup' && (
          <label className={authLabel}>Repite la contraseña
            <input className={input} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>)}
        {mode === 'signin' && !isDemo && (
          <button type="button" className={`self-end text-sm ${link}`} onClick={() => switchTo('recover')}>¿Olvidaste tu contraseña?</button>)}
        <button className={authPrimary} disabled={busy}>{busy ? 'Un momento…' : SUBMIT[mode]}</button>
      </form>
      {googleEnabled && mode === 'signin' && <button className="min-h-12 rounded-xl border border-line-strong px-4 font-bold" onClick={google}>Continuar con Google</button>}
      {msg && <p role="status" className="text-sm text-ink/80">{msg}</p>}
    </AuthLayout>
  )
}
