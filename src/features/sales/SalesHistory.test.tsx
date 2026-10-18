// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { SalesHistory } from './SalesHistory'
import type { Sale } from '@/core/entities'

const sale = (o: Partial<Sale> = {}): Sale => ({ id: 's1', tenant_id: 't', client_id: 'c1', total_usd: 24, rate_bs: 36.5, pay_method: 'pago_movil', created_at: new Date(2026, 9, 16, 20, 51).toISOString(), ...o })
const clients = [{ id: 'c1', tenant_id: 't', full_name: 'Ana Pérez' }]

describe('SalesHistory', () => {
  it('muestra cliente, método y montos por separado', () => {
    render(<SalesHistory sales={[sale()]} clients={clients} onVoid={vi.fn()} />)
    expect(screen.getByText('Ana Pérez · Pago Móvil')).toBeTruthy()
    expect(screen.getByText('USD 24,00')).toBeTruthy()
    expect(screen.getByText('Bs 876,00')).toBeTruthy()
  })
  it('pide motivo para anular y lo envía', () => {
    const onVoid = vi.fn()
    render(<SalesHistory sales={[sale({ client_id: undefined })]} clients={clients} onVoid={onVoid} />)
    expect(screen.getByText('Venta de mostrador · Pago Móvil')).toBeTruthy()
    fireEvent.click(screen.getByText('Anular venta'))
    const confirm = screen.getByText('Confirmar anulación') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo de la anulación'), { target: { value: ' Devolución ' } })
    fireEvent.click(confirm)
    expect(onVoid).toHaveBeenCalledWith('s1', 'Devolución')
  })
  it('marca las ventas anuladas y no ofrece anularlas otra vez', () => {
    render(<SalesHistory sales={[sale({ voided_at: '2026-10-16T21:00:00Z', void_reason: 'Error de cobro' })]} clients={clients} onVoid={vi.fn()} />)
    expect(screen.getByText('Anulada')).toBeTruthy(); expect(screen.getByText(/Error de cobro/)).toBeTruthy()
    expect(screen.queryByText('Anular venta')).toBeNull()
  })
})
