// Pipeline de prospection Chef Mayer : une entreprise avance de « À appeler »
// jusqu'à « Client actif ». La prospection se fait par une offre de
// dégustation gratuite.

export const STATUTS = [
  "À appeler",
  "Pas joint",
  "Rappel prévu",
  "Dégustation réservée",
  "Dégustation faite",
  "Client actif",
  "Non intéressé",
] as const;

export type Statut = (typeof STATUTS)[number];

export const COULEURS_STATUT: Record<Statut, string> = {
  "À appeler": "#6b7280",
  "Pas joint": "#a16207",
  "Rappel prévu": "#b45309",
  "Dégustation réservée": "#7c3aed",
  "Dégustation faite": "#2563eb",
  "Client actif": "#15803d",
  "Non intéressé": "#9ca3af",
};

// Statuts encore « à travailler » au téléphone.
export const STATUTS_A_APPELER: readonly Statut[] = ["À appeler", "Pas joint", "Rappel prévu"];

export function estStatut(valeur: unknown): valeur is Statut {
  return typeof valeur === "string" && (STATUTS as readonly string[]).includes(valeur);
}

export const RESULTATS_APPEL = {
  pas_joint: "Pas joint",
  message_laisse: "Message laissé",
  rappel: "Rappel prévu",
  non_interesse: "Non intéressé",
  ne_plus_appeler: "Ne plus appeler",
} as const;

export type ResultatAppel = keyof typeof RESULTATS_APPEL;

export type ChangementEntreprise = {
  statut?: Statut;
  date_rappel?: string | null;
  ne_plus_appeler?: boolean;
};

// Ce que le résultat d'un appel change sur la fiche. Un appel ne fait
// jamais reculer une entreprise déjà rendue à la dégustation ou cliente
// (sauf une demande explicite de ne plus appeler).
export function changementApresAppel(
  statutActuel: Statut,
  resultat: ResultatAppel,
  dateRappel: string | null = null
): ChangementEntreprise {
  const enProspection = STATUTS_A_APPELER.includes(statutActuel) || statutActuel === "Non intéressé";

  switch (resultat) {
    case "pas_joint":
    case "message_laisse":
      return enProspection ? { statut: "Pas joint" } : {};
    case "rappel":
      return enProspection
        ? { statut: "Rappel prévu", date_rappel: dateRappel }
        : { date_rappel: dateRappel };
    case "non_interesse":
      return enProspection ? { statut: "Non intéressé", date_rappel: null } : {};
    case "ne_plus_appeler":
      return {
        ne_plus_appeler: true,
        date_rappel: null,
        ...(statutActuel === "Client actif" ? {} : { statut: "Non intéressé" as Statut }),
      };
  }
}

// Une entreprise peut-elle être appelée ?
export function appelable(e: { statut: string; ne_plus_appeler: boolean }): boolean {
  return !e.ne_plus_appeler && (STATUTS_A_APPELER as readonly string[]).includes(e.statut);
}
