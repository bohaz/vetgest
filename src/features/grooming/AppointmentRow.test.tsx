// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { AppointmentRow } from './AppointmentRow'
import type { GroomingAppointment } from '@/core/entities'

const base: GroomingAppointment = { id: 'a1', tenant_id: 't', patient_id: 'p', service_id: 's', starts_at: new Date(2026, 9, 5, 10, 0).toISOString(), status: 'pendiente', size: 'grande', price_usd: 45 }
const setup = (appt: Partial<GroomingAppointment> = {}, href: string | null = null) => {
  const onStatus = vi.fn(); const onComplete = vi.fn()
  render(<AppointmentRow appt={{ ...base, ...appt }} patient="Rocky" owner="Ana" service="Baño y corte" reminderHref={href} onStatus={onStatus} onComplete={onComplete} />)
  return { onStatus, onComplete }
}

describe('AppointmentRow', () => {
  it('muestra los datos de la cita y su precio', () => {
    setup()
    expect(screen.getByText(/Rocky/)).toBeTruthy(); expect(screen.getByText(/Baño y corte · Grande · USD 45,00/)).toBeTruthy(); expect(screen.getByText('Pendiente')).toBeTruthy()
  })
  it('una cita pendiente se puede iniciar, cancelar y recordar', () => {
    const { onStatus } = setup({}, 'https://wa.me/58412?text=Hola')
    fireEvent.click(screen.getByText('Iniciar')); fireEvent.click(screen.getByText('Cancelar cita'))
    expect(onStatus).toHaveBeenNthCalledWith(1, 'en_proceso'); expect(onStatus).toHaveBeenNthCalledWith(2, 'cancelada')
    expect(screen.getByText('Recordar por WhatsApp').getAttribute('href')).toBe('https://wa.me/58412?text=Hola')
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
})
