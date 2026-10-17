import { useState } from 'react'
import { isDemo, supabase } from '@/infra/supabase/client'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/features/demo/demoCredentials'

export function LoginPage() {
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : ''); const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : ''); const [msg, setMsg] = useState('')
  const signIn = async () => {
    setMsg(isDemo ? 'Preparando la demostración…' : '')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg('Correo o contraseña incorrectos.')
  }
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error ? error.message : isDemo ? '' : 'Cuenta creada. Revisa tu correo para confirmarla.')
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
      <input className={input} type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="rounded-lg bg-teal-700 px-3 py-2 text-white" onClick={signIn}>Iniciar sesión</button>
      {!isDemo && <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={google}>Continuar con Google</button>}
      <button className="text-sm text-teal-700 underline" onClick={signUp}>Crear cuenta nueva</button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </main>
  )
}
