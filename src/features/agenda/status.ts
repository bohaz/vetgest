import type { Tone } from '@/shared/ui'
import type { AppointmentStatus } from '@/core/entities'

/** Color de cada estado de cita en toda la app. */
export const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  pendiente: 'neutral', en_proceso: 'warn', completada: 'brand', no_asistio: 'danger', cancelada: 'danger',
}
