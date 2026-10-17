import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '@/infra/supabase/client'

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`

export function AppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl">
      <header className="flex items-center justify-between gap-2 border-b p-3">
        <nav className="flex gap-1">
          <NavLink to="/clientes" className={link}>Clientes</NavLink>
          <NavLink to="/pacientes" className={link}>Pacientes</NavLink>
          <NavLink to="/inventario" className={link}>Inventario</NavLink>
          <NavLink to="/ventas" className={link}>Ventas</NavLink>
          <NavLink to="/peluqueria" className={link}>Peluquería</NavLink>
        </nav>
        <button className="text-sm text-slate-500 underline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </header>
      <Outlet />
    </div>
  )
}
