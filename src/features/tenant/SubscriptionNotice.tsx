import { subscriptionNotice, type SubscriptionStatus } from '@/core/subscription'

const TONES = {
  info: 'bg-brand-soft text-brand-ink',
  warning: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
} as const

/** Franja de aviso cuando el plan está por vencer o venció (el estado normal se ve en el menú). */
export function SubscriptionNotice({ status }: { status: SubscriptionStatus | null }) {
  const notice = status && subscriptionNotice(status)
  if (!notice || notice.tone === 'info') return null
  return <p role="status" className={`px-4 py-2 text-sm font-medium ${TONES[notice.tone]}`}>{notice.text}</p>
}
