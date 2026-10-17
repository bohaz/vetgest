import { useState } from 'react'
import { useAuth } from './AuthProvider'

export function OnboardingPage() {
  const { createBusiness } = useAuth(); const [name, setName] = useState('')
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Registra tu negocio</h1>
      <p className="text-slate-600">Tienes 7 días de prueba, sin pagar nada.</p>
      <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre de la veterinaria" value={name} onChange={e => setName(e.target.value)} />
      <button className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50" disabled={!name.trim()} onClick={() => createBusiness(name.trim())}>Empezar prueba</button>
    </main>
  )
}
