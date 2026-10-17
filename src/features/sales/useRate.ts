import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { getRate } from '@/infra/supabase/rpc'
import { KEYS, type RateVars } from '@/shared/queryClient'

export function useRate() {
  const { tenantId } = useAuth()
  const query = useQuery({ queryKey: ['rate', tenantId], queryFn: () => getRate(tenantId!) })
  const m = useMutation<unknown, Error, RateVars>({ mutationKey: KEYS.rate })
  return { rate: query.data ?? null, save: (rate: number) => m.mutate({ tenantId: tenantId!, rate }) }
}
