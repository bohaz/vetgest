import { useCrud } from '@/shared/useCrud'
import type { Appointment, Consultation } from '@/core/entities'
import type { FollowUp, NewConsultation } from './ConsultationForm'

/**
 * Guarda una consulta y lo que se desprende de ella en la agenda: cierra el control que se atendió y agenda el próximo.
 * Los cambios van en orden por la cola de sincronización, así el control nuevo siempre llega después de su consulta.
 */
export function useRecordConsultation() {
  const consultations = useCrud<Consultation>('consultations')
  const appts = useCrud<Appointment>('appointments')
  return (c: NewConsultation, followUp?: FollowUp) => {
    const id = consultations.create(c as Consultation)
    if (c.appointment_id) appts.update(c.appointment_id, { status: 'completada', completed_at: new Date().toISOString() })
    if (followUp) appts.create({ kind: 'consulta', patient_id: c.patient_id, status: 'pendiente', starts_at: followUp.starts_at, notes: followUp.notes, follow_up_of: id })
    return id
  }
}
