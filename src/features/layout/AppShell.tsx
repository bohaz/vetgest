import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '@/infra/supabase/client'
import { Icon, Logo } from '@/shared/icons'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { DemoBanner } from '@/features/demo/DemoBanner'
import { PlanCard } from '@/features/tenant/PlanCard'
import { SubscriptionNotice } from '@/features/tenant/SubscriptionNotice'
import { useTenant } from '@/features/tenant/useTenant'
import { activeMobileItem, MOBILE_NAV, NAV } from './navigation'
import { useFeedbackLink } from './useFeedback'

export const signOut = () => supabase.auth.signOut()

/** Menú lateral (computador). */
function Sidebar() {
  const { tenant, status } = useTenant()
  const feedback = useFeedbackLink()
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline ${isActive ? 'bg-brand-raised font-bold text-white' : 'font-semibold text-on-dark hover:bg-brand-raised/60'}`
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-7 overflow-y-auto bg-brand-strong px-4 py-6 text-white md:flex">
      <div className="flex items-center gap-3 px-2">
        <Logo />
        <div className="flex min-w-0 flex-col">
          <span className="text-xl font-extrabold tracking-tight">VetGest</span>
          <span className="truncate text-xs text-on-dark/80">{tenant?.name ?? ' '}</span>
        </div>
      </div>
      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={item}><Icon name={n.icon} />{n.label}</NavLink>)}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <PlanCard status={status} dark />
        {feedback && <a href={feedback} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-on-dark no-underline hover:bg-brand-raised/60"><Icon name="chat" />Enviar comentarios</a>}
        <button onClick={signOut} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-on-dark hover:bg-brand-raised/60"><Icon name="logout" />Cerrar sesión</button>
      </div>
    </aside>
  )
}

/** Barra superior (celular). */
function TopBar() {
  const { tenant } = useTenant()
  return (
    <header className="flex items-center gap-3 bg-brand-strong px-4 py-3 text-white md:hidden">
      <Logo size={34} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-lg font-extrabold tracking-tight">VetGest</span>
        <span className="truncate text-xs text-on-dark/80">{tenant?.name ?? ' '}</span>
      </div>
    </header>
  )
}

/** Barra inferior (celular). */
function BottomNav() {
  const { pathname } = useLocation()
  const active = activeMobileItem(pathname)
  return (
    <nav aria-label="Secciones (celular)" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      {MOBILE_NAV.map(n => {
        const on = n.to === active
        return (
          <Link key={n.to} to={n.to} aria-current={on ? 'page' : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] no-underline ${on ? 'font-extrabold text-brand' : 'font-semibold text-ink/70'}`}>
            <span className={`flex rounded-full px-4 py-1 ${on ? 'bg-brand-soft' : ''}`}><Icon name={n.icon} size={22} strokeWidth={on ? 2 : 1.8} /></span>
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  const { status } = useTenant()
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <TopBar />
        <div className="sticky top-0 z-10">
          <DemoBanner />
          <SubscriptionNotice status={status} />
          <SyncStatus />
        </div>
        <main className="flex-1"><Outlet /></main>
      </div>
      <BottomNav />
    </div>
  )
}
