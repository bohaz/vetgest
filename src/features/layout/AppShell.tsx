import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '@/infra/supabase/client'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { DemoBanner } from '@/features/demo/DemoBanner'

export const NAV = [
  { to: '/clientes', label: 'Clientes' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/peluqueria', label: 'Peluquería' },
]

// En celular las cinco secciones ocupan una fila de columnas iguales; desde `sm` vuelven a ser pestañas.
const link = ({ isActive }: { isActive: boolean }) =>
  `min-w-0 truncate rounded-lg px-1 py-2 text-center text-xs font-medium sm:px-3 sm:text-sm ${isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`

export function AppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl">
      <header className="sticky top-0 z-10 border-b bg-white">
        <DemoBanner />
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-semibold text-teal-800">VetGest</span>
          <button className="text-sm text-slate-500 underline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
        <nav aria-label="Secciones" className="grid grid-cols-5 gap-1 p-2 sm:flex sm:px-3">
          {NAV.map(n => <NavLink key={n.to} to={n.to} className={link}>{n.label}</NavLink>)}
        </nav>
        <SyncStatus />
      </header>
      <Outlet />
    </div>
  )
}
