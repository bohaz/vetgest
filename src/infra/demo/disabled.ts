// Sustituye a demoBackend fuera del modo demostración (ver vite.config.ts), para no incluir PGlite en producción.
const off = () => Promise.reject(new Error('El modo demostración no está activo'))
export const demoFetch: typeof fetch = off
export const resetDemo = off
