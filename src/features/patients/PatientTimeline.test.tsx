// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { PatientTimeline } from './PatientTimeline'
import type { TimelineItem } from '@/core/dashboard'

const items: TimelineItem[] = [
  { id: 'g1', kind: 'peluqueria', date: new Date(2026, 9, 17, 11).toISOString(), title: 'Baño y corte', lines: [], amountUsd: 30, status: 'en_proceso' },
  { id: 'c1', kind: 'consulta', date: new Date(2026, 9, 15, 9).toISOString(), title: 'Otitis', lines: ['Diagnóstico: Otitis externa'], amountUsd: 30, removable: true },
  { id: 'k1', kind: 'consulta', date: new Date(2026, 9, 10, 9).toISOString(), title: 'Control: Vacuna', lines: [], status: 'no_asistio' },
  { id: 'c0', kind: 'consulta', date: new Date(2026, 9, 1, 9).toISOString(), title: 'Control: Piel', lines: [], evolution: 'mejoro', removable: true },
]

describe('PatientTimeline', () => {
  it('muestra todo con montos y estado, y filtra por tipo', () => {
    render(<PatientTimeline items={items} onRemoveConsultation={vi.fn()} />)
    expect(screen.getByText('Peluquería · Baño y corte')).toBeTruthy()
    expect(screen.getByText('Consulta · Otitis')).toBeTruthy()
    expect(screen.getByText('En proceso')).toBeTruthy()
    expect(screen.getByText('Diagnóstico: Otitis externa')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Consultas' }))
    expect(screen.queryByText('Peluquería · Baño y corte')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Peluquería' }))
    expect(screen.queryByText('Consulta · Otitis')).toBeNull()
  })
  it('solo las consultas se pueden eliminar, con confirmación', () => {
    const onRemove = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<PatientTimeline items={items} onRemoveConsultation={onRemove} />)
    expect(screen.getAllByRole('button', { name: /Eliminar consulta/ })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar consulta Otitis' }))
    expect(onRemove).toHaveBeenCalledWith('c1', 'Otitis')
  })
  it('muestra los controles a los que no vino y la evolución de los atendidos', () => {
    render(<PatientTimeline items={items} onRemoveConsultation={vi.fn()} />)
    expect(screen.getByText('No vino')).toBeTruthy()
    expect(screen.getByText('Evolución: Mejoró')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Eliminar consulta Control: Vacuna' })).toBeNull()
  })
  it('avisa cuando no hay historial', () => {
    render(<PatientTimeline items={[]} onRemoveConsultation={vi.fn()} />)
    expect(screen.getByText('Este paciente aún no tiene historial.')).toBeTruthy()
  })
})
