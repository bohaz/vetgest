// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { ConsultationForm } from './ConsultationForm'
import { localDateStr, shiftDay, toStartsAt } from '@/core/dates'
import type { Appointment } from '@/core/entities'

const control: Appointment = { id: 'k1', tenant_id: 't', kind: 'consulta', patient_id: 'p', starts_at: new Date().toISOString(), status: 'pendiente', notes: 'Control: Otitis' }

describe('ConsultationForm', () => {
  it('guarda una consulta sin control', () => {
    const onSubmit = vi.fn()
    render(<ConsultationForm patientId="p" onSubmit={onSubmit} />)
    expect(screen.queryByText('¿Cómo evolucionó?')).toBeNull()
    fireEvent.change(screen.getByLabelText('Motivo de la consulta'), { target: { value: ' Otitis ' } })
    fireEvent.click(screen.getByText('Guardar consulta'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 'p', reason: 'Otitis', appointment_id: null, evolution: null }), undefined)
  })
  it('agenda el próximo control con un atajo', () => {
    const onSubmit = vi.fn()
    render(<ConsultationForm patientId="p" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Motivo de la consulta'), { target: { value: 'Otitis' } })
    fireEvent.click(screen.getByRole('button', { name: 'En 7 días' }))
    expect((screen.getByLabelText('Fecha del control') as HTMLInputElement).value).toBe(shiftDay(localDateStr(), 7))
    fireEvent.change(screen.getByLabelText('Hora del control'), { target: { value: '10:30' } })
    fireEvent.click(screen.getByText('Guardar consulta'))
    expect(onSubmit.mock.calls[0][1]).toEqual({ starts_at: toStartsAt(shiftDay(localDateStr(), 7), '10:30'), notes: 'Control: Otitis' })
  })
  it('al atender un control precarga el motivo, pide la evolución y enlaza la cita', () => {
    const onSubmit = vi.fn()
    render(<ConsultationForm patientId="p" attending={control} onSubmit={onSubmit} />)
    expect((screen.getByLabelText('Motivo de la consulta') as HTMLInputElement).value).toBe('Control: Otitis')
    fireEvent.click(screen.getByRole('button', { name: 'Mejoró' }))
    fireEvent.click(screen.getByText('Guardar consulta'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Control: Otitis', appointment_id: 'k1', evolution: 'mejoro' }), undefined)
  })
})
