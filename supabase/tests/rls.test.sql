-- Tests des règles d'accès (RLS). Lancé par executer.sh après la migration.
\set ON_ERROR_STOP 1

insert into membres (id, email, nom, role) values
  ('00000000-0000-0000-0000-00000000000a', 'tommy@test.ca', 'Tommy', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'jonathan@test.ca', 'Jonathan', 'chef'),
  ('00000000-0000-0000-0000-000000000001', 'julie@test.ca', 'Julie', 'representant'),
  ('00000000-0000-0000-0000-000000000002', 'marc@test.ca', 'Marc', 'representant');

insert into entreprises (id, nom, assigne_a) values
  ('10000000-0000-0000-0000-000000000001', 'De Julie', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'De Marc', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'Sans représentant', null);

insert into volumes (entreprise_id, semaine, repas, ventes_nettes)
  values ('10000000-0000-0000-0000-000000000001', '2026-10-12', 30, 324);

create or replace function pg_temp.en_tant_que(courriel text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('email', courriel)::text, false);
  execute 'set role authenticated';
end $$;

create or replace function pg_temp.verifier(condition boolean, message text) returns void language plpgsql as $$
begin
  if not condition then raise exception 'ÉCHEC : %', message; end if;
  raise notice 'ok : %', message;
end $$;

-- Représentante : seulement ses entreprises, pas les volumes.
select pg_temp.en_tant_que('julie@test.ca');
select pg_temp.verifier((select count(*) from entreprises) = 1, 'une représentante voit seulement ses entreprises');
select pg_temp.verifier((select count(*) from volumes) = 0, 'une représentante ne voit pas les volumes');
select pg_temp.verifier((select count(*) from membres) = 4, 'un membre voit l''équipe');

insert into entreprises (nom, assigne_a) values ('Nouvelle de Julie', '00000000-0000-0000-0000-000000000001');
select pg_temp.verifier((select count(*) from entreprises) = 2, 'une représentante crée une entreprise à son nom');

do $$
begin
  insert into entreprises (nom, assigne_a) values ('Pour Marc', '00000000-0000-0000-0000-000000000002');
  raise exception 'ÉCHEC : création pour un autre membre acceptée';
exception when insufficient_privilege then
  raise notice 'ok : une représentante ne crée pas d''entreprise pour un autre';
end $$;

do $$
begin
  insert into activites (entreprise_id, membre_id, type)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'appel');
  raise exception 'ÉCHEC : activité au nom d''un autre acceptée';
exception when insufficient_privilege then
  raise notice 'ok : une activité est toujours au nom de son auteur';
end $$;

insert into activites (entreprise_id, membre_id, type, resultat)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'appel', 'Pas joint');

update entreprises set statut = 'Pas joint' where id = '10000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.verifier(
  (select statut from entreprises where id = '10000000-0000-0000-0000-000000000002') = 'À appeler',
  'une représentante ne modifie pas l''entreprise d''un autre'
);

-- Chef : voit tout, gère les volumes, ne gère pas l'équipe.
select pg_temp.en_tant_que('jonathan@test.ca');
select pg_temp.verifier((select count(*) from entreprises) = 4, 'le chef voit toutes les entreprises');
select pg_temp.verifier((select count(*) from volumes) = 1, 'le chef voit les volumes');
update membres set nom = 'Piraté' where email = 'tommy@test.ca';
reset role;
select pg_temp.verifier((select nom from membres where email = 'tommy@test.ca') = 'Tommy', 'seul l''admin modifie l''équipe');

-- Inconnu ou membre inactif : rien.
update membres set actif = false where email = 'marc@test.ca';
select pg_temp.en_tant_que('marc@test.ca');
select pg_temp.verifier((select count(*) from entreprises) = 0, 'un membre inactif ne voit rien');
select pg_temp.en_tant_que('inconnu@test.ca');
select pg_temp.verifier((select count(*) from membres) = 0, 'un inconnu ne voit pas l''équipe');
reset role;

-- Contraintes.
do $$
begin
  insert into volumes (entreprise_id, semaine, repas, ventes_nettes)
    values ('10000000-0000-0000-0000-000000000001', '2026-10-14', 1, 1);
  raise exception 'ÉCHEC : semaine qui ne commence pas un lundi acceptée';
exception when check_violation then
  raise notice 'ok : une semaine de volume commence un lundi';
end $$;
