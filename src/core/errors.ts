// Traduce errores de red y de la base de datos a mensajes para el usuario.
const KNOWN: Record<string, string> = {
  suscripcion_vencida: 'Tu prueba o suscripción venció. Renueva para seguir guardando cambios.',
  venta_vacia: 'Agrega al menos un producto a la venta.',
  no_autorizado: 'No tienes permiso para esta acción. Pídeselo al dueño o a un administrador.',
  tasa_invalida: 'La tasa debe ser un número mayor que cero.',
  cantidad_invalida: 'Hay una cantidad inválida en la venta.',
  producto_no_existe: 'Un producto de la venta ya no existe.',
  venta_no_existe: 'La venta ya no existe.',
  venta_ya_anulada: 'Esta venta ya estaba anulada.',
  motivo_requerido: 'Indica el motivo de la anulación.',
  codigo_invalido: 'El código de invitación no es válido, venció o ya se usó.',
  ya_tiene_negocio: 'Tu cuenta ya tiene un negocio registrado.',
  nombre_requerido: 'Escribe el nombre de la veterinaria.',
  'update or delete on table': 'No se puede eliminar porque tiene ventas u otros registros asociados.',
  'insert or update on table': 'Falta un registro relacionado (por ejemplo, el dueño o el paciente no se guardó). Revisa el cambio anterior.',
  'row-level security': 'No se pudo guardar: tu prueba o suscripción venció, o no tienes permiso.',
}

const messageOf = (e: unknown) => String((e as { message?: string })?.message ?? e ?? '')

/** Error de red: no hubo respuesta del servidor (sin señal, servidor caído, etc.). */
export function isNetworkError(e: unknown): boolean {
  const msg = messageOf(e)
  return e instanceof TypeError || /Failed to fetch|NetworkError|Load failed|fetch failed|AuthRetryableFetchError/i.test(msg)
}

export function errorMessage(e: unknown, fallback = 'No se pudo guardar. Inténtalo de nuevo.'): string {
  if (isNetworkError(e)) return 'Sin conexión con el servidor. Revisa tu señal e inténtalo de nuevo.'
  const msg = messageOf(e)
  const stock = msg.match(/stock_insuficiente:\s*(.+)/)
  if (stock) return `No hay stock suficiente de ${stock[1].trim()}.`
  const key = Object.keys(KNOWN).find(k => msg.includes(k))
  return key ? KNOWN[key] : fallback
}
