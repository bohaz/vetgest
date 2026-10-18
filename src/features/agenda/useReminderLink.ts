import { reminderText } from '@/core/agenda'
import { whatsappLink } from '@/core/whatsapp'
import type { Appointment, Client, Patient } from '@/core/entities'
import { useTenant } from '@/features/tenant/useTenant'

/** Enlace de WhatsApp con el recordatorio ya escrito para el dueño. Solo para citas pendientes con teléfono. */
export function useReminderLink() {
  const clinic = useTenant().tenant?.name
  return (a: Appointment, patient?: Patient, owner?: Client, service?: string) =>
    a.status === 'pendiente' && patient
      ? whatsappLink(owner?.phone, reminderText({ kind: a.kind, pet: patient.name, owner: owner?.full_name, service, clinic, starts_at: a.starts_at }))
      : null
}
