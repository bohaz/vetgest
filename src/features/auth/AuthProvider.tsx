import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/infra/supabase/client'

interface Ctx { session: Session | null; tenantId: string | null; loading: boolean; createBusiness: (name: string) => Promise<void> }
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTenant = async () => {
    const { data } = await supabase.from('members').select('tenant_id').limit(1)
    setTenantId(data?.[0]?.tenant_id ?? null)
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setTenantId(null); return }
    loadTenant().finally(() => setLoading(false))
  }, [session])

  const createBusiness = async (name: string) => {
    const { error } = await supabase.rpc('create_tenant', { p_name: name })
    if (error) throw error
    await loadTenant()
  }
  return <AuthCtx.Provider value={{ session, tenantId, loading, createBusiness }}>{children}</AuthCtx.Provider>
}
