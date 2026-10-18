import { useLocation } from 'react-router-dom'
import { feedbackLink } from '@/core/feedback'
import { useTenant } from '@/features/tenant/useTenant'
import { screenName } from './navigation'

/** Enlace de WhatsApp para enviar comentarios desde la pantalla actual (null si no hay número configurado). */
export function useFeedbackLink() {
  const { pathname } = useLocation()
  const { tenant } = useTenant()
  return feedbackLink(import.meta.env.VITE_FEEDBACK_WHATSAPP, { clinic: tenant?.name, screen: screenName(pathname) })
}
