import type { SupabaseClient } from "@supabase/supabase-js";
import { TENTATIVES_MAX, type Depot } from "./executer";

// Journal des envois dans la table messages (clé unique).
export function depotSupabase(supabase: SupabaseClient, envoyePar: string | null = null): Depot {
  return {
    async reserver(envoi) {
      const { error } = await supabase.from("messages").insert({
        cle: envoi.cle,
        canal: envoi.canal,
        type: envoi.type,
        destinataire: envoi.destinataire,
        sujet: envoi.sujet,
        contenu: envoi.texte,
        statut: "en_cours",
        entreprise_id: envoi.entreprise_id,
        degustation_id: envoi.degustation_id,
        contact_id: envoi.contact_id,
        envoye_par: envoyePar,
      });
      if (!error) return true;
      if (error.code !== "23505") throw new Error(`Journal des messages : ${error.message}`);

      // Déjà au journal : on retente seulement un échec.
      const { data: ligne } = await supabase
        .from("messages")
        .select("statut, tentatives")
        .eq("cle", envoi.cle)
        .maybeSingle();
      if (!ligne || ligne.statut !== "echec" || ligne.tentatives >= TENTATIVES_MAX) return false;

      const { data: reprise } = await supabase
        .from("messages")
        .update({ statut: "en_cours", tentatives: ligne.tentatives + 1, contenu: envoi.texte, erreur: null })
        .eq("cle", envoi.cle)
        .eq("statut", "echec")
        .eq("tentatives", ligne.tentatives)
        .select("id");
      return (reprise?.length ?? 0) === 1;
    },

    async terminer(cle, resultat) {
      const { error } = await supabase
        .from("messages")
        .update(
          resultat.envoye
            ? { statut: resultat.mode === "test" ? "test" : "envoye", id_externe: resultat.idExterne ?? null, erreur: null }
            : { statut: "echec", erreur: resultat.raison.slice(0, 500) }
        )
        .eq("cle", cle);
      if (error) console.error("Journal des messages :", error.message);
    },
  };
}
