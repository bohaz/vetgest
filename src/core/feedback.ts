// Enlace de WhatsApp para que las clínicas envíen comentarios. El número sale de VITE_FEEDBACK_WHATSAPP.
export function feedbackLink(phone: string | undefined, context: { clinic?: string; screen?: string }): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const where = [context.clinic, context.screen && `pantalla «${context.screen}»`].filter(Boolean).join(', ')
  const text = `Hola, te escribo desde VetGest${where ? ` (${where})` : ''}. Mi comentario: `
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
