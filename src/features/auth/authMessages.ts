// Validación y mensajes en español para el inicio de sesión y el registro.
export const MIN_PASSWORD = 6
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Escribe tu correo.'
  return isEmail(email) ? null : 'Revisa el correo: parece incompleto.'
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  return password === confirm ? null : 'Las contraseñas no coinciden.'
}

/** Revisa los campos antes de llamar a Supabase. Devuelve el mensaje a mostrar o null si están bien. */
export function validateCredentials(email: string, password: string, mode: 'signin' | 'signup'): string | null {
  if (!email.trim() || !password) return 'Escribe tu correo y una contraseña.'
  if (!isEmail(email)) return 'Revisa el correo: parece incompleto.'
  if (mode === 'signup' && password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  return null
}

const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Confirma tu correo con el enlace que te enviamos antes de entrar.'],
  [/already registered|already exists/i, 'Ya existe una cuenta con ese correo. Usa «Iniciar sesión».'],
  [/password should be at least|weak password/i, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`],
  [/rate limit|too many/i, 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'],
  [/invalid.*email|email.*invalid/i, 'Revisa el correo: parece incompleto.'],
  [/signups not allowed|signup.*disabled/i, 'El registro de cuentas nuevas está desactivado.'],
  [/should be different/i, 'La nueva contraseña debe ser distinta de la anterior.'],
  [/expired|invalid.*(token|otp)|otp/i, 'El enlace venció o ya se usó. Pide uno nuevo.'],
  [/session.*missing|not authenticated/i, 'El enlace venció o ya se usó. Pide uno nuevo.'],
  [/fetch|network/i, 'Sin conexión con el servidor. Revisa tu señal e inténtalo de nuevo.'],
]
export function authErrorMessage(e: { message?: string } | null | undefined): string {
  const msg = e?.message ?? ''
  return KNOWN.find(([re]) => re.test(msg))?.[1] ?? 'No se pudo completar. Inténtalo de nuevo.'
}
