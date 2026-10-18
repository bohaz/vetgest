// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { captureInviteCode, storedInviteCode } from './inviteCode'

const h = vi.hoisted(() => ({ createBusiness: vi.fn() }))
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ createBusiness: h.createBusiness }) }))
import { OnboardingPage } from './OnboardingPage'

beforeEach(() => { localStorage.clear(); h.createBusiness.mockReset() })

describe('registro del negocio', () => {
  it('toma el código del enlace, lo envía y lo borra al terminar', async () => {
    captureInviteCode('?codigo=piloto-30')
    expect(storedInviteCode()).toBe('PILOTO-30')
    h.createBusiness.mockResolvedValue(undefined)
    render(<OnboardingPage />)
    expect((screen.getByLabelText(/Código de invitación/) as HTMLInputElement).value).toBe('PILOTO-30')
    fireEvent.change(screen.getByLabelText('Nombre de la veterinaria'), { target: { value: ' Vet San Rafael ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Empezar prueba' }))
    await waitFor(() => expect(h.createBusiness).toHaveBeenCalledWith('Vet San Rafael', 'PILOTO-30'))
    await waitFor(() => expect(storedInviteCode()).toBe(''))
  })
  it('muestra en español un código inválido y conserva lo escrito', async () => {
    h.createBusiness.mockRejectedValue({ message: 'codigo_invalido' })
    render(<OnboardingPage />)
    fireEvent.change(screen.getByLabelText('Nombre de la veterinaria'), { target: { value: 'Vet' } })
    fireEvent.change(screen.getByLabelText(/Código de invitación/), { target: { value: 'malo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Empezar prueba' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/no es válido/)
    expect((screen.getByLabelText('Nombre de la veterinaria') as HTMLInputElement).value).toBe('Vet')
  })
  it('sin nombre no llama al servidor', () => {
    render(<OnboardingPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Empezar prueba' }))
    expect(screen.getByRole('status').textContent).toMatch(/nombre/)
    expect(h.createBusiness).not.toHaveBeenCalled()
  })
})
