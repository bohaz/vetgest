import type { Tone } from '@/shared/ui'
import type { GroomingAppointment } from '@/core/entities'

/** Color de cada estado de cita en toda la app. */
export const STATUS_TONE: Record<GroomingAppointment['status'], Tone> = {
  pendiente: 'neutral', en_proceso: 'warn', completada: 'brand', cancelada: 'danger',
}
