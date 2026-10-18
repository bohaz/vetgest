// Recuperación de contraseña. El enlace del correo vuelve a la app con la marca ?recuperar=1;
// así se reconoce aunque Supabase ya haya procesado y limpiado el token de la URL.
const MARK = 'recuperar'

export const recoveryRedirectUrl = (origin = window.location.origin) => `${origin}/?${MARK}=1`

export const isRecoveryUrl = (loc: Pick<Location, 'search' | 'hash'> = window.location) =>
  new URLSearchParams(loc.search).has(MARK) || /type=recovery/.test(loc.hash)

/** Supabase devuelve el error en la URL cuando el enlace venció o ya se usó. */
export const recoveryLinkFailed = (loc: Pick<Location, 'hash' | 'search'> = window.location) =>
  /error_code=|error=access_denied/.test(loc.hash + loc.search)

export function clearRecoveryUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}
