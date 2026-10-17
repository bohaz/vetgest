import { appointmentsOfDay, canTransition, daySummary, findConflict, localDateStr, nextStatuses, priceFor, reminderText, shiftDay, toStartsAt, whatsappLink } from './grooming'
import type { GroomingAppointment, GroomingService } from './entities'

const appt = (o: Partial<GroomingAppointment> = {}): GroomingAppointment => ({ id: 'a', tenant_id: 't', patient_id: 'p', starts_at: toStartsAt('2026-10-05', '10:00'), status: 'pendiente', size: 'mediano', ...o })
const svc: GroomingService = { id: 's1', tenant_id: 't', name: 'Baño', price_small: 20, price_medium: 30, price_large: 45, duration_min: 60 }

describe('precios y estados', () => {
  it('elige el precio según el tamaño', () => { expect([priceFor(svc, 'pequeno'), priceFor(svc, 'mediano'), priceFor(svc, 'grande')]).toEqual([20, 30, 45]) })
  it('solo permite transiciones válidas', () => {
    expect(nextStatuses('pendiente')).toEqual(['en_proceso', 'cancelada'])
    expect(canTransition('en_proceso', 'completada')).toBe(true)
    expect(canTransition('pendiente', 'completada')).toBe(false)
    expect(nextStatuses('completada')).toEqual([]); expect(nextStatuses('cancelada')).toEqual([])
  })
})

describe('agenda del día', () => {
  it('formatea y desplaza fechas locales, incluso entre meses y años', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01'); expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('filtra por día y ordena por hora', () => {
    const list = [appt({ id: 'b', starts_at: toStartsAt('2026-10-05', '15:00') }), appt({ id: 'x', starts_at: toStartsAt('2026-10-06', '09:00') }), appt({ id: 'a' })]
    expect(appointmentsOfDay(list, '2026-10-05').map(a => a.id)).toEqual(['a', 'b'])
  })
  it('resume citas activas y lo cobrado, ignorando canceladas', () => {
    const s = daySummary([appt({ status: 'completada', paid_usd: 30.5 }), appt({ status: 'completada', paid_usd: 20 }), appt({ status: 'pendiente' }), appt({ status: 'cancelada', paid_usd: 99 })])
    expect(s).toEqual({ total: 3, pending: 1, incomeUsd: 50.5 })
  })
})

describe('conflictos de horario', () => {
  const existing = [appt({ service_id: 's1' })] // 10:00–11:00
  const at = (t: string) => ({ starts_at: toStartsAt('2026-10-05', t), duration_min: 60 })
  it('detecta solapamientos', () => { expect(findConflict(existing, [svc], at('10:30'))).toBeDefined() })
  it('permite citas contiguas', () => { expect(findConflict(existing, [svc], at('11:00'))).toBeUndefined(); expect(findConflict(existing, [svc], at('09:00'))).toBeUndefined() })
  it('ignora citas canceladas', () => { expect(findConflict([appt({ status: 'cancelada', service_id: 's1' })], [svc], at('10:00'))).toBeUndefined() })
})

describe('recordatorio por WhatsApp', () => {
  it('normaliza números venezolanos', () => {
    expect(whatsappLink('0412-555 1234', 'Hola')).toBe('https://wa.me/584125551234?text=Hola')
    expect(whatsappLink('+58 412 5551234', 'Hola')).toBe('https://wa.me/584125551234?text=Hola')
    expect(whatsappLink('4125551234', 'Hola')).toBe('https://wa.me/584125551234?text=Hola')
  })
  it('devuelve null sin teléfono y codifica el texto', () => {
    expect(whatsappLink(undefined, 'Hola')).toBeNull(); expect(whatsappLink('abc', 'Hola')).toBeNull()
    expect(whatsappLink('04125551234', 'a b&c')).toContain('a%20b%26c')
  })
  it('incluye mascota y servicio en el mensaje', () => { expect(reminderText('Rocky', 'Baño', appt().starts_at)).toMatch(/Rocky.*Baño/) })
})
