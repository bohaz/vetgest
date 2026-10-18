import { NavLink, Outlet } from 'react-router-dom'
import { Page, PageHeader } from '@/shared/ui'

const tab = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold no-underline ${isActive ? 'bg-brand-strong text-white' : 'border border-line-strong bg-white text-ink/80 hover:bg-ground'}`

export function AgendaLayout() {
  return (
    <Page>
      <PageHeader title="Agenda" />
      <nav className="flex gap-2" aria-label="Agenda">
        <NavLink end to="/agenda" className={tab}>Citas</NavLink>
        <NavLink to="/agenda/servicios" className={tab}>Servicios de peluquería</NavLink>
      </nav>
      <Outlet />
    </Page>
  )
}
