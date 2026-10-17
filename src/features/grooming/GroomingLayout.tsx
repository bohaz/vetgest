import { NavLink, Outlet } from 'react-router-dom'

const sub = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-slate-200 font-medium' : 'text-slate-600 hover:bg-slate-100'}`

export function GroomingLayout() {
  return (
    <div>
      <nav className="flex gap-1 px-4 pt-3" aria-label="Peluquería">
        <NavLink end to="/peluqueria" className={sub}>Agenda</NavLink>
        <NavLink to="/peluqueria/servicios" className={sub}>Servicios</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
