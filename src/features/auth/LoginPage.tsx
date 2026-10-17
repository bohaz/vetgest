import { useState } from 'react'
import { supabase } from '@/infra/supabase/client'

export function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [msg, setMsg] = useState('')
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg('Correo o contraseña incorrectos.')
  }
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    setMsg(error ? error.message : 'Cuenta creada. Revisa tu correo para confirmarla.')
  }
  const google = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2'
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Entra a VetGest</h1>
      <input className={input} type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="rounded-lg bg-teal-700 px-3 py-2 text-white" onClick={signIn}>Iniciar sesión</button>
      <button className="rounded-lg border border-slate-300 px-3 py-2" onClick={google}>Continuar con Google</button>
      <button className="text-sm text-teal-700 underline" onClick={signUp}>Crear cuenta nueva</button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </main>
  )
}
