import { clientPurchases, collectedOn, greeting, latestConsultations, longDate, lowStockProducts, nextAppointment, patientTimeline } from './dashboard'
import { feedbackLink } from './feedback'
import type { Consultation, GroomingAppointment, Product, Sale } from './entities'

const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).toISOString()
const sale = (o: Partial<Sale>): Sale => ({ id: 's', tenant_id: 't', total_usd: 10, created_at: at('2026-10-17'), ...o })
const appt = (o: Partial<GroomingAppointment>): GroomingAppointment => ({ id: 'a', tenant_id: 't', patient_id: 'p1', starts_at: at('2026-10-17'), status: 'pendiente', size: 'mediano', ...o })
const prod = (o: Partial<Product>): Product => ({ id: 'x', tenant_id: 't', name: 'X', category: 'farmaco', price_usd: 1, stock: 10, min_stock: 2, ...o })

describe('panel de inicio', () => {
  it('saluda según la hora y escribe la fecha larga', () => {
    expect(greeting(new Date(2026, 9, 17, 9))).toBe('Buenos días')
    expect(greeting(new Date(2026, 9, 17, 15))).toBe('Buenas tardes')
    expect(greeting(new Date(2026, 9, 17, 21))).toBe('Buenas noches')
    expect(longDate(new Date(2026, 9, 17))).toMatch(/^Sábado 17 de octubre$/)
  })
  it('suma lo cobrado del día: ventas no anuladas y peluquería completada ese día', () => {
    const sales = [sale({ total_usd: 24 }), sale({ total_usd: 9.9, voided_at: at('2026-10-17', 12) }), sale({ total_usd: 50, created_at: at('2026-10-16') })]
    const appts = [appt({ status: 'completada', paid_usd: 15, completed_at: at('2026-10-17', 9) }), appt({ status: 'en_proceso', price_usd: 30 }),
      appt({ status: 'completada', paid_usd: 20, completed_at: at('2026-10-16') })]
    expect(collectedOn('2026-10-17', sales, appts)).toEqual({ usd: 39, salesCount: 1 })
  })
  it('ordena el stock bajo por urgencia', () => {
    const list = lowStockProducts([prod({ id: 'a', name: 'A', stock: 3, min_stock: 5 }), prod({ id: 'b', name: 'B', stock: 0, min_stock: 5 }), prod({ id: 'c', stock: 9 })])
    expect(list.map(p => p.id)).toEqual(['b', 'a'])
  })
  it('toma las últimas consultas', () => {
    const c = (id: string, d: string): Consultation => ({ id, tenant_id: 't', patient_id: 'p1', visit_date: at(d) })
    expect(latestConsultations([c('1', '2026-09-01'), c('2', '2026-10-15'), c('3', '2026-10-01')], 2).map(x => x.id)).toEqual(['2', '3'])
  })
})

describe('ficha del paciente', () => {
  const services = [{ id: 'sv', tenant_id: 't', name: 'Baño y corte', price_small: 1, price_medium: 2, price_large: 3, duration_min: 60 }]
  it('une consultas y peluquería del paciente, sin canceladas, lo más reciente primero', () => {
    const consultations: Consultation[] = [
      { id: 'c1', tenant_id: 't', patient_id: 'p1', visit_date: at('2026-10-15'), reason: 'Otitis', diagnosis: 'Otitis externa', price_usd: 30 },
      { id: 'c2', tenant_id: 't', patient_id: 'otro', visit_date: at('2026-10-16'), reason: 'No' },
    ]
    const appts = [appt({ id: 'g1', service_id: 'sv', price_usd: 30 }), appt({ id: 'g2', status: 'cancelada' })]
    const t = patientTimeline('p1', consultations, appts, services)
    expect(t.map(i => i.id)).toEqual(['g1', 'c1'])
    expect(t[0]).toMatchObject({ kind: 'peluqueria', title: 'Baño y corte', amountUsd: 30, status: 'pendiente' })
    expect(t[1]).toMatchObject({ kind: 'consulta', title: 'Otitis', lines: ['Diagnóstico: Otitis externa'], amountUsd: 30 })
  })
  it('encuentra la próxima cita activa desde hoy', () => {
    const now = new Date(2026, 9, 17, 8)
    const appts = [appt({ id: 'pasada', starts_at: at('2026-10-10') }), appt({ id: 'luego', starts_at: at('2026-10-20') }),
      appt({ id: 'hoy', starts_at: at('2026-10-17', 11) }), appt({ id: 'hecha', status: 'completada', starts_at: at('2026-10-17', 9) })]
    expect(nextAppointment('p1', appts, now)?.id).toBe('hoy')
    expect(nextAppointment('p2', appts, now)).toBeUndefined()
  })
  it('suma las compras no anuladas del dueño', () => {
    expect(clientPurchases('c1', [sale({ client_id: 'c1', total_usd: 24 }), sale({ client_id: 'c1', total_usd: 5, voided_at: at('2026-10-17') }), sale({ client_id: 'c2' })]))
      .toEqual({ count: 1, usd: 24 })
  })
})

describe('enlace de comentarios', () => {
  it('arma el mensaje con la clínica y la pantalla, y no aparece sin número', () => {
    const url = feedbackLink('+56 9 1234 5678', { clinic: 'Vet San Rafael', screen: 'Ventas' })
    expect(url).toMatch(/^https:\/\/wa\.me\/56912345678\?text=/)
    expect(decodeURIComponent(url!.split('text=')[1])).toBe('Hola, te escribo desde VetGest (Vet San Rafael, pantalla «Ventas»). Mi comentario: ')
    expect(feedbackLink(undefined, {})).toBeNull()
  })
})
