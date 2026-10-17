import type { Product } from './entities'

export type PayMethod = 'efectivo_usd' | 'efectivo_bs' | 'pago_movil' | 'zelle_binance'
export const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: 'efectivo_usd', label: 'Efectivo USD' }, { value: 'efectivo_bs', label: 'Efectivo Bs' },
  { value: 'pago_movil', label: 'Pago Móvil' }, { value: 'zelle_binance', label: 'Zelle / Binance' },
]
export const CATEGORIES: { value: Product['category']; label: string }[] = [
  { value: 'farmaco', label: 'Fármacos' }, { value: 'alimento', label: 'Alimento' },
  { value: 'agropecuario', label: 'Agropecuario' }, { value: 'accesorio', label: 'Accesorios' },
]

export interface CartLine { productId: string; name: string; unitPrice: number; qty: number; stock: number }

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const lineTotal = (l: CartLine) => round2(l.unitPrice * l.qty)
export const cartTotal = (ls: CartLine[]) => round2(ls.reduce((s, l) => s + lineTotal(l), 0))
export const toBs = (usd: number, rate: number | null) => (rate && rate > 0 ? round2(usd * rate) : null)
export const isLowStock = (p: Pick<Product, 'stock' | 'min_stock'>) => p.stock <= p.min_stock
export const formatUsd = (n: number) => `USD ${n.toFixed(2)}`
export const formatBs = (n: number) => `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Agrega una unidad (o `qty`) sin superar el stock disponible. */
export function addToCart(cart: CartLine[], p: Product, qty = 1): CartLine[] {
  const found = cart.find(l => l.productId === p.id)
  if (!found) return p.stock >= qty && qty > 0 ? [...cart, { productId: p.id, name: p.name, unitPrice: p.price_usd, qty, stock: p.stock }] : cart
  return setQty(cart, p.id, found.qty + qty)
}
/** Fija la cantidad: <= 0 elimina la línea; nunca excede el stock. */
export function setQty(cart: CartLine[], productId: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter(l => l.productId !== productId)
  return cart.map(l => (l.productId === productId ? { ...l, qty: Math.min(qty, l.stock) } : l))
}
export const stockProblems = (cart: CartLine[]) => cart.filter(l => l.qty > l.stock).map(l => l.name)

const ERRORS: Record<string, string> = {
  suscripcion_vencida: 'Tu prueba o suscripción venció. Renueva para registrar ventas.',
  venta_vacia: 'Agrega al menos un producto a la venta.',
  no_autorizado: 'No tienes permiso para esta acción.',
  tasa_invalida: 'La tasa debe ser un número mayor que cero.',
  cantidad_invalida: 'Hay una cantidad inválida en la venta.',
  producto_no_existe: 'Un producto de la venta ya no existe.',
}
/** Traduce los errores de la base de datos a mensajes para el usuario. */
export function saleErrorMessage(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e)
  const stock = msg.match(/stock_insuficiente:\s*(.+)/)
  if (stock) return `No hay stock suficiente de ${stock[1].trim()}.`
  const key = Object.keys(ERRORS).find(k => msg.includes(k))
  return key ? ERRORS[key] : 'No se pudo registrar la venta. Revisa tu conexión e inténtalo de nuevo.'
}
