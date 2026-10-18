// Código de invitación (piloto) que llega en el enlace: https://…/?codigo=PILOTO-XXXX
// Se guarda en el dispositivo para que sobreviva al registro de la cuenta y se borra al usarlo.
const KEY = 'vetgest.inviteCode'

export function captureInviteCode(search = window.location.search): void {
  const code = new URLSearchParams(search).get('codigo')?.trim()
  if (!code) return
  try { localStorage.setItem(KEY, code.toUpperCase()) } catch { /* almacenamiento no disponible */ }
}
export function storedInviteCode(): string {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}
export function clearInviteCode(): void {
  try { localStorage.removeItem(KEY) } catch { /* almacenamiento no disponible */ }
}
