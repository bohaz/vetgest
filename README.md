# VetGest (MVP)

## Puesta en marcha
1. Crea un proyecto en Supabase y ejecuta `supabase/setup.sql` completo en el SQL Editor (reúne las migraciones 0001 a 0008).
   En un proyecto que ya tenga el esquema, ejecuta solo las migraciones nuevas. Si agregas una migración, corre `npm run db:bundle`.
2. Auth → Providers: activa Email. En URL Configuration pon tu dirección en *Site URL* y agrega `https://<tu-app>/**` en *Redirect URLs*
   (necesario para el enlace de «¿Olvidaste tu contraseña?», que vuelve a `/?recuperar=1`). Para el piloto conviene desactivar *Confirm email*.
   Google es opcional: actívalo en Supabase y define `VITE_GOOGLE_AUTH=true` para mostrar el botón.
3. `cp .env.example .env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   Opcional: `VITE_FEEDBACK_WHATSAPP` (tu número con código de país) muestra «Enviar comentarios» en la app.
4. `npm install && npm run dev`
5. Clínicas piloto: crea un código y comparte el enlace `https://<tu-app>/?codigo=PILOTO-NOMBRE`.
   ```sql
   insert into pilot_codes (code, trial_days, max_uses) values ('PILOTO-NOMBRE', 30, 1);
   ```
   El código también se puede escribir a mano al registrar el negocio. Cada cuenta puede tener un solo negocio.
6. Activar suscripción pagada: `update tenants set subscription_until = now() + interval '30 days' where id = '<id>';`

## Modo demostración (sin Supabase)
Con `VITE_DEMO=true` la app no necesita Supabase: carga Postgres dentro del navegador (PGlite) con las mismas
migraciones y reglas de seguridad, datos de ejemplo y la cuenta `demo@vetgest.app` / `demo1234`. Los datos quedan
solo en ese navegador y se pueden reiniciar desde el aviso superior. El primer ingreso descarga ~17 MB.

```bash
VITE_DEMO=true npm run dev
```

Sirve para vistas previas y presentaciones. Fuera de la demostración, PGlite no se incluye en el build.

## Respaldos
Respaldo semanal cifrado y tarea que evita que Supabase pause el proyecto: ver [docs/respaldos.md](docs/respaldos.md).

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
Interfaz: tokens de color y tipografía en `src/styles.css` (`@theme`), componentes en `src/shared/ui.tsx` e íconos en `src/shared/icons.tsx`.
Para migrar a Rails, crea un adaptador con la misma interfaz y cámbialo en `shared/useRepository.ts` (y `infra/supabase/rpc.ts` para ventas y tasa).

## Reglas de negocio ya aplicadas
- Las ventas se registran solo con `register_sale` (atómica); el stock no puede quedar negativo.
- La tasa del día la cambia un owner/admin; cada venta guarda la tasa vigente.
- Las ventas no se editan ni se borran: se anulan con `void_sale` (solo owner/admin, con motivo), que repone el stock y registra quién y cuándo.
- Agenda única (tabla `appointments`, tipo `consulta` o `peluqueria`). Las citas de peluquería fijan su precio según el tamaño al agendarse y no se pueden completar sin monto y método de pago.
- Seguimiento: al guardar una consulta se puede agendar el próximo control (`follow_up_of`). Al atenderlo, la consulta nueva queda enlazada a la cita (`appointment_id`) con su evolución (mejoró, igual, empeoró, alta) y la cita se completa. Una cita puede marcarse «no vino» (`no_asistio`); esos controles aparecen en el inicio para reagendarlos.
- Recordatorios manuales: el inicio lista las citas de mañana con un botón que abre WhatsApp con el mensaje escrito; al usarlo, la cita queda marcada como recordada (`reminded_at`).
