import type { Entity } from './repository'

export interface Client extends Entity { full_name: string; phone?: string; email?: string; notes?: string }
export type PetSize = 'pequeno' | 'mediano' | 'grande'
export interface Patient extends Entity { size?: PetSize; client_id: string; name: string; species: string; breed?: string; birth_date?: string; weight_kg?: number }
export interface Product extends Entity { sku?: string; name: string; category: 'farmaco' | 'alimento' | 'agropecuario' | 'accesorio'; price_usd: number; stock: number; min_stock: number }
export interface Consultation extends Entity { patient_id: string; visit_date: string; reason?: string; diagnosis?: string; treatment?: string; price_usd?: number }
export interface Sale extends Entity { client_id?: string; total_usd: number; rate_bs?: number; pay_method?: string; created_at: string
  voided_at?: string | null; void_reason?: string | null }
export interface GroomingService extends Entity { name: string; price_small: number; price_medium: number; price_large: number; duration_min: number }
export interface GroomingAppointment extends Entity {
  patient_id: string; service_id?: string; starts_at: string; status: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'; size: PetSize
  price_usd?: number; paid_usd?: number; pay_method?: string; completed_at?: string; notes?: string
}
