import {
  appointmentsOfDay, canTransition, controlReason, daySummary, dueControl, findConflict, followUpOf, missedFollowUps, nextStatuses, reminderText, remindersFor,
} from './agenda'
import { dayLabel, localDateStr, shiftDay, toStartsAt } from './dates'
import { whatsappLink } from './whatsapp'
import type { Appointment, Consultation, GroomingService } from './entities'

const appt = (o: Partial<Appointment> = {}): Appointment =>
  ({ id: 'a', tenant_id: 't', kind: 'peluqueria', patient_id: 'p', starts_at: toStartsAt('2026-10-05', '10:00'), status: 'pendiente', size: 'mediano', ...o })
const control = (o: Partial<Appointment> = {}) => appt({ kind: 'consulta', size: undefined, ...o })
const consult = (o: Partial<Consultation> = {}): Consultation => ({ id: 'c', tenant_id: 't', patient_id: 'p', visit_date: toStartsAt('2026-10-05', '10:00'), ...o })
const svc: GroomingService = { id: 's1', tenant_id: 't', name: 'Baño', price_small: 20, price_medium: 30, price_large: 45, duration_min: 60 }

describe('estados', () => {
  it('la peluquería se inicia y se cobra; también puede marcarse «no vino»', () => {
    expect(nextStatuses('peluqueria', 'pendiente')).toEqual(['en_proceso', 'no_asistio', 'cancelada'])
    expect(canTransition('peluqueria', 'en_proceso', 'completada')).toBe(true)
    expect(canTransition('peluqueria', 'pendiente', 'completada')).toBe(false)
  })
  it('un control se completa directo al atenderlo', () => {
    expect(nextStatuses('consulta', 'pendiente')).toEqual(['completada', 'no_asistio', 'cancelada'])
  })
  it('completadas, canceladas y «no vino» no tienen más pasos', () => {
    for (const k of ['consulta', 'peluqueria'] as const) for (const s of ['completada', 'cancelada', 'no_asistio'] as const) expect(nextStatuses(k, s)).toEqual([])
  })
})

describe('fechas', () => {
  it('formatea y desplaza fechas locales, incluso entre meses y años', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01'); expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('nombra hoy y mañana', () => {
    expect(dayLabel('2026-10-18', '2026-10-18')).toBe('Hoy'); expect(dayLabel('2026-10-19', '2026-10-18')).toBe('Mañana')
    expect(dayLabel('2026-10-20', '2026-10-18')).toMatch(/martes.*20.*octubre/)
  })
})

describe('agenda del día', () => {
  it('filtra por día y tipo, y ordena por hora', () => {
    const list = [appt({ id: 'b', starts_at: toStartsAt('2026-10-05', '15:00') }), appt({ id: 'x', starts_at: toStartsAt('2026-10-06', '09:00') }), appt({ id: 'a' }),
      control({ id: 'c', starts_at: toStartsAt('2026-10-05', '08:00') })]
    expect(appointmentsOfDay(list, '2026-10-05').map(a => a.id)).toEqual(['c', 'a', 'b'])
    expect(appointmentsOfDay(list, '2026-10-05', 'consulta').map(a => a.id)).toEqual(['c'])
  })
  it('resume citas activas y lo cobrado en peluquería, ignorando canceladas', () => {
    const s = daySummary([appt({ status: 'completada', paid_usd: 30.5 }), appt({ status: 'completada', paid_usd: 20 }), appt({ status: 'pendiente' }),
      appt({ status: 'cancelada', paid_usd: 99 }), control(), control({ status: 'no_asistio' })])
    expect(s).toEqual({ total: 5, pending: 2, incomeUsd: 50.5 })
  })
})

