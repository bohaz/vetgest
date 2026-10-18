import { subscriptionNotice, type SubscriptionStatus } from '@/core/subscription'

const TONES = {
  info: 'bg-teal-50 text-teal-900',
  warning: 'bg-amber-50 text-amber-900',
  danger: 'bg-red-50 text-red-800',
} as const

/** Aviso del periodo de prueba o de la suscripción. No muestra nada si no hay que avisar. */
export function SubscriptionNotice({ status }: { status: SubscriptionStatus | null }) {
  const notice = status && subscriptionNotice(status)
  if (!notice) return null
  return <p role="status" className={`px-4 py-1.5 text-xs ${TONES[notice.tone]}`}>{notice.text}</p>
}
