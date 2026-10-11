// Statuts d'une dégustation (offre de prospection : un dîner gratuit livré
// à l'équipe d'une entreprise).

export const STATUTS_DEGUSTATION = {
  reservee: "Réservée",
  confirmee: "Confirmée",
  a_reporter: "À reporter",
  faite: "Faite",
  annulee: "Annulée",
} as const;

export type StatutDegustation = keyof typeof STATUTS_DEGUSTATION;

// Une dégustation « active » reçoit encore les rappels.
export function degustationActive(statut: StatutDegustation): boolean {
  return statut === "reservee" || statut === "confirmee";
}

export const RESULTATS_DEGUSTATION = {
  signee: "Signée : code activé",
  a_relancer: "Intéressée : à relancer",
  pas_interessee: "Pas intéressée",
} as const;

export type ResultatDegustation = keyof typeof RESULTATS_DEGUSTATION;

export const DUREE_DEGUSTATION_MINUTES = 60;
