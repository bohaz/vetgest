/** Enlace de WhatsApp (por defecto Venezuela, +58). Devuelve null si no hay teléfono. */
export function whatsappLink(phone: string | undefined, text: string, country = '58') {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const number = digits.startsWith(country) ? digits : country + digits.replace(/^0+/, '')
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}
