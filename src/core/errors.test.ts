import { errorMessage, isNetworkError } from './errors'

describe('mensajes de error', () => {
  it('reconoce errores de red', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError({ message: 'TypeError: Failed to fetch' })).toBe(true)
    expect(isNetworkError(new Error('stock_insuficiente:X'))).toBe(false)
    expect(errorMessage(new TypeError('Load failed'))).toMatch(/Sin conexión/)
  })
  it('traduce errores de la base de datos', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy for table "clients"' })).toMatch(/suscripción venció/)
    expect(errorMessage({ message: 'update or delete on table "products" violates foreign key constraint' })).toMatch(/registros asociados/)
    expect(errorMessage({ message: 'insert or update on table "patients" violates foreign key constraint' })).toMatch(/Falta un registro relacionado/)
    expect(errorMessage(new Error('venta_ya_anulada'))).toBe('Esta venta ya estaba anulada.')
    expect(errorMessage(new Error('stock_insuficiente: Vacuna X'))).toBe('No hay stock suficiente de Vacuna X.')
    expect(errorMessage(new Error('otro'), 'Respaldo')).toBe('Respaldo')
  })
})
