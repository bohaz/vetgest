import { authErrorMessage, validateCredentials } from './authMessages'

describe('inicio de sesión y registro', () => {
  it('pide correo y contraseña antes de llamar a Supabase', () => {
    expect(validateCredentials('', '', 'signup')).toBe('Escribe tu correo y una contraseña.')
    expect(validateCredentials('ana@', 'secreta1', 'signin')).toMatch(/correo/)
    expect(validateCredentials('ana@clinica.com', '123', 'signup')).toMatch(/al menos 6/)
    expect(validateCredentials('ana@clinica.com', '123', 'signin')).toBeNull()
    expect(validateCredentials(' ana@clinica.com ', 'secreta1', 'signup')).toBeNull()
  })
  it('traduce los errores de Supabase', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe('Correo o contraseña incorrectos.')
    expect(authErrorMessage({ message: 'User already registered' })).toMatch(/Ya existe una cuenta/)
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toMatch(/Demasiados intentos/)
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch(/Confirma tu correo/)
    expect(authErrorMessage({ message: 'algo raro' })).toBe('No se pudo completar. Inténtalo de nuevo.')
  })
})
