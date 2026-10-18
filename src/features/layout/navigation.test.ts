import { activeMobileItem, screenName } from './navigation'

describe('navegación', () => {
  it('marca el ítem correcto de la barra inferior', () => {
    expect(activeMobileItem('/')).toBe('/')
    expect(activeMobileItem('/pacientes/abc')).toBe('/pacientes')
    expect(activeMobileItem('/peluqueria/servicios')).toBe('/peluqueria')
    expect(activeMobileItem('/clientes')).toBe('/mas')
    expect(activeMobileItem('/inventario')).toBe('/mas')
    expect(activeMobileItem('/mas')).toBe('/mas')
  })
  it('nombra la pantalla actual', () => {
    expect(screenName('/')).toBe('Inicio')
    expect(screenName('/pacientes/abc')).toBe('Pacientes')
    expect(screenName('/ventas')).toBe('Ventas')
  })
})
