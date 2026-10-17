import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/infra/supabase/client'
import { persister } from '@/infra/local/db'
import { isNetworkError } from '@/core/errors'
import { failures } from '@/features/sync/failures'

interface Ctx { session: Session | null; tenantId: string | null; loading: boolean; createBusiness: (name: string) => Promise<void> }
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

// El negocio del usuario se recuerda en el dispositivo para poder abrir la app sin conexión.
const tenantKey = (userId: string) => `vetgest.tenant.${userId}`
export const rememberedTenant = (userId: string) => { try { return localStorage.getItem(tenantKey(userId)) } catch { return null } }
const rememberTenant = (userId: string, id: string | null) => {
  try { if (id) localStorage.setItem(tenantKey(userId), id); else localStorage.removeItem(tenantKey(userId)) } catch { /* almacenamiento no disponible */ }
}

/** Sesión guardada por Supabase. Se usa solo si no hay conexión para renovarla: los datos vienen de la caché. */
function storedSession(): Session | null {
  try {
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTenant = async (userId: string) => {
    // Arranque inmediato con el negocio recordado; el servidor lo confirma después (si hay señal).
    const remembered = rememberedTenant(userId)
    if (remembered) { setTenantId(remembered); setLoading(false) }
    if (!navigator.onLine && remembered) return
    const { data, error } = await supabase.from('members').select('tenant_id').limit(1)
    if (error && isNetworkError(error)) { setTenantId(rememberedTenant(userId)); return }
    const id = data?.[0]?.tenant_id ?? null
    rememberTenant(userId, id); setTenantId(id)
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      const s = data.session ?? (error && isNetworkError(error) ? storedSession() : null)
      setSession(s); if (!s) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') { qc.clear(); failures.clear(); void persister.removeClient() }
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) { setTenantId(null); return }
    loadTenant(userId).finally(() => setLoading(false))
  }, [userId])

  const createBusiness = async (name: string) => {
    const { error } = await supabase.rpc('create_tenant', { p_name: name })
    if (error) throw error
    await loadTenant(userId!)
  }
  return <AuthCtx.Provider value={{ session, tenantId, loading, createBusiness }}>{children}</AuthCtx.Provider>
}
