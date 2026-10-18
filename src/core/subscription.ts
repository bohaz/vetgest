// Estado de la suscripción de un negocio: misma regla que tenant_active() en la base de datos.
export type SubscriptionState = 'trial' | 'active' | 'expired'
export interface SubscriptionStatus { state: SubscriptionState; daysLeft: number; until: Date }

const DAY = 24 * 60 * 60 * 1000

export function subscriptionStatus(t: { trial_ends_at: string; subscription_until?: string | null }, now = new Date()): SubscriptionStatus {
  const trial = new Date(t.trial_ends_at)
  const paid = t.subscription_until ? new Date(t.subscription_until) : null
  const paying = paid !== null && paid > trial
  const until = paying ? paid : trial
  const daysLeft = Math.max(0, Math.ceil((until.getTime() - now.getTime()) / DAY))
  const state: SubscriptionState = until <= now ? 'expired' : paying ? 'active' : 'trial'
  return { state, daysLeft, until }
}

/** Texto corto para el aviso de la app; null cuando no hace falta avisar. */
export function subscriptionNotice(s: SubscriptionStatus): { tone: 'info' | 'warning' | 'danger'; text: string } | null {
  if (s.state === 'expired') return { tone: 'danger', text: 'Tu periodo terminó. Puedes ver tus datos, pero no guardar cambios hasta renovar.' }
  if (s.state === 'trial') return { tone: s.daysLeft <= 3 ? 'warning' : 'info', text: s.daysLeft === 1 ? 'Te queda 1 día de prueba' : `Te quedan ${s.daysLeft} días de prueba` }
  if (s.daysLeft <= 5) return { tone: 'warning', text: s.daysLeft === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${s.daysLeft} días` }
  return null
}
