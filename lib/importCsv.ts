import { normaliserCourriel, normaliserTelephone } from "./coordonnees";

// Import des listes d'entreprises (CSV : Apollo, Google Sheets, Excel).
// Les colonnes sont reconnues par leur nom, en français ou en anglais.

export function lireCsv(texte: string): string[][] {
  const contenu = texte.replace(/^﻿/, "");
  const premiereLigne = contenu.split(/\r?\n/, 1)[0] ?? "";
  const separateur = [",", ";", "\t"].reduce((meilleur, s) =>
    premiereLigne.split(s).length > premiereLigne.split(meilleur).length ? s : meilleur
  );

  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let guillemets = false;

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (guillemets) {
      if (c === '"' && contenu[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        guillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      guillemets = true;
    } else if (c === separateur) {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && contenu[i + 1] === "\n") i++;
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else {
      champ += c;
    }
  }
  if (champ || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((v) => v.trim()));
}

export function simplifier(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Champ =
  | "nom"
  | "secteur"
  | "ville"
  | "region"
  | "adresse"
  | "nb_employes"
  | "telephone"
  | "courriel_entreprise"
  | "site_web"
  | "prenom"
  | "nom_contact"
  | "nom_complet"
  | "poste"
  | "telephone_contact"
  | "courriel"
  | "notes";

const SYNONYMES: Record<Champ, string[]> = {
  nom: ["entreprise", "nom entreprise", "nom de l entreprise", "company", "company name", "organisation", "organization", "raison sociale", "compagnie"],
  secteur: ["secteur", "secteur d activite", "industrie", "industry"],
  ville: ["ville", "city", "company city", "municipalite"],
  region: ["region", "state", "province", "company state"],
  adresse: ["adresse", "address", "company address", "rue"],
  nb_employes: ["employes", "nb employes", "nombre d employes", "nombre employes", "employees", "employes estimes", "taille", "company size"],
  telephone: ["telephone", "telephone entreprise", "company phone", "corporate phone", "phone", "tel", "numero"],
  courriel_entreprise: ["courriel entreprise", "company email"],
  site_web: ["site", "site web", "website", "url", "site internet"],
  prenom: ["prenom", "first name", "prenom contact"],
  nom_contact: ["nom contact", "last name", "nom de famille"],
  nom_complet: ["contact", "nom complet", "full name", "responsable", "personne contact"],
  poste: ["poste", "titre", "title", "fonction", "job title"],
  telephone_contact: ["telephone contact", "work direct phone", "mobile phone", "cellulaire", "cell", "direct", "mobile"],
  courriel: ["courriel", "email", "e mail", "courriel contact", "adresse courriel"],
  notes: ["notes", "note", "commentaire", "commentaires"],
};

export function associerColonnes(entetes: string[]): Partial<Record<Champ, number>> {
  const simples = entetes.map(simplifier);
  const colonnes: Partial<Record<Champ, number>> = {};
  for (const [champ, noms] of Object.entries(SYNONYMES) as [Champ, string[]][]) {
    const i = simples.findIndex((e) => noms.includes(e));
    if (i >= 0) colonnes[champ] = i;
  }
  // « Nom » seul : le nom de l'entreprise, sauf si une colonne entreprise
  // existe déjà (c'est alors le nom de famille du contact).
  const iNom = simples.indexOf("nom");
  if (iNom >= 0) {
    if (colonnes.nom === undefined) colonnes.nom = iNom;
    else if (colonnes.nom_contact === undefined) colonnes.nom_contact = iNom;
  }
  return colonnes;
}

export type LigneImport = {
  entreprise: {
    nom: string;
    secteur: string | null;
    ville: string | null;
    region: string | null;
    adresse: string | null;
    nb_employes: number | null;
    telephone: string | null;
    courriel: string | null;
    site_web: string | null;
    notes: string | null;
  };
  contact: {
    prenom: string | null;
    nom: string | null;
    poste: string | null;
    telephone: string | null;
    courriel: string | null;
  } | null;
};

function texte(valeur: string | undefined): string | null {
  const t = valeur?.trim();
  return t ? t : null;
}

// « 51-200 » → 51, « 1 200 » → 1200
function nombre(valeur: string | undefined): number | null {
  const m = valeur?.replace(/[\s ]/g, "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

export type ResultatImport = { lignes: LigneImport[]; ignorees: number; colonnesReconnues: string[] };

export function analyserCsv(contenu: string): ResultatImport {
  const [entetes, ...donnees] = lireCsv(contenu);
  if (!entetes) return { lignes: [], ignorees: 0, colonnesReconnues: [] };
  const col = associerColonnes(entetes);
  const lire = (ligne: string[], champ: Champ) => (col[champ] === undefined ? undefined : ligne[col[champ]!]);

  const lignes: LigneImport[] = [];
  let ignorees = 0;

  for (const l of donnees) {
    const nom = texte(lire(l, "nom"));
    if (!nom) {
      ignorees++;
      continue;
    }

    let prenom = texte(lire(l, "prenom"));
    let nomContact = texte(lire(l, "nom_contact"));
    const complet = texte(lire(l, "nom_complet"));
    if (!prenom && !nomContact && complet) {
      const [p, ...reste] = complet.split(/\s+/);
      prenom = p;
      nomContact = reste.join(" ") || null;
    }

    const telEntreprise = normaliserTelephone(lire(l, "telephone")).e164;
    const telContact = normaliserTelephone(lire(l, "telephone_contact")).e164;
    const courriel = normaliserCourriel(lire(l, "courriel"));
    const poste = texte(lire(l, "poste"));
    const aContact = Boolean(prenom || nomContact || courriel || telContact);

    lignes.push({
      entreprise: {
        nom,
        secteur: texte(lire(l, "secteur")),
        ville: texte(lire(l, "ville")),
        region: texte(lire(l, "region")),
        adresse: texte(lire(l, "adresse")),
        nb_employes: nombre(lire(l, "nb_employes")),
        telephone: telEntreprise ?? telContact,
        courriel: normaliserCourriel(lire(l, "courriel_entreprise")),
        site_web: texte(lire(l, "site_web")),
        notes: texte(lire(l, "notes")),
      },
      contact: aContact ? { prenom, nom: nomContact, poste, telephone: telContact ?? telEntreprise, courriel } : null,
    });
  }

  const colonnesReconnues = (Object.keys(col) as Champ[]).map((c) => entetes[col[c]!]);
  return { lignes, ignorees, colonnesReconnues };
}

// Clé de doublon : même téléphone, ou même nom dans la même ville.
export function clesDoublon(e: { nom: string; ville: string | null; telephone: string | null }): string[] {
  const cles = [`nom:${simplifier(e.nom)}|${simplifier(e.ville ?? "")}`];
  const tel = normaliserTelephone(e.telephone).e164;
  if (tel) cles.push(`tel:${tel}`);
  return cles;
}
