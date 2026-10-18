// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppointmentRow } from './AppointmentRow'
import type { Appointment } from '@/core/entities'

const base: Appointment = { id: 'a1', tenant_id: 't', kind: 'peluqueria', patient_id: 'p', service_id: 's', starts_at: new Date(2026, 9, 5, 10, 0).toISOString(), status: 'pendiente', size: 'grande', price_usd: 45 }
const setup = (appt: Partial<Appointment> = {}, href: string | null = null, extra: { onReschedule?: () => void } = {}) => {
  const onStatus = vi.fn(); const onComplete = vi.fn(); const onReminded = vi.fn()
  render(<MemoryRouter><AppointmentRow appt={{ ...base, ...appt }} patient="Rocky" owner="Ana" service="Baño y corte" reminderHref={href} onReminded={onReminded}
    attendTo="/pacientes/p?atender=a1" onStatus={onStatus} onComplete={onComplete} {...extra} /></MemoryRouter>)
  return { onStatus, onComplete, onReminded }
}
const control: Partial<Appointment> = { kind: 'consulta', service_id: undefined, size: undefined, price_usd: undefined, notes: 'Control: Otitis' }

describe('AppointmentRow', () => {
  it('muestra los datos de la cita y su precio', () => {
    setup()
    expect(screen.getByText(/Rocky/)).toBeTruthy(); expect(screen.getByText(/Baño y corte · Grande · USD 45,00/)).toBeTruthy(); expect(screen.getByText('Pendiente')).toBeTruthy()
  })
  it('una cita pendiente se puede iniciar, marcar «no vino», cancelar y recordar', () => {
    const { onStatus, onReminded } = setup({}, 'https://wa.me/58412?text=Hola')
    fireEvent.click(screen.getByText('Iniciar')); fireEvent.click(screen.getByText('No vino')); fireEvent.click(screen.getByText('Cancelar cita'))
    expect(onStatus.mock.calls.map(c => c[0])).toEqual(['en_proceso', 'no_asistio', 'cancelada'])
    const remind = screen.getByText('Recordar por WhatsApp')
    expect(remind.getAttribute('href')).toBe('https://wa.me/58412?text=Hola')
    fireEvent.click(remind); expect(onReminded).toHaveBeenCalled()
    expect(screen.queryByText('Completar')).toBeNull()
  })
  it('al completar propone el precio y envía monto y método de pago', () => {
    const { onComplete } = setup({ status: 'en_proceso' })
    fireEvent.click(screen.getByText('Completar'))
    const amount = screen.getByLabelText('Monto cobrado (USD)') as HTMLInputElement
    expect(amount.value).toBe('45')
    fireEvent.change(amount, { target: { value: '40' } }); fireEvent.change(screen.getByLabelText('Método de pago'), { target: { value: 'pago_movil' } })
    fireEvent.click(screen.getByText('Confirmar cobro'))
    expect(onComplete).toHaveBeenCalledWith({ paid_usd: 40, pay_method: 'pago_movil' })
  })
  it('una cita completada muestra el cobro y no ofrece acciones', () => {
    setup({ status: 'completada', paid_usd: 40, pay_method: 'pago_movil' })
    expect(screen.getByText('Cobrado USD 40,00 · Pago Móvil')).toBeTruthy()
    expect(screen.queryByText('Iniciar')).toBeNull(); expect(screen.queryByText('Cancelar cita')).toBeNull()
  })

  it('un control muestra su motivo y se atiende desde la ficha del paciente', () => {
    setup(control)
    expect(screen.getByText(/Control: Otitis/)).toBeTruthy()
    expect(screen.getByText('Atender').closest('a')?.getAttribute('href')).toBe('/pacientes/p?atender=a1')
    expect(screen.queryByText('Iniciar')).toBeNull(); expect(screen.queryByText('Completar')).toBeNull()
  })
  it('marca los recordatorios ya enviados', () => {
    setup({ ...control, reminded_at: new Date().toISOString() }, 'https://wa.me/58412?text=Hola')
    expect(screen.getByText('Recordado')).toBeTruthy(); expect(screen.getByText('Recordar de nuevo')).toBeTruthy()
  })
  it('un control al que no vino se puede reagendar', () => {
    const onReschedule = vi.fn()
    setup({ ...control, status: 'no_asistio' }, null, { onReschedule })
    expect(screen.getByText('No vino')).toBeTruthy(); expect(screen.queryByText('Atender')).toBeNull()
    fireEvent.click(screen.getByText('Reagendar')); expect(onReschedule).toHaveBeenCalled()
  })
})
