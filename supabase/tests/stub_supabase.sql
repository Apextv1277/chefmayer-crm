-- Environnement minimal imitant Supabase pour tester la migration sur un
-- Postgres nu (local ou CI). NE PAS exécuter sur Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Comme Supabase : auth.jwt() lit les claims de la requête.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- Comme Supabase : les rôles API ont les droits de table, la RLS filtre.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
