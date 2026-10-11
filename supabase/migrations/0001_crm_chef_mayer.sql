-- CRM Chef Mayer : prospection B2B par offre de dégustation.
-- À exécuter une fois dans Supabase (SQL Editor) sur un projet neuf.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Équipe : admin (Tommy : listes, CRM, rapports), chef (Jonathan : voit
-- tout, cuisine les dégustations), representant (voit ses entreprises).
-- ---------------------------------------------------------------------------
create table public.membres (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  nom text not null,
  role text not null check (role in ('admin', 'chef', 'representant')),
  telephone text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.membre_courant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from membres where email = lower(auth.jwt() ->> 'email') and actif
$$;

create or replace function public.membre_role() returns text
language sql stable security definer set search_path = public as $$
  select role from membres where email = lower(auth.jwt() ->> 'email') and actif
$$;

create or replace function public.est_gestionnaire() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.membre_role() in ('admin', 'chef'), false)
$$;

-- ---------------------------------------------------------------------------
-- Listes importées (fournies par Tommy) : la provenance d'une entreprise
-- donne droit à la royauté.
-- ---------------------------------------------------------------------------
create table public.listes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  nb_entreprises integer not null default 0,
  importee_par uuid references public.membres (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  secteur text,
  ville text,
  region text,
  adresse text,
  nb_employes integer check (nb_employes is null or nb_employes >= 0),
  telephone text,
  courriel text,
  site_web text,
  statut text not null default 'À appeler' check (statut in (
    'À appeler', 'Pas joint', 'Rappel prévu', 'Dégustation réservée',
    'Dégustation faite', 'Client actif', 'Non intéressé'
  )),
  date_rappel timestamptz,
  ne_plus_appeler boolean not null default false,
  liste_id uuid references public.listes (id) on delete set null,
  -- Clientes de Chef Mayer avant l'entente : exclues de la royauté.
  exclue_royaute boolean not null default false,
  assigne_a uuid references public.membres (id) on delete set null,
  code_rabais text unique,
  date_premiere_livraison date,
  notes text,
  cree_par uuid references public.membres (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entreprises_statut on public.entreprises (statut);
create index entreprises_assigne on public.entreprises (assigne_a);
create index entreprises_rappel on public.entreprises (date_rappel) where date_rappel is not null;
create index entreprises_telephone on public.entreprises (telephone);

create or replace function public.maj_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger entreprises_updated_at before update on public.entreprises
  for each row execute function public.maj_updated_at();

create or replace function public.peut_voir_entreprise(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from entreprises e
    where e.id = eid
      and (public.est_gestionnaire() or e.assigne_a = public.membre_courant_id())
  )
$$;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  prenom text,
  nom text,
  poste text,
  telephone text,
  courriel text,
  principal boolean not null default false,
  sms_desabonne boolean not null default false,
  courriel_desabonne boolean not null default false,
  created_at timestamptz not null default now()
);

create index contacts_entreprise on public.contacts (entreprise_id);
create index contacts_telephone on public.contacts (telephone);

create table public.activites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  membre_id uuid references public.membres (id) on delete set null,
  type text not null check (type in ('appel', 'courriel', 'texto', 'note', 'degustation', 'statut')),
  resultat text,
  note text,
  created_at timestamptz not null default now()
);

create index activites_entreprise on public.activites (entreprise_id, created_at desc);
create index activites_membre on public.activites (membre_id, created_at desc);

create table public.degustations (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  debut timestamptz not null,
  adresse text,
  nb_personnes integer check (nb_personnes is null or nb_personnes > 0),
  allergies text,
  statut text not null default 'reservee' check (statut in ('reservee', 'confirmee', 'a_reporter', 'faite', 'annulee')),
  resultat text check (resultat is null or resultat in ('signee', 'a_relancer', 'pas_interessee')),
  notes text,
  reserve_par uuid references public.membres (id) on delete set null,
  created_at timestamptz not null default now()
);

create index degustations_debut on public.degustations (debut);
create index degustations_entreprise on public.degustations (entreprise_id);

-- Volumes hebdomadaires des comptes actifs (rapport Shopify par code) :
-- base du calcul de la royauté.
create table public.volumes (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises (id) on delete cascade,
  semaine date not null check (extract(isodow from semaine) = 1),
  repas integer not null check (repas >= 0),
  ventes_nettes numeric(10, 2) not null check (ventes_nettes >= 0),
  created_at timestamptz not null default now(),
  unique (entreprise_id, semaine)
);

-- Journal des textos et courriels (automatiques ou manuels). La clé unique
-- empêche tout double envoi.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  canal text not null check (canal in ('sms', 'courriel')),
  type text not null,
  destinataire text not null,
  sujet text,
  contenu text not null,
  statut text not null check (statut in ('en_cours', 'envoye', 'test', 'echec')),
  tentatives integer not null default 1,
  erreur text,
  id_externe text,
  entreprise_id uuid references public.entreprises (id) on delete cascade,
  degustation_id uuid references public.degustations (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  envoye_par uuid references public.membres (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_entreprise on public.messages (entreprise_id, created_at desc);
create index messages_recents on public.messages (created_at desc);

create trigger messages_updated_at before update on public.messages
  for each row execute function public.maj_updated_at();

-- ---------------------------------------------------------------------------
-- Sécurité (RLS). Les envois automatiques passent par la clé service.
-- ---------------------------------------------------------------------------
alter table public.membres enable row level security;
alter table public.listes enable row level security;
alter table public.entreprises enable row level security;
alter table public.contacts enable row level security;
alter table public.activites enable row level security;
alter table public.degustations enable row level security;
alter table public.volumes enable row level security;
alter table public.messages enable row level security;

create policy membres_lecture on public.membres for select
  using (public.membre_courant_id() is not null);
create policy membres_admin on public.membres for all
  using (public.membre_role() = 'admin') with check (public.membre_role() = 'admin');

create policy listes_gestion on public.listes for all
  using (public.est_gestionnaire()) with check (public.est_gestionnaire());

create policy entreprises_lecture on public.entreprises for select
  using (public.est_gestionnaire() or assigne_a = public.membre_courant_id());
create policy entreprises_creation on public.entreprises for insert
  with check (public.est_gestionnaire() or assigne_a = public.membre_courant_id());
create policy entreprises_modification on public.entreprises for update
  using (public.est_gestionnaire() or assigne_a = public.membre_courant_id())
  with check (public.est_gestionnaire() or assigne_a = public.membre_courant_id());
create policy entreprises_suppression on public.entreprises for delete
  using (public.membre_role() = 'admin');

create policy contacts_acces on public.contacts for all
  using (public.peut_voir_entreprise(entreprise_id))
  with check (public.peut_voir_entreprise(entreprise_id));

create policy activites_lecture on public.activites for select
  using (public.peut_voir_entreprise(entreprise_id));
create policy activites_creation on public.activites for insert
  with check (public.peut_voir_entreprise(entreprise_id) and membre_id = public.membre_courant_id());

create policy degustations_acces on public.degustations for all
  using (public.peut_voir_entreprise(entreprise_id))
  with check (public.peut_voir_entreprise(entreprise_id));

create policy volumes_gestion on public.volumes for all
  using (public.est_gestionnaire()) with check (public.est_gestionnaire());

create policy messages_lecture on public.messages for select
  using (public.est_gestionnaire() or (entreprise_id is not null and public.peut_voir_entreprise(entreprise_id)));
