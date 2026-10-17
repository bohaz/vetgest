// supabase/setup.sql debe estar al día con las migraciones y crear el esquema completo de una vez.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error script en JavaScript sin tipos
import { bundle } from '../../scripts/bundle-sql.mjs'

const root = join(__dirname, '../..')

describe('setup.sql', () => {
  it('coincide con las migraciones (ejecuta npm run db:bundle si falla)', () => {
    expect(readFileSync(join(root, 'supabase/setup.sql'), 'utf8')).toBe(bundle(join(root, 'supabase/migrations')))
  })
  it('crea el esquema completo en una base nueva', async () => {
    const db = new PGlite()
    await db.exec(`create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create role authenticated;`)
    await db.exec(readFileSync(join(root, 'supabase/setup.sql'), 'utf8').replace('create extension if not exists pgcrypto;', ''))
    const fns = (await db.query<{ proname: string }>("select proname from pg_proc where proname in ('create_tenant','register_sale','void_sale','set_exchange_rate') order by 1")).rows.map(r => r.proname)
    expect(fns).toEqual(['create_tenant', 'register_sale', 'set_exchange_rate', 'void_sale'])
  })
})
