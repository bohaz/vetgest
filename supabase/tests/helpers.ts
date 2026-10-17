import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const A = '00000000-0000-0000-0000-00000000000a'
export const B = '00000000-0000-0000-0000-00000000000b'

/** Postgres en memoria con las migraciones reales y un `auth` mínimo que simula Supabase. */
export async function createDb() {
  const db = new PGlite()
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
    create role authenticated; insert into auth.users values ('${A}'), ('${B}');`)
  const dir = join(__dirname, '../migrations')
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, f), 'utf8').replace('create extension if not exists pgcrypto;', ''))
  await db.exec('grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated; grant select on auth.users to authenticated;')
  return db
}
export const asUser = (db: PGlite, uid: string | null) =>
  db.exec(`reset role; select set_config('request.jwt.sub', '${uid ?? ''}', false); ${uid ? 'set role authenticated;' : ''}`)
export const one = async <T>(db: PGlite, sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows[0]
