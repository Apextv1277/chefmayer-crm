import type { ResultatEnvoi } from "../envoi/types";
import type { Envoi } from "./planifier";

// Exécute les envois dus. Chaque clé est d'abord réservée dans le journal
// (table messages, clé unique) : si deux passages se croisent, un seul
// envoie. Un échec peut être retenté au passage suivant, 3 fois au maximum.

export const TENTATIVES_MAX = 3;

export type Depot = {
  // true si la clé vient d'être réservée par ce passage.
  reserver(envoi: Envoi): Promise<boolean>;
  terminer(cle: string, resultat: ResultatEnvoi): Promise<void>;
};

export type Expediteurs = {
  sms(destinataire: string, texte: string): Promise<ResultatEnvoi>;
  courriel(destinataire: string, message: { sujet: string; texte: string; html: string | null }): Promise<ResultatEnvoi>;
};

export type Bilan = { envoyes: number; tests: number; echecs: number; dejaFaits: number };

export async function executerEnvois(envois: Envoi[], depot: Depot, expediteurs: Expediteurs): Promise<Bilan> {
  const bilan: Bilan = { envoyes: 0, tests: 0, echecs: 0, dejaFaits: 0 };

  for (const envoi of envois) {
    if (!(await depot.reserver(envoi))) {
      bilan.dejaFaits += 1;
      continue;
    }

    let resultat: ResultatEnvoi;
    try {
      resultat =
        envoi.canal === "sms"
          ? await expediteurs.sms(envoi.destinataire, envoi.texte)
          : await expediteurs.courriel(envoi.destinataire, {
              sujet: envoi.sujet ?? "",
              texte: envoi.texte,
              html: envoi.html,
            });
    } catch (erreur) {
      resultat = { envoye: false, raison: erreur instanceof Error ? erreur.message : "Erreur inconnue." };
    }

    await depot.terminer(envoi.cle, resultat);
    if (!resultat.envoye) bilan.echecs += 1;
    else if (resultat.mode === "test") bilan.tests += 1;
    else bilan.envoyes += 1;
  }

  return bilan;
}

// Dépôt en mémoire, pour les tests.
export function depotMemoire() {
  const lignes = new Map<string, { statut: string; tentatives: number; envoi: Envoi; erreur?: string }>();
  const depot: Depot = {
    async reserver(envoi) {
      const ligne = lignes.get(envoi.cle);
      if (!ligne) {
        lignes.set(envoi.cle, { statut: "en_cours", tentatives: 1, envoi });
        return true;
      }
      if (ligne.statut === "echec" && ligne.tentatives < TENTATIVES_MAX) {
        ligne.statut = "en_cours";
        ligne.tentatives += 1;
        return true;
      }
      return false;
    },
    async terminer(cle, resultat) {
      const ligne = lignes.get(cle);
      if (!ligne) return;
      if (resultat.envoye) ligne.statut = resultat.mode === "test" ? "test" : "envoye";
      else {
        ligne.statut = "echec";
        ligne.erreur = resultat.raison;
      }
    },
  };
  return { depot, lignes };
}
