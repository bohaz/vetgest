import { createClient } from '@supabase/supabase-js'

/** Modo demostración: la app usa una base de datos dentro del navegador en lugar de Supabase (ver infra/demo). */
export const isDemo = import.meta.env.VITE_DEMO === 'true'

const demoFetch: typeof fetch = (input, init) => import('@/infra/demo/demoBackend').then(m => m.demoFetch(input, init))

export const supabase = isDemo
  ? createClient('https://demo.vetgest.app', 'demo', { global: { fetch: demoFetch } })
  : createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
