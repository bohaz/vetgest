import type { Entity } from './repository'

export interface Client extends Entity { full_name: string; phone?: string; email?: string; notes?: string }
export type PetSize = 'pequeno' | 'mediano' | 'grande'
export interface Patient extends Entity { size?: PetSize; client_id: string; name: string; species: string; breed?: string; birth_date?: string; weight_kg?: number }
export interface Product extends Entity { sku?: string; name: string; category: 'farmaco' | 'alimento' | 'agropecuario' | 'accesorio'; price_usd: number; stock: number; min_stock: number }
export type Evolution = 'mejoro' | 'igual' | 'empeoro' | 'alta'
export interface Consultation extends Entity {
  patient_id: string; visit_date: string; reason?: string; diagnosis?: string; treatment?: string; price_usd?: number
  /** Cita de control en la que se atendió esta consulta. */
  appointment_id?: string | null; evolution?: Evolution | null
}
export interface Sale extends Entity { client_id?: string; total_usd: number; rate_bs?: number; pay_method?: string; created_at: string
  voided_at?: string | null; void_reason?: string | null }
export interface GroomingService extends Entity { name: string; price_small: number; price_medium: number; price_large: number; duration_min: number }
export type AppointmentKind = 'consulta' | 'peluqueria'
export type AppointmentStatus = 'pendiente' | 'en_proceso' | 'completada' | 'no_asistio' | 'cancelada'
/** Cita de la agenda: un control de consulta o un servicio de peluquería. */
export interface Appointment extends Entity {
  kind: AppointmentKind; patient_id: string; starts_at: string; status: AppointmentStatus; notes?: string; completed_at?: string
  /** Consulta que pidió este control. */
  follow_up_of?: string | null; reminded_at?: string | null
  // Solo peluquería
  service_id?: string; size?: PetSize; price_usd?: number; paid_usd?: number; pay_method?: string
}
