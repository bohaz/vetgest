import { supabase } from './client'
import type { PayMethod } from '@/core/pricing'

export async function registerSale(tenantId: string, input: { clientId?: string; method: PayMethod; items: { product_id: string; qty: number }[] }) {
  const { data, error } = await supabase.rpc('register_sale', { p_tenant: tenantId, p_client: input.clientId ?? null, p_method: input.method, p_items: input.items })
  if (error) throw error
  return data as string
}
export async function getRate(tenantId: string) {
  const { data, error } = await supabase.from('tenants').select('rate_bs').eq('id', tenantId).single()
  if (error) throw error
  return (data?.rate_bs as number | null) ?? null
}
export async function setRate(tenantId: string, rate: number) {
  const { error } = await supabase.rpc('set_exchange_rate', { p_tenant: tenantId, p_rate: rate })
  if (error) throw error
}
export async function voidSale(saleId: string, reason: string) {
  const { error } = await supabase.rpc('void_sale', { p_sale: saleId, p_reason: reason })
  if (error) throw error
}
