import { applyCreate, applyRemove, applySaleToStock, applyUpdate, describe as label } from './optimistic'

const rows = [{ id: 'a', tenant_id: 't', name: 'Ana' }, { id: 'b', tenant_id: 't', name: 'Luis' }]

describe('cambios optimistas', () => {
  it('agrega al inicio sin duplicar', () => {
    expect(applyCreate(rows, { id: 'c', tenant_id: 't', name: 'Mía' })?.map(r => r.id)).toEqual(['c', 'a', 'b'])
    expect(applyCreate(rows, { id: 'a', tenant_id: 't', name: 'Ana' })).toBe(rows)
    expect(applyCreate(undefined, { id: 'c', tenant_id: 't' })).toBeUndefined()
  })
  it('edita y elimina por id', () => {
    expect(applyUpdate(rows, 'b', { name: 'Luis R.' })?.[1].name).toBe('Luis R.')
    expect(applyRemove(rows, 'a')?.map(r => r.id)).toEqual(['b'])
  })
  it('descuenta del stock lo vendido, sumando líneas del mismo producto', () => {
    const products = [{ id: 'p1', tenant_id: 't', stock: 10 }, { id: 'p2', tenant_id: 't', stock: 4 }]
    expect(applySaleToStock(products, [{ product_id: 'p1', qty: 2 }, { product_id: 'p1', qty: 1 }])?.map(p => p.stock)).toEqual([7, 4])
  })
  it('describe registros para los avisos', () => {
    expect(label('clients', { full_name: 'Ana Pérez' })).toBe('Cliente Ana Pérez')
    expect(label('consultations', { reason: 'Vacuna' })).toBe('Consulta Vacuna')
    expect(label('otra', {})).toBe('Registro')
  })
})
