-- Permisos explícitos para el rol de usuarios con sesión. Algunos proyectos nuevos de Supabase no exponen
-- automáticamente las tablas creadas por SQL; con esto la app funciona igual. RLS sigue decidiendo qué filas ve cada negocio.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
