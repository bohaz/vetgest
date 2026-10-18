import { subscriptionNotice, subscriptionStatus } from './subscription'

const now = new Date('2026-10-17T12:00:00Z')
const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString()

describe('estado de la suscripción', () => {
  it('en prueba cuenta los días que quedan, redondeando hacia arriba', () => {
    expect(subscriptionStatus({ trial_ends_at: inDays(29.2) }, now)).toMatchObject({ state: 'trial', daysLeft: 30 })
    expect(subscriptionNotice(subscriptionStatus({ trial_ends_at: inDays(29.2) }, now))).toEqual({ tone: 'info', text: 'Te quedan 30 días de prueba' })
    expect(subscriptionNotice(subscriptionStatus({ trial_ends_at: inDays(0.5) }, now))).toEqual({ tone: 'warning', text: 'Te queda 1 día de prueba' })
  })
  it('pagada manda sobre la prueba y solo avisa cerca del vencimiento', () => {
    const s = subscriptionStatus({ trial_ends_at: inDays(2), subscription_until: inDays(30) }, now)
    expect(s).toMatchObject({ state: 'active', daysLeft: 30 })
    expect(subscriptionNotice(s)).toBeNull()
    expect(subscriptionNotice(subscriptionStatus({ trial_ends_at: inDays(-20), subscription_until: inDays(4) }, now))?.tone).toBe('warning')
  })
  it('vencida cuando ya pasaron prueba y pago', () => {
    const s = subscriptionStatus({ trial_ends_at: inDays(-10), subscription_until: inDays(-1) }, now)
    expect(s).toMatchObject({ state: 'expired', daysLeft: 0 })
    expect(subscriptionNotice(s)?.tone).toBe('danger')
  })
})
