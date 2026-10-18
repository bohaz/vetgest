# Respaldos y mantenimiento de Supabase

Dos tareas automáticas de GitHub Actions cuidan la base de datos:

| Tarea | Cuándo | Qué hace |
| --- | --- | --- |
| **Respaldo semanal** (`backup.yml`) | Domingos 03:00 (Venezuela) y a mano | Exporta la base, la cifra y la guarda 90 días como artefacto del workflow |
| **Mantener Supabase activo** (`keep-alive.yml`) | Cada tres días | Hace una consulta liviana para que Supabase no pause el proyecto gratuito |

## Configuración (una sola vez)

En GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

| Secreto | De dónde sale |
| --- | --- |
| `SUPABASE_DB_URL` | Supabase → botón **Connect** → *Session pooler* → URI. Reemplaza `[YOUR-PASSWORD]` por la contraseña de la base de datos. Usa el *Session pooler*, no la conexión directa: los servidores de GitHub no tienen IPv6. |
| `BACKUP_PASSPHRASE` | Una clave larga que inventas tú (por ejemplo, cuatro palabras al azar). Guárdala en tu gestor de contraseñas: **sin ella no se puede abrir ningún respaldo**. |
| `SUPABASE_URL` | `https://<id-del-proyecto>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → *Project Settings* → *API Keys* → `anon public` |

Después, en la pestaña **Actions**, ejecuta cada workflow una vez con **Run workflow** y confirma que terminan en verde.

> GitHub desactiva las tareas programadas de un repositorio que pasa 60 días sin cambios. Si eso pasa, avisa por correo y se reactivan con un clic en **Actions**.

## Qué contiene un respaldo

`vetgest-AAAA-MM-DD.tar.gpg`, cifrado con AES-256 (los artefactos de un repositorio público los puede descargar cualquier usuario de GitHub, por eso van cifrados). Dentro:

- `public.dump`: tablas, reglas de seguridad, funciones y datos de la app.
- `auth.dump`: las cuentas de usuario (`auth.users` y `auth.identities`).
- `resumen.tsv`: filas por tabla, para revisar el respaldo sin restaurarlo.

## Descargar y abrir un respaldo

1. **Actions → Respaldo semanal →** la ejecución que quieras **→ Artifacts** → descargar y descomprimir el `.zip`.
2. Descifrar y extraer:
   ```bash
   gpg --decrypt vetgest-AAAA-MM-DD.tar.gpg | tar -x
   cat resumen.tsv
   ```

## Restaurar en un proyecto nuevo de Supabase

Se necesita `pg_restore` 17 o más nuevo. Usa la cadena del *Session pooler* del proyecto nuevo.

```bash
DB="postgresql://postgres.<id>:<contraseña>@aws-0-<región>.pooler.supabase.com:5432/postgres"
pg_restore -d "$DB" --data-only --exit-on-error auth.dump   # 1) primero las cuentas
pg_restore -d "$DB" --no-owner public.dump                  # 2) después la app
```

El paso 2 avisa `schema "public" already exists`: es esperable y no afecta la restauración.

Luego apunta la app al proyecto nuevo (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel), redespliega y repite la configuración de *Authentication → URL Configuration*.

## Probar el respaldo en local

```bash
SUPABASE_DB_URL="postgresql://..." BACKUP_PASSPHRASE="..." scripts/backup.sh backups
```
