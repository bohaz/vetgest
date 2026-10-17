// Une las migraciones en supabase/setup.sql para crear la base de datos con un solo pegado en el SQL Editor.
// Uso: npm run db:bundle
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function bundle(dir = 'supabase/migrations') {
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  const header = '-- VetGest: esquema completo. Generado con `npm run db:bundle` a partir de supabase/migrations (no editar a mano).\n' +
    '-- Pégalo completo en Supabase → SQL Editor → Run, una sola vez, en un proyecto nuevo.\n'
  return header + files.map(f => `\n-- ===== ${f} =====\n${readFileSync(join(dir, f), 'utf8').trim()}\n`).join('')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync('supabase/setup.sql', bundle())
  console.log('supabase/setup.sql actualizado')
}
