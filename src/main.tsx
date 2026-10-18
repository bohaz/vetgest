import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { onlineManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { createQueryClient, resumePending } from '@/shared/queryClient'
import { persister } from '@/infra/local/db'
import { captureInviteCode } from '@/features/auth/inviteCode'
import App from './App'
import './styles.css'

// La librería asume conexión al iniciar; si la app se abre sin señal, la cola debe quedar en pausa desde el principio.
onlineManager.setOnline(navigator.onLine)
captureInviteCode()
const queryClient = createQueryClient()
const persistOptions = {
  persister,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  buster: 'v1',
  // Se guardan también los cambios en curso, para no perderlos si la app se cierra sin señal.
  dehydrateOptions: { shouldDehydrateMutation: (m: { state: { status: string } }) => m.state.status === 'pending' },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions} onSuccess={() => resumePending(queryClient)}>
      <AuthProvider><App /></AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
