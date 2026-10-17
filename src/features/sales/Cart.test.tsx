// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { Cart } from './Cart'
import { formatBs } from '@/core/pricing'

const line = { productId: 'p1', name: 'Alimento 20kg', unitPrice: 10, qty: 2, stock: 3 }

describe('Cart', () => {
  it('muestra el carrito vacío con una invitación a actuar', () => {
    render(<Cart lines={[]} rate={null} onQty={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText(/carrito está vacío/i)).toBeTruthy()
  })
  it('muestra totales en USD y Bs', () => {
    render(<Cart lines={[line]} rate={40} onQty={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('Total: USD 20.00')).toBeTruthy(); expect(screen.getByText(formatBs(800))).toBeTruthy()
  })
  it('pide definir la tasa si no existe', () => {
    render(<Cart lines={[line]} rate={null} onQty={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText(/Define la tasa del día/)).toBeTruthy()
  })
  it('llama a onQty al sumar o restar y bloquea "+" en el stock máximo', () => {
    const onQty = vi.fn()
    const { rerender } = render(<Cart lines={[line]} rate={40} onQty={onQty} onRemove={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Agregar una unidad de Alimento 20kg')); fireEvent.click(screen.getByLabelText('Quitar una unidad de Alimento 20kg'))
    expect(onQty).toHaveBeenNthCalledWith(1, 'p1', 3); expect(onQty).toHaveBeenNthCalledWith(2, 'p1', 1)
    rerender(<Cart lines={[{ ...line, qty: 3 }]} rate={40} onQty={onQty} onRemove={vi.fn()} />)
    expect((screen.getByLabelText('Agregar una unidad de Alimento 20kg') as HTMLButtonElement).disabled).toBe(true)
  })
  it('llama a onRemove', () => {
    const onRemove = vi.fn(); render(<Cart lines={[line]} rate={40} onQty={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByText('Quitar')); expect(onRemove).toHaveBeenCalledWith('p1')
  })
})
