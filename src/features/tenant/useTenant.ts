import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { getTenant } from '@/infra/supabase/rpc'
import { subscriptionStatus } from '@/core/subscription'

/** Datos del negocio actual (nombre y periodo de prueba o suscripción). Se guarda en caché para uso sin conexión. */
export function useTenant() {
  const { tenantId } = useAuth()
  const query = useQuery({ queryKey: ['tenant', tenantId], queryFn: () => getTenant(tenantId!), enabled: !!tenantId })
  return { tenant: query.data ?? null, status: query.data ? subscriptionStatus(query.data) : null }
}
