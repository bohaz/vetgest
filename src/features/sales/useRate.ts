import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { getRate, setRate } from '@/infra/supabase/rpc'

export function useRate() {
  const { tenantId } = useAuth(); const qc = useQueryClient()
  const query = useQuery({ queryKey: ['rate', tenantId], queryFn: () => getRate(tenantId!) })
  const save = useMutation({ mutationFn: (r: number) => setRate(tenantId!, r), onSuccess: () => qc.invalidateQueries({ queryKey: ['rate'] }) })
  return { rate: query.data ?? null, save }
}
