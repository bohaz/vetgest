import { NavLink, Outlet } from 'react-router-dom'
import { Page, PageHeader } from '@/shared/ui'

const tab = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold no-underline ${isActive ? 'bg-brand-strong text-white' : 'border border-line-strong bg-white text-ink/80 hover:bg-ground'}`

export function GroomingLayout() {
  return (
    <Page>
      <PageHeader title="Peluquería" />
      <nav className="flex gap-2" aria-label="Peluquería">
        <NavLink end to="/peluqueria" className={tab}>Agenda</NavLink>
        <NavLink to="/peluqueria/servicios" className={tab}>Servicios</NavLink>
      </nav>
      <Outlet />
    </Page>
  )
}
