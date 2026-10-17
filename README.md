# VetGest (MVP)

## Puesta en marcha
1. Crea un proyecto en Supabase y ejecuta `supabase/setup.sql` completo en el SQL Editor (reúne las migraciones 0001 a 0006).
   En un proyecto que ya tenga el esquema, ejecuta solo las migraciones nuevas. Si agregas una migración, corre `npm run db:bundle`.
2. Auth → Providers: activa Email y Google; agrega tu URL en Redirect URLs.
3. `cp .env.example .env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. `npm install && npm run dev`
5. Activar suscripción pagada: `update tenants set subscription_until = now() + interval '30 days' where id = '<id>';`

## Modo demostración (sin Supabase)
Con `VITE_DEMO=true` la app no necesita Supabase: carga Postgres dentro del navegador (PGlite) con las mismas
migraciones y reglas de seguridad, datos de ejemplo y la cuenta `demo@vetgest.app` / `demo1234`. Los datos quedan
solo en ese navegador y se pueden reiniciar desde el aviso superior. El primer ingreso descarga ~17 MB.

```bash
VITE_DEMO=true npm run dev
```

Sirve para vistas previas y presentaciones. Fuera de la demostración, PGlite no se incluye en el build.

## Tests
`npm test` ejecuta 65 pruebas: lógica de precios, carrito, agenda, errores y cambios optimistas; la cola sin conexión
(orden de envío, reintentos ante falta de señal y cambios rechazados); componentes (carrito, citas, historial de ventas,
formularios de cliente y paciente) y la base de datos real (migraciones en PGlite: RLS, aislamiento entre negocios,
ventas atómicas y anulaciones, bloqueo por stock y suscripción vencida, precio por tamaño y cobro al completar citas).

## Modo sin conexión
- Los datos se guardan en el dispositivo (IndexedDB) y la app abre sin señal con lo último sincronizado.
- Los cambios se ven al instante y quedan en una cola que se envía **en orden** al volver la señal, aunque la app se haya cerrado.
- Un error de red no se descarta: el cambio sigue en la cola y se reintenta. Si el servidor rechaza un cambio (suscripción vencida,
  sin stock, etc.), aparece en el aviso superior con «Reintentar» y «Descartar».
- Las ventas sin conexión descuentan el stock en pantalla; el servidor vuelve a validar el stock al recibirlas.

## Arquitectura
`core/` (contratos y lógica pura) → `infra/` (adaptadores: Supabase, local) → `features/` (UI por módulo).
Para migrar a Rails, crea un adaptador con la misma interfaz y cámbialo en `shared/useRepository.ts` (y `infra/supabase/rpc.ts` para ventas y tasa).

## Reglas de negocio ya aplicadas
- Las ventas se registran solo con `register_sale` (atómica); el stock no puede quedar negativo.
- La tasa del día la cambia un owner/admin; cada venta guarda la tasa vigente.
- Las ventas no se editan ni se borran: se anulan con `void_sale` (solo owner/admin, con motivo), que repone el stock y registra quién y cuándo.
- Las citas de peluquería fijan su precio según el tamaño al agendarse y no se pueden completar sin monto y método de pago.