describe('conflictos de horario', () => {
  const existing = [appt({ service_id: 's1' })] // 10:00–11:00
  const at = (t: string, kind: Appointment['kind'] = 'peluqueria') => ({ kind, starts_at: toStartsAt('2026-10-05', t), duration_min: 60 })
  it('detecta solapamientos del mismo tipo', () => { expect(findConflict(existing, [svc], at('10:30'))).toBeDefined() })
  it('un control no choca con la peluquería', () => { expect(findConflict(existing, [svc], at('10:30', 'consulta'))).toBeUndefined() })
  it('dos controles chocan dentro de sus 30 minutos', () => {
    const c = [control({ starts_at: toStartsAt('2026-10-05', '09:00') })]
    expect(findConflict(c, [], { kind: 'consulta', starts_at: toStartsAt('2026-10-05', '09:15'), duration_min: 30 })).toBeDefined()
    expect(findConflict(c, [], { kind: 'consulta', starts_at: toStartsAt('2026-10-05', '09:30'), duration_min: 30 })).toBeUndefined()
  })
  it('permite citas contiguas e ignora las cerradas', () => {
    expect(findConflict(existing, [svc], at('11:00'))).toBeUndefined(); expect(findConflict(existing, [svc], at('09:00'))).toBeUndefined()
    expect(findConflict([appt({ status: 'cancelada', service_id: 's1' }), appt({ status: 'no_asistio', service_id: 's1' })], [svc], at('10:00'))).toBeUndefined()
  })
})

describe('seguimiento', () => {
  it('recuerda solo las citas pendientes del día', () => {
    const list = [control({ id: 'r' }), appt({ id: 'hecha', status: 'completada' }), control({ id: 'otro-dia', starts_at: toStartsAt('2026-10-06', '10:00') })]
    expect(remindersFor(list, '2026-10-05').map(a => a.id)).toEqual(['r'])
  })
  it('lista los controles perdidos que nadie reagendó en los últimos 30 días', () => {
    const now = new Date(2026, 9, 18)
    const missed = control({ id: 'm', status: 'no_asistio', starts_at: toStartsAt('2026-10-10', '09:00') })
    const old = control({ id: 'viejo', patient_id: 'p2', status: 'no_asistio', starts_at: toStartsAt('2026-09-01', '09:00') })
    expect(missedFollowUps([missed, old], [], now).map(a => a.id)).toEqual(['m'])
    expect(missedFollowUps([missed, control({ id: 'nuevo', starts_at: toStartsAt('2026-10-20', '09:00') })], [], now)).toEqual([])
    expect(missedFollowUps([missed], [consult({ visit_date: toStartsAt('2026-10-12', '09:00') })], now)).toEqual([])
    // Una cita de peluquería posterior no cuenta como control reagendado.
    expect(missedFollowUps([missed, appt({ starts_at: toStartsAt('2026-10-15', '09:00') })], [], now)).toHaveLength(1)
  })
  it('encuentra el control vigente de una consulta y el control que toca atender', () => {
    const list = [control({ id: 'v1', follow_up_of: 'c1', status: 'cancelada' }), control({ id: 'v2', follow_up_of: 'c1', starts_at: toStartsAt('2026-10-12', '09:00') })]
    expect(followUpOf('c1', list)?.id).toBe('v2'); expect(followUpOf('c9', list)).toBeUndefined()
    expect(dueControl('p', list, '2026-10-11')).toBeUndefined(); expect(dueControl('p', list, '2026-10-12')?.id).toBe('v2')
  })
  it('arma el motivo del control sin repetir «Control:»', () => {
    expect(controlReason('Otitis')).toBe('Control: Otitis'); expect(controlReason('Control: Otitis')).toBe('Control: Otitis'); expect(controlReason()).toBe('Control')
  })
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
  it('redacta el mensaje según el tipo de cita', () => {
    const iso = toStartsAt('2026-10-19', '10:00')
    expect(reminderText({ kind: 'consulta', pet: 'Rocky', owner: 'Ana Pérez', clinic: 'Vet San Rafael', starts_at: iso }))
      .toMatch(/^Hola Ana, te recordamos el control de Rocky en Vet San Rafael el lunes, 19 de octubre a las 10:00.*reagendar\.$/)
    expect(reminderText({ kind: 'peluqueria', pet: 'Luna', service: 'Baño', starts_at: iso })).toMatch(/^Hola, te recordamos la cita de peluquería de Luna \(Baño\) el /)
  })
})
