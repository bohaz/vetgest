import { priceFor, sizeLabel } from './grooming'
import type { GroomingService } from './entities'

const svc: GroomingService = { id: 's1', tenant_id: 't', name: 'Baño', price_small: 20, price_medium: 30, price_large: 45, duration_min: 60 }

describe('peluquería', () => {
  it('elige el precio según el tamaño', () => { expect([priceFor(svc, 'pequeno'), priceFor(svc, 'mediano'), priceFor(svc, 'grande')]).toEqual([20, 30, 45]) })
  it('nombra el tamaño', () => { expect(sizeLabel('grande')).toBe('Grande'); expect(sizeLabel(null)).toBeUndefined() })
})
