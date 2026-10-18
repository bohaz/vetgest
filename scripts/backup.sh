#!/usr/bin/env bash
# Respaldo cifrado de la base de datos de VetGest.
#
# Uso:  SUPABASE_DB_URL=... BACKUP_PASSPHRASE=... scripts/backup.sh [carpeta-salida]
# Genera <carpeta>/vetgest-AAAA-MM-DD.tar.gpg con:
#   - public.dump  esquema y datos de la app (formato custom de pg_dump)
#   - auth.dump    cuentas de usuario (auth.users y auth.identities), solo datos
# Restaurar: docs/respaldos.md
set -euo pipefail

: "${SUPABASE_DB_URL:?Falta SUPABASE_DB_URL (cadena de conexión del Session pooler de Supabase)}"
: "${BACKUP_PASSPHRASE:?Falta BACKUP_PASSPHRASE (clave para cifrar el respaldo)}"

OUT_DIR="${1:-backups}"
STAMP="$(date -u +%Y-%m-%d)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$OUT_DIR"

pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --format=custom --file="$WORK/public.dump"
pg_dump "$SUPABASE_DB_URL" --data-only --table=auth.users --table=auth.identities --format=custom --file="$WORK/auth.dump"

# Resumen legible (filas exactas por tabla) para comprobar el respaldo sin restaurarlo.
psql "$SUPABASE_DB_URL" --no-psqlrc --quiet --tuples-only --no-align --field-separator=$'\t' > "$WORK/resumen.tsv" <<'SQL'
select format('select %L, count(*) from public.%I', tablename, tablename) from pg_tables where schemaname = 'public' order by tablename
\gexec
SQL

tar -C "$WORK" -cf "$WORK/vetgest-$STAMP.tar" public.dump auth.dump resumen.tsv
# La clave va por un descriptor de archivo: nunca queda en la línea de comandos ni en los logs.
gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
  --output "$OUT_DIR/vetgest-$STAMP.tar.gpg" "$WORK/vetgest-$STAMP.tar" 3<<<"$BACKUP_PASSPHRASE"

echo "Respaldo listo: $OUT_DIR/vetgest-$STAMP.tar.gpg ($(du -h "$OUT_DIR/vetgest-$STAMP.tar.gpg" | cut -f1))"
