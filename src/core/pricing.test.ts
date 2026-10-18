import { addToCart, cartTotal, isLowStock, round2, saleErrorMessage, setQty, stockProblems, toBs, formatUsd, type CartLine } from './pricing'
import type { Product } from './entities'

const prod = (o: Partial<Product> = {}): Product => ({ id: 'p1', tenant_id: 't', name: 'Ivermectina', category: 'farmaco', price_usd: 2.5, stock: 5, min_stock: 2, ...o })

describe('carrito', () => {
  it('agrega un producto nuevo y suma si ya existe', () => {
    let c = addToCart([], prod()); c = addToCart(c, prod())
    expect(c).toHaveLength(1); expect(c[0].qty).toBe(2)
  })
  it('no excede el stock disponible', () => {
    let c = addToCart([], prod({ stock: 2 }), 2); c = addToCart(c, prod({ stock: 2 }))
    expect(c[0].qty).toBe(2)
  })
  it('no agrega productos sin stock', () => { expect(addToCart([], prod({ stock: 0 }))).toEqual([]) })
  it('setQty elimina con 0 y limita al stock', () => {
    const c = addToCart([], prod({ stock: 3 }))
    expect(setQty(c, 'p1', 99)[0].qty).toBe(3)
    expect(setQty(c, 'p1', 0)).toEqual([])
  })
  it('calcula totales con redondeo a 2 decimales', () => {
    const lines: CartLine[] = [{ productId: 'a', name: 'A', unitPrice: 0.1, qty: 3, stock: 9 }, { productId: 'b', name: 'B', unitPrice: 1.005, qty: 1, stock: 9 }]
    expect(cartTotal(lines)).toBe(1.31)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
  it('detecta líneas que superan el stock', () => {
    expect(stockProblems([{ productId: 'a', name: 'A', unitPrice: 1, qty: 5, stock: 3 }])).toEqual(['A'])
  })
})

describe('moneda y alertas', () => {
  it('convierte USD a Bs con la tasa del día', () => { expect(toBs(10, 36.5)).toBe(365) })
  it('devuelve null sin tasa válida', () => { expect(toBs(10, null)).toBeNull(); expect(toBs(10, 0)).toBeNull() })
  it('marca stock bajo en el mínimo o debajo', () => {
    expect(isLowStock({ stock: 2, min_stock: 2 })).toBe(true); expect(isLowStock({ stock: 3, min_stock: 2 })).toBe(false)
  })
  it('formatea USD', () => { expect(formatUsd(12.5)).toBe('USD 12,50'); expect(formatUsd(1234.5)).toBe('USD 1.234,50') })
})

describe('mensajes de error', () => {
  it('traduce stock insuficiente con el nombre del producto', () => {
    expect(saleErrorMessage({ message: 'stock_insuficiente:Vacuna X' })).toBe('No hay stock suficiente de Vacuna X.')
  })
  it('traduce suscripción vencida y errores desconocidos', () => {
    expect(saleErrorMessage(new Error('suscripcion_vencida'))).toMatch(/venció/)
    expect(saleErrorMessage(new Error('boom'))).toMatch(/No se pudo registrar/)
  })
})
