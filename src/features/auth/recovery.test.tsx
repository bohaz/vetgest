// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { isRecoveryUrl, recoveryLinkFailed, recoveryRedirectUrl } from './recovery'

const h = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), finish: vi.fn() }))
vi.mock('@/infra/supabase/client', () => ({
  isDemo: false,
  supabase: { auth: { resetPasswordForEmail: h.reset, updateUser: h.update, signInWithPassword: vi.fn(), signUp: vi.fn() } },
}))
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ finishRecovery: h.finish }) }))
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'

beforeEach(() => { h.reset.mockReset(); h.update.mockReset(); h.finish.mockReset() })
const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('reconoce el enlace de recuperación', () => {
  it('por la marca propia o por el tipo de Supabase, y detecta enlaces vencidos', () => {
    expect(recoveryRedirectUrl('https://app.test')).toBe('https://app.test/?recuperar=1')
    expect(isRecoveryUrl({ search: '?recuperar=1', hash: '' })).toBe(true)
    expect(isRecoveryUrl({ search: '', hash: '#access_token=x&type=recovery' })).toBe(true)
    expect(isRecoveryUrl({ search: '', hash: '' })).toBe(false)
    expect(recoveryLinkFailed({ search: '?recuperar=1', hash: '#error=access_denied&error_code=otp_expired' })).toBe(true)
  })
})

describe('pedir el enlace', () => {
  it('«¿Olvidaste tu contraseña?» abre el formulario y envía el enlace con la marca de vuelta', async () => {
    h.reset.mockResolvedValue({ error: null })
    render(<LoginPage />)
    fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'))
    expect(screen.getByRole('heading', { name: 'Recupera tu contraseña' })).toBeTruthy()
    expect(screen.queryByLabelText(/^Contraseña/)).toBeNull()
    type(/^Correo/, ' ana@clinica.com ')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    await waitFor(() => expect(h.reset).toHaveBeenCalledWith('ana@clinica.com', { redirectTo: `${window.location.origin}/?recuperar=1` }))
    expect((await screen.findByRole('status')).textContent).toMatch(/te llegará un enlace/)
  })
  it('no revela si el correo existe y valida antes de enviar', async () => {
    h.reset.mockResolvedValue({ error: { message: 'User not found' } })
    render(<LoginPage initialMode="recover" />)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect(screen.getByRole('status').textContent).toBe('Escribe tu correo.')
    type(/^Correo/, 'nadie@clinica.com')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Si hay una cuenta/)
  })
  it('muestra el aviso de enlace vencido', () => {
    render(<LoginPage initialMode="recover" notice="El enlace venció o ya se usó. Pide uno nuevo." />)
    expect(screen.getByRole('status').textContent).toMatch(/venció/)
  })
})

describe('crear la contraseña nueva', () => {
  it('valida largo y coincidencia, guarda y termina la recuperación', async () => {
    h.update.mockResolvedValue({ error: null })
    render(<ResetPasswordPage />)
    type(/^Contraseña nueva/, '123'); type(/^Repite/, '123')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.getByRole('status').textContent).toMatch(/al menos 6/)
    type(/^Contraseña nueva/, 'nueva123'); type(/^Repite/, 'otra1234')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.getByRole('status').textContent).toBe('Las contraseñas no coinciden.')
    type(/^Repite/, 'nueva123')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    await waitFor(() => expect(h.update).toHaveBeenCalledWith({ password: 'nueva123' }))
    expect(h.finish).toHaveBeenCalled()
  })
  it('traduce errores de Supabase y no termina la recuperación', async () => {
    h.update.mockResolvedValue({ error: { message: 'New password should be different from the old password.' } })
    render(<ResetPasswordPage />)
    type(/^Contraseña nueva/, 'misma123'); type(/^Repite/, 'misma123')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/distinta de la anterior/)
    expect(h.finish).not.toHaveBeenCalled()
  })
})
