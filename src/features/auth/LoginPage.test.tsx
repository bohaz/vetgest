// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({ signUp: vi.fn(), signIn: vi.fn() }))
vi.mock('@/infra/supabase/client', () => ({
  isDemo: false,
  supabase: { auth: { signUp: h.signUp, signInWithPassword: h.signIn, signInWithOAuth: vi.fn() } },
}))
import { LoginPage } from './LoginPage'

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } })
beforeEach(() => { h.signUp.mockReset(); h.signIn.mockReset() })

describe('LoginPage', () => {
  it('«Crea tu cuenta» abre el formulario de registro en vez de registrar con campos vacíos', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Crea tu cuenta'))
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeTruthy()
    expect(screen.getByLabelText('Repite la contraseña')).toBeTruthy()
    expect(h.signUp).not.toHaveBeenCalled()
  })
  it('valida y no llama a Supabase si faltan datos o las contraseñas no coinciden', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Crea tu cuenta'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByRole('status').textContent).toBe('Escribe tu correo y una contraseña.')
    type('Correo', 'ana@clinica.com'); type('Contraseña', 'secreta1'); type('Repite', 'otra1234')
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByRole('status').textContent).toBe('Las contraseñas no coinciden.')
    expect(h.signUp).not.toHaveBeenCalled()
  })
  it('registra con los datos correctos y avisa si hay que confirmar el correo', async () => {
    h.signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Crea tu cuenta'))
    type('Correo', ' ana@clinica.com '); type('Contraseña', 'secreta1'); type('Repite', 'secreta1')
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(h.signUp).toHaveBeenCalledWith({ email: 'ana@clinica.com', password: 'secreta1' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Revisa tu correo/)
  })
  it('inicia sesión y traduce credenciales incorrectas', async () => {
    h.signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginPage />)
    type('Correo', 'ana@clinica.com'); type('Contraseña', 'mala')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect((await screen.findByRole('status')).textContent).toBe('Correo o contraseña incorrectos.')
  })
})
