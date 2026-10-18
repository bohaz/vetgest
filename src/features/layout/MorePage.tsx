import { Link } from 'react-router-dom'
import { Icon, type IconName } from '@/shared/icons'
import { Card, Page, PageHeader } from '@/shared/ui'
import { PlanCard } from '@/features/tenant/PlanCard'
import { useTenant } from '@/features/tenant/useTenant'
import { signOut } from './AppShell'
import { useFeedbackLink } from './useFeedback'

function Row({ icon, label, detail, to, href, onClick }: { icon: IconName; label: string; detail?: string; to?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon name={icon} /></span>
      <span className="flex min-w-0 flex-1 flex-col"><span className="font-bold text-ink">{label}</span>{detail && <span className="text-sm text-muted">{detail}</span>}</span>
      <Icon name="chevronRight" className="text-muted" />
    </>
  )
  const cls = 'flex min-h-16 w-full items-center gap-3 px-1 py-2 text-left no-underline'
  if (to) return <li><Link to={to} className={cls}>{body}</Link></li>
  if (href) return <li><a href={href} target="_blank" rel="noreferrer" className={cls}>{body}</a></li>
  return <li><button onClick={onClick} className={cls}>{body}</button></li>
}

/** «Más» en celular: secciones de uso menos frecuente, plan, comentarios y salir. */
export function MorePage() {
  const { status } = useTenant()
  const feedback = useFeedbackLink()
  return (
    <Page>
      <PageHeader title="Más" />
      <Card>
        <ul className="divide-y divide-line">
          <Row icon="users" label="Clientes" detail="Dueños y sus datos de contacto" to="/clientes" />
          <Row icon="box" label="Inventario" detail="Productos, precios y stock" to="/inventario" />
          <Row icon="scissors" label="Servicios de peluquería" detail="Precios por tamaño" to="/peluqueria/servicios" />
        </ul>
      </Card>
      <PlanCard status={status} />
      <Card>
        <ul className="divide-y divide-line">
          {feedback && <Row icon="chat" label="Enviar comentarios" detail="Cuéntanos qué falta o qué mejorar" href={feedback} />}
          <Row icon="logout" label="Cerrar sesión" onClick={signOut} />
        </ul>
      </Card>
    </Page>
  )
}
