import type { GroomingService, PetSize } from './entities'

export const SIZES: { value: PetSize; label: string }[] = [
  { value: 'pequeno', label: 'Pequeño' }, { value: 'mediano', label: 'Mediano' }, { value: 'grande', label: 'Grande' },
]
export const sizeLabel = (size?: PetSize | null) => SIZES.find(z => z.value === size)?.label

export const priceFor = (s: Pick<GroomingService, 'price_small' | 'price_medium' | 'price_large'>, size: PetSize) =>
  ({ pequeno: s.price_small, mediano: s.price_medium, grande: s.price_large })[size]
