// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { PatientForm } from './PatientForm'
import { ClientForm } from '@/features/clients/ClientForm'
import type { Patient } from '@/core/entities'

const clients = [{ id: 'c1', tenant_id: 't', full_name: 'Ana' }, { id: 'c2', tenant_id: 't', full_name: 'Luis' }]
const rocky: Patient = { id: 'p1', tenant_id: 't', client_id: 'c1', name: 'Rocky', species: 'Perro', breed: 'Golden', weight_kg: 32, size: 'grande' }

describe('edición de pacientes y clientes', () => {
  it('carga los datos del paciente, permite cambiar dueño y borrar campos', () => {
    const onSubmit = vi.fn()
    render(<PatientForm clients={clients} initial={rocky} submitLabel="Guardar cambios" onSubmit={onSubmit} />)
    expect((screen.getByLabelText('Nombre del paciente') as HTMLInputElement).value).toBe('Rocky')
    fireEvent.change(screen.getByLabelText('Dueño'), { target: { value: 'c2' } })
    fireEvent.change(screen.getByLabelText('Raza'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '30.5' } })
    fireEvent.click(screen.getByText('Guardar cambios'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'c2', name: 'Rocky', breed: null, weight_kg: 30.5, size: 'grande' }))
  })
  it('el cliente se edita y un teléfono vacío se guarda como null', () => {
    const onSubmit = vi.fn()
    render(<ClientForm initial={{ id: 'c1', tenant_id: 't', full_name: 'Ana', phone: '0412' }} submitLabel="Guardar cambios" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Nombre del cliente'), { target: { value: ' Ana Pérez ' } })
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Guardar cambios'))
    expect(onSubmit).toHaveBeenCalledWith({ full_name: 'Ana Pérez', phone: null, email: null, notes: null })
  })
})
