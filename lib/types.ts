import type { Statut } from "./pipeline";
import type { ResultatDegustation, StatutDegustation } from "./degustations";

export type Role = "admin" | "chef" | "representant";

export type Membre = {
  id: string;
  email: string;
  nom: string;
  role: Role;
  telephone: string | null;
  actif: boolean;
};

export type Entreprise = {
  id: string;
  nom: string;
  secteur: string | null;
  ville: string | null;
  region: string | null;
  adresse: string | null;
  nb_employes: number | null;
  telephone: string | null;
  courriel: string | null;
  site_web: string | null;
  statut: Statut;
  date_rappel: string | null;
  ne_plus_appeler: boolean;
  liste_id: string | null;
  exclue_royaute: boolean;
  assigne_a: string | null;
  code_rabais: string | null;
  date_premiere_livraison: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  entreprise_id: string;
  prenom: string | null;
  nom: string | null;
  poste: string | null;
  telephone: string | null;
  courriel: string | null;
  principal: boolean;
  sms_desabonne: boolean;
  courriel_desabonne: boolean;
};

export type Activite = {
  id: string;
  entreprise_id: string;
  membre_id: string | null;
  type: "appel" | "courriel" | "texto" | "note" | "degustation" | "statut";
  resultat: string | null;
  note: string | null;
  created_at: string;
};

export type Degustation = {
  id: string;
  entreprise_id: string;
  contact_id: string | null;
  debut: string;
  adresse: string | null;
  nb_personnes: number | null;
  allergies: string | null;
  statut: StatutDegustation;
  resultat: ResultatDegustation | null;
  notes: string | null;
  reserve_par: string | null;
  created_at: string;
};

export type MessageJournal = {
  id: string;
  cle: string;
  canal: "sms" | "courriel";
  type: string;
  destinataire: string;
  sujet: string | null;
  contenu: string;
  statut: "en_cours" | "envoye" | "test" | "echec";
  tentatives: number;
  erreur: string | null;
  entreprise_id: string | null;
  degustation_id: string | null;
  contact_id: string | null;
  created_at: string;
};

export function nomContact(c: Pick<Contact, "prenom" | "nom"> | null | undefined): string {
  return c ? [c.prenom, c.nom].filter(Boolean).join(" ") : "";
}
