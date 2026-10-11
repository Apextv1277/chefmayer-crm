// Royauté dégressive par tranches et paliers de rabais (voir la proposition
// « Programme Repas Entreprises — Chef Mayer »).
//
// Royauté : calculée par entreprise et par semaine, sur les ventes nettes
// (après rabais, avant taxes). Chaque taux s'applique seulement aux repas
// de sa tranche, comme l'impôt : la royauté ne baisse jamais quand le
// volume monte.

export const PRIX_REPAS = 12;

export const TRANCHES_ROYAUTE = [
  { de: 1, a: 24, taux: 0.1 },
  { de: 25, a: 74, taux: 0.08 },
  { de: 75, a: Infinity, taux: 0.07 },
] as const;

// Rabais employé selon le volume total de l'entreprise par semaine.
export const PALIERS_RABAIS = [
  { minimum: 0, rabais: 0.05 },
  { minimum: 25, rabais: 0.1 },
  { minimum: 75, rabais: 0.15 },
] as const;

export function arrondirCents(montant: number): number {
  return Math.round(montant * 100) / 100;
}

export function palierRabais(repasParSemaine: number) {
  let palier: (typeof PALIERS_RABAIS)[number] = PALIERS_RABAIS[0];
  for (const p of PALIERS_RABAIS) if (repasParSemaine >= p.minimum) palier = p;
  return palier;
}

export function prixApresRabais(repasParSemaine: number): number {
  return arrondirCents(PRIX_REPAS * (1 - palierRabais(repasParSemaine).rabais));
}

// Nombre de repas dans chaque tranche, ex. 100 → [24, 50, 26].
export function repasParTranche(repas: number): number[] {
  const n = Math.max(0, Math.floor(repas));
  return TRANCHES_ROYAUTE.map((t) => Math.max(0, Math.min(n, t.a) - (t.de - 1)));
}

// Royauté d'une semaine. Le prix moyen par repas vient des ventes nettes
// réelles (Shopify), donc la royauté suit le rabais vraiment appliqué.
export function royauteSemaine(repas: number, ventesNettes: number): number {
  if (repas <= 0 || ventesNettes <= 0) return 0;
  const prixMoyen = ventesNettes / repas;
  const total = repasParTranche(repas).reduce(
    (somme, nombre, i) => somme + nombre * prixMoyen * TRANCHES_ROYAUTE[i].taux,
    0
  );
  return arrondirCents(total);
}

export type VolumeSemaine = {
  entreprise_id: string;
  // Lundi de la semaine, YYYY-MM-DD
  semaine: string;
  repas: number;
  ventes_nettes: number;
};

export type LigneRoyaute = {
  entreprise_id: string;
  semaines: number;
  repas: number;
  ventes_nettes: number;
  royaute: number;
};

// Une semaine compte dans le mois de son lundi (règle simple et stable pour
// le relevé du 15).
export function semaineDuMois(semaine: string, mois: string): boolean {
  return semaine.slice(0, 7) === mois;
}

export function releveDuMois(volumes: VolumeSemaine[], mois: string): LigneRoyaute[] {
  const parEntreprise = new Map<string, LigneRoyaute>();
  for (const v of volumes) {
    if (!semaineDuMois(v.semaine, mois)) continue;
    const ligne = parEntreprise.get(v.entreprise_id) ?? {
      entreprise_id: v.entreprise_id,
      semaines: 0,
      repas: 0,
      ventes_nettes: 0,
      royaute: 0,
    };
    ligne.semaines += 1;
    ligne.repas += v.repas;
    ligne.ventes_nettes = arrondirCents(ligne.ventes_nettes + Number(v.ventes_nettes));
    ligne.royaute = arrondirCents(ligne.royaute + royauteSemaine(v.repas, Number(v.ventes_nettes)));
    parEntreprise.set(v.entreprise_id, ligne);
  }
  return [...parEntreprise.values()].sort((a, b) => b.royaute - a.royaute);
}
