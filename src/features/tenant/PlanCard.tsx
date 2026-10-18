import { subscriptionNotice, type SubscriptionStatus } from '@/core/subscription'

/** Estado del plan para el menú lateral y la pantalla «Más». */
export function PlanCard({ status, dark = false }: { status: SubscriptionStatus | null; dark?: boolean }) {
  if (!status) return null
  const title = status.state === 'active' ? 'Suscripción activa' : status.state === 'trial' ? 'Periodo de prueba' : 'Periodo terminado'
  const text = subscriptionNotice(status)?.text ?? `Activa hasta el ${status.until.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })}`
  return (
    <div className={dark ? 'flex flex-col gap-1 rounded-2xl bg-brand-raised p-3.5' : 'flex flex-col gap-1 rounded-2xl border border-line bg-white p-4'}>
      <span className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-[#9fe3d8]' : 'text-muted'}`}>{title}</span>
      <span className={`text-sm ${dark ? 'text-white' : 'text-ink'}`}>{text}</span>
    </div>
  )
}
